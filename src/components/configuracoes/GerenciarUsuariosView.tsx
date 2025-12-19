"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { sendInviteEmail } from "@/lib/email";
import { UserPlus, Mail, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserInvite {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  store_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by: string;
}

export function GerenciarUsuariosView() {
  const {
    companies,
    stores,
    currentCompanyId,
    currentStoreId,
    profileRole,
    isAdmin,
    isManager,
  } = useStore();

  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    companyId: currentCompanyId || "",
    storeId: currentStoreId || "",
  });

  // Load invites
  useEffect(() => {
    loadInvites();
  }, [currentCompanyId]);

  const loadInvites = async () => {
    try {
      const supabase = supabaseClient();
      let query = supabase
        .from("user_invites")
        .select("*")
        .order("created_at", { ascending: false });

      // Managers só veem convites da sua empresa
      if (!isAdmin && currentCompanyId) {
        query = query.eq("company_id", currentCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvites(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar convites:", err);
      setError(err?.message || "Erro ao carregar convites. Tente novamente.");
      setInvites([]); // Garantir que o estado seja limpo em caso de erro
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = supabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Validar permissões
      if (!isAdmin && !isManager) {
        throw new Error("Você não tem permissão para criar usuários");
      }

      // Managers não podem criar admins ou managers
      if (!isAdmin && (formData.role === "admin" || formData.role === "manager")) {
        throw new Error("Gerentes não podem criar administradores ou gerentes");
      }

      // Validar empresa (managers só podem criar na sua empresa)
      const finalCompanyId = isAdmin ? formData.companyId : currentCompanyId;
      if (!finalCompanyId) {
        throw new Error("Empresa é obrigatória");
      }

      // Gerar token único (64 caracteres alfanuméricos)
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 64; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      let token = generateToken();
      
      // Verificar se o token já existe (improvável, mas por segurança)
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from("user_invites")
          .select("id")
          .eq("token", token)
          .maybeSingle();
        
        if (!existing) break;
        token = generateToken();
        attempts++;
      }

      // Data de expiração (7 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Criar convite
      const { data: invite, error: inviteError } = await supabase
        .from("user_invites")
        .insert({
          email: formData.email,
          invited_by: user.id,
          company_id: finalCompanyId,
          store_id: formData.storeId || null,
          role: formData.role,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Buscar informações do convidador e empresa
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      const { data: company } = await supabase
        .from("orgs")
        .select("name")
        .eq("id", finalCompanyId)
        .single();

      const { data: store } = formData.storeId
        ? await supabase
            .from("stores")
            .select("name")
            .eq("id", formData.storeId)
            .single()
        : { data: null };

      // Enviar email de convite
      await sendInviteEmail({
        email: formData.email,
        token,
        inviterName: inviterProfile?.name || "Administrador",
        companyName: company?.name || "Empresa",
        storeName: store?.name,
        role: formData.role,
      });

      // Criar perfil temporário (será ativado quando o usuário definir senha)
      // O usuário será criado no Supabase Auth quando ativar a conta

      setSuccess("Convite enviado com sucesso!");
      setFormData({
        name: "",
        email: "",
        role: "",
        companyId: currentCompanyId || "",
        storeId: currentStoreId || "",
      });
      setShowForm(false);
      loadInvites();
    } catch (err: any) {
      console.error("Erro ao criar convite:", err);
      setError(err.message || "Erro ao criar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (invite: UserInvite) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = supabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      // Buscar informações
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", invite.invited_by)
        .single();

      const { data: company } = invite.company_id
        ? await supabase
            .from("orgs")
            .select("name")
            .eq("id", invite.company_id)
            .single()
        : { data: null };

      const { data: store } = invite.store_id
        ? await supabase
            .from("stores")
            .select("name")
            .eq("id", invite.store_id)
            .single()
        : { data: null };

      // Reenviar email
      await sendInviteEmail({
        email: invite.email,
        token: invite.id, // Usar ID como token temporário
        inviterName: inviterProfile?.name || "Administrador",
        companyName: company?.name || "Empresa",
        storeName: store?.name,
        role: invite.role,
      });

      setSuccess("Convite reenviado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao reenviar convite:", err);
      setError(err.message || "Erro ao reenviar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este convite?")) return;

    try {
      const supabase = supabaseClient();
      const { error } = await supabase
        .from("user_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      setSuccess("Convite excluído com sucesso!");
      loadInvites();
    } catch (err: any) {
      console.error("Erro ao excluir convite:", err);
      setError(err.message || "Erro ao excluir convite");
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      manager: "Gerente",
      seller: "Vendedor",
      finance: "Financeiro",
      leader: "Líder",
      owner: "Proprietário",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive";
    if (role === "manager") return "default";
    return "secondary";
  };

  const availableRoles = isAdmin
    ? ["admin", "manager", "seller", "finance", "leader", "owner"]
    : ["seller", "finance", "leader"];

  const availableStores = stores.filter(
    (s) => !formData.companyId || s.org_id === formData.companyId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie convites para novos usuários
          </p>
        </div>
        {!showForm && (isAdmin || isManager) && (
          <Button onClick={() => setShowForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Empresa</Label>
                    <Select
                      value={formData.companyId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, companyId: value, storeId: "" })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="storeId">Loja (Opcional)</Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, storeId: value })
                    }
                    disabled={loading || !formData.companyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as lojas</SelectItem>
                      {availableStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Convite"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      name: "",
                      email: "",
                      role: "",
                      companyId: currentCompanyId || "",
                      storeId: currentStoreId || "",
                    });
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Convites Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum convite pendente
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const isUsed = invite.used_at !== null;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                          {getRoleLabel(invite.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isUsed ? (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Usado
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="outline" className="bg-red-50">
                            <XCircle className="w-3 h-3 mr-1" />
                            Expirado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!isUsed && !isExpired && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvite(invite)}
                              disabled={loading}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Reenviar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteInvite(invite.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

