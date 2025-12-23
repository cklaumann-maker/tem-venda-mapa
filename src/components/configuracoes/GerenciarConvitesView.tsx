"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserInvite {
  id: string;
  email: string;
  role: string;
  network_id: string | null;
  company_id: string | null;
  store_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by: string;
  deleted_at: string | null;
  deleted_by: string | null;
  resent_count: number | null;
  last_resent_at: string | null;
  last_resent_by: string | null;
  token: string;
}

export function GerenciarConvitesView() {
  const {
    networks, // Nova: networks
    companies, // Compatibilidade: alias para networks
    stores,
    currentNetworkId, // Nova: network_id
    currentCompanyId, // Compatibilidade: alias para currentNetworkId
    currentStoreId,
    profileRole,
    isAdmin,
    isManager,
  } = useStore();
  
  // Usar networks se disponível, fallback para companies (compatibilidade)
  const availableNetworks = networks.length > 0 ? networks : companies;
  const currentNetwork = currentNetworkId || currentCompanyId;

  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [filteredInvites, setFilteredInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Filtros para admins
  const [filterNetworkId, setFilterNetworkId] = useState<string>("all");
  const [filterStoreId, setFilterStoreId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // all, pending, used, expired
  const [filterRole, setFilterRole] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    networkId: currentNetwork || "", // Nova: network_id
    companyId: currentCompanyId || "", // Compatibilidade
    storeId: currentStoreId || "",
  });

  // Função para aplicar filtros
  const applyFilters = (invitesToFilter: UserInvite[]) => {
    let filtered = [...invitesToFilter];

    // Filtro por rede (apenas para admins)
    if (isAdmin && filterNetworkId !== "all") {
      filtered = filtered.filter(
        (invite) => invite.network_id === filterNetworkId || invite.company_id === filterNetworkId
      );
    }

    // Filtro por loja
    if (filterStoreId !== "all") {
      filtered = filtered.filter((invite) => invite.store_id === filterStoreId);
    }

    // Filtro por status
    if (filterStatus !== "all") {
      filtered = filtered.filter((invite) => {
        const isExpired = new Date(invite.expires_at) < new Date();
        const isUsed = invite.used_at !== null;
        
        if (filterStatus === "pending") return !isUsed && !isExpired;
        if (filterStatus === "used") return isUsed;
        if (filterStatus === "expired") return !isUsed && isExpired;
        return true;
      });
    }

    // Filtro por cargo
    if (filterRole !== "all") {
      filtered = filtered.filter((invite) => invite.role === filterRole);
    }

    // Ordenar por data de criação (mais recentes primeiro)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Descendente (mais recente primeiro)
    });

    setFilteredInvites(filtered);
  };

  // Load invites
  useEffect(() => {
    loadInvites();
  }, [currentNetwork, isAdmin]);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (invites.length > 0) {
      applyFilters(invites);
    }
  }, [filterNetworkId, filterStoreId, filterStatus, filterRole, invites, isAdmin]);

  const loadInvites = async () => {
    setLoadingInvites(true);
    setError("");
    try {
      const supabase = supabaseClient();
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Usuário não autenticado. Faça login novamente.");
      }

      // Verificar perfil diretamente no banco para garantir que está atualizado
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, org_id, network_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
      }

      const userRole = profile?.role;
      const userIsAdmin = userRole === "admin";
      const userNetworkId = profile?.network_id || profile?.org_id; // Priorizar network_id

      console.log("Debug loadInvites:", {
        userId: user.id,
        userEmail: user.email,
        profileRole: userRole,
        isAdmin: userIsAdmin,
        networkId: userNetworkId,
        contextIsAdmin: isAdmin,
        contextProfileRole: profileRole
      });

      let query = supabase
        .from("user_invites")
        .select("*")
        .is("deleted_at", null) // Filtrar apenas convites não deletados (soft delete)
        .order("created_at", { ascending: false });

      // Managers só veem convites da sua rede
      // Usar o role do banco, não do contexto
      if (!userIsAdmin && userNetworkId) {
        // Tentar network_id primeiro, fallback para company_id (compatibilidade)
        query = query.or(`network_id.eq.${userNetworkId},company_id.eq.${userNetworkId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro na query user_invites:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          error: JSON.stringify(error, null, 2)
        });
        throw error;
      }
      
      const invitesData = data || [];
      
      // Verificar se os tokens estão sendo carregados
      if (invitesData.length > 0) {
        const firstInvite = invitesData[0];
        console.log("Debug: Primeiro convite carregado:", {
          id: firstInvite.id,
          email: firstInvite.email,
          hasToken: !!firstInvite.token,
          tokenLength: firstInvite.token?.length || 0,
          tokenPreview: firstInvite.token ? firstInvite.token.substring(0, 20) + '...' : 'N/A'
        });
      }
      
      const invitesWithoutToken = invitesData.filter((inv: any) => !inv.token);
      if (invitesWithoutToken.length > 0) {
        console.warn(`⚠️ ${invitesWithoutToken.length} convite(s) sem token carregado`);
        console.warn("IDs dos convites sem token:", invitesWithoutToken.map((inv: any) => inv.id));
      }
      
      setInvites(invitesData);
      applyFilters(invitesData);
      setError("");
    } catch (err: any) {
      // Log completo do erro para debug
      console.error("Erro ao carregar convites:", {
        error: err,
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        stringified: JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      });
      
      // Mensagem de erro mais detalhada
      let errorMessage = "Erro ao carregar convites. Tente novamente.";
      
      // Verificar código de erro do Supabase
      if (err?.code === "PGRST116" || err?.message?.includes("relation") || err?.message?.includes("does not exist") || err?.details?.includes("relation")) {
        errorMessage = "A tabela 'user_invites' não existe no banco de dados. Execute o script de migração no Supabase.";
      } else if (err?.code === "42501" || err?.code === "PGRST301" || err?.message?.includes("permission denied") || err?.message?.includes("RLS") || err?.hint?.includes("RLS")) {
        errorMessage = "Você não tem permissão para visualizar convites. Verifique se as políticas RLS estão configuradas corretamente no Supabase.";
      } else if (err?.code === "PGRST204") {
        errorMessage = "Nenhum resultado encontrado. Isso é normal se não houver convites ainda.";
        // Não é realmente um erro, apenas não há dados
        setInvites([]);
        setError("");
        return;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (err?.hint) {
        errorMessage = err.hint;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else {
        // Se o erro for um objeto vazio, tentar extrair informações
        const errorStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
        if (errorStr !== "{}") {
          errorMessage = `Erro desconhecido: ${errorStr}`;
        } else {
          errorMessage = "Erro desconhecido ao carregar convites. Verifique o console do navegador para mais detalhes.";
        }
      }
      
      setError(errorMessage);
      setInvites([]); // Garantir que o estado seja limpo em caso de erro
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validação de campos obrigatórios
      if (!formData.name?.trim()) {
        setError("Nome completo é obrigatório");
        setLoading(false);
        return;
      }

      if (!formData.email?.trim()) {
        setError("Email é obrigatório");
        setLoading(false);
        return;
      }

      if (!formData.role) {
        setError("Cargo é obrigatório");
        setLoading(false);
        return;
      }

      if (isAdmin && !formData.networkId && !formData.companyId) {
        setError("Rede é obrigatória");
        setLoading(false);
        return;
      }

      if (!formData.storeId || formData.storeId === "" || formData.storeId === "all") {
        // "all" significa todas as lojas, então store_id será null
        // Isso é válido, então não precisa de erro
      }

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

      // Validar rede (managers só podem criar na sua rede)
      const finalNetworkId = isAdmin ? (formData.networkId || formData.companyId) : currentNetwork;
      if (!finalNetworkId) {
        throw new Error("Rede é obrigatória");
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
          network_id: finalNetworkId, // Nova: network_id
          company_id: finalNetworkId, // Compatibilidade: manter company_id temporariamente
          store_id: formData.storeId && formData.storeId !== "all" ? formData.storeId : null,
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

      // Buscar nome da rede (tentar networks primeiro, fallback para orgs)
      let networkName = "Rede";
      const { data: networkData } = await supabase
        .from("networks")
        .select("name")
        .eq("id", finalNetworkId)
        .maybeSingle();
      
      if (networkData) {
        networkName = networkData.name;
      } else {
        // Fallback para orgs (compatibilidade)
        const { data: orgData } = await supabase
          .from("orgs")
          .select("name")
          .eq("id", finalNetworkId)
          .maybeSingle();
        if (orgData) {
          networkName = orgData.name;
        }
      }

      const { data: store } = formData.storeId
        ? await supabase
            .from("stores")
            .select("name")
            .eq("id", formData.storeId)
            .single()
        : { data: null };

      // Enviar email de convite
      console.log('📧 [GerenciarUsuariosView] Iniciando envio de email de convite...');
      console.log('📧 [GerenciarUsuariosView] Email:', formData.email);
      console.log('📧 [GerenciarUsuariosView] Token:', token.substring(0, 10) + '...');
      
      try {
        await sendInviteEmail({
          email: formData.email,
          token,
          inviterName: inviterProfile?.name || "Administrador",
          companyName: networkName,
          storeName: store?.name,
          role: formData.role,
        });
        console.log('✅ [GerenciarUsuariosView] Email de convite enviado com sucesso');
      } catch (emailError: any) {
        console.error('❌ [GerenciarUsuariosView] Erro ao enviar email:', emailError);
        throw new Error(`Falha ao enviar email: ${emailError.message || 'Erro desconhecido'}. Verifique os logs e a configuração do SMTP.`);
      }

      // Criar perfil temporário (será ativado quando o usuário definir senha)
      // O usuário será criado no Supabase Auth quando ativar a conta

      setSuccess("Convite enviado com sucesso! Se o email não chegar em alguns minutos, verifique a caixa de spam ou use a opção 'Reenviar'.");
      setFormData({
        name: "",
        email: "",
        role: "",
        networkId: currentNetwork || "",
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

      // Buscar nome da rede (tentar networks primeiro, fallback para orgs)
      let networkName = "Rede";
      const networkId = invite.network_id || invite.company_id;
      
      if (networkId) {
        const { data: networkData } = await supabase
          .from("networks")
          .select("name")
          .eq("id", networkId)
          .maybeSingle();
        
        if (networkData) {
          networkName = networkData.name;
        } else {
          // Fallback para orgs (compatibilidade)
          const { data: orgData } = await supabase
            .from("orgs")
            .select("name")
            .eq("id", networkId)
            .maybeSingle();
          if (orgData) {
            networkName = orgData.name;
          }
        }
      }

      const { data: store } = invite.store_id
        ? await supabase
            .from("stores")
            .select("name")
            .eq("id", invite.store_id)
            .single()
        : { data: null };

      // Atualizar contador de reenvios usando função SQL
      const { error: resentError } = await supabase.rpc('resent_user_invite', {
        p_invite_id: invite.id,
        p_performed_by: user.id,
      });

      if (resentError) {
        console.warn("Erro ao atualizar contador de reenvio (continuando...):", resentError);
        // Se a função não existir ainda, atualizar manualmente
        await supabase
          .from("user_invites")
          .update({
            resent_count: (invite.resent_count || 0) + 1,
            last_resent_at: new Date().toISOString(),
            last_resent_by: user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", invite.id);
      }

      // Verificar se o token existe
      console.log('📧 [handleResendInvite] Dados do convite:', {
        id: invite.id,
        email: invite.email,
        hasToken: !!invite.token,
        tokenLength: invite.token?.length || 0
      });

      let tokenToUse = invite.token;
      
      if (!tokenToUse) {
        console.warn('⚠️ [handleResendInvite] Token não encontrado no objeto. Buscando do banco...');
        
        const { data: inviteWithToken, error: fetchError } = await supabase
          .from("user_invites")
          .select("token")
          .eq("id", invite.id)
          .single();
        
        if (fetchError) {
          console.error('❌ [handleResendInvite] Erro ao buscar token:', fetchError);
          throw new Error("Erro ao buscar token do convite: " + fetchError.message);
        }
        
        if (!inviteWithToken?.token) {
          throw new Error("Token do convite não encontrado no banco de dados.");
        }
        
        tokenToUse = inviteWithToken.token;
        console.log('✅ [handleResendInvite] Token recuperado do banco');
      }

      console.log('📧 [handleResendInvite] Reenviando email para:', invite.email);
      console.log('📧 [handleResendInvite] Token:', tokenToUse.substring(0, 20) + '...');

      // Reenviar email
      await sendInviteEmail({
        email: invite.email,
        token: tokenToUse,
        inviterName: inviterProfile?.name || "Administrador",
        companyName: networkName,
        storeName: store?.name,
        role: invite.role,
      });

      console.log('✅ [handleResendInvite] Email reenviado com sucesso');
      setSuccess("Convite reenviado com sucesso! Verifique sua caixa de entrada e spam.");
    } catch (err: any) {
      console.error("Erro ao reenviar convite:", err);
      setError(err.message || "Erro ao reenviar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este convite? O histórico será mantido.")) return;

    try {
      const supabase = supabaseClient();
      
      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("Não foi possível obter informações do usuário");
      }
      
      // Tentar usar função SQL de soft delete
      const { error: softDeleteError } = await supabase.rpc('soft_delete_user_invite', {
        p_invite_id: inviteId,
        p_performed_by: user.id,
      });

      if (softDeleteError) {
        // Se a função não existir ainda, fazer soft delete manualmente
        const { error } = await supabase
          .from("user_invites")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
          })
          .eq("id", inviteId);

        if (error) throw error;
      }

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
    (s) => {
      const selectedNetwork = formData.networkId || formData.companyId;
      return !selectedNetwork || (s.networkId || s.companyId) === selectedNetwork;
    }
  );

  return (
    <TooltipProvider>
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
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="role">Cargo <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                    required
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
                    <Label htmlFor="networkId">Rede <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.networkId || formData.companyId || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, networkId: value, companyId: value, storeId: "all" })
                      }
                      required
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a rede" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNetworks.map((network) => (
                          <SelectItem key={network.id} value={network.id}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="storeId">Loja <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.storeId || "all"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, storeId: value === "all" ? "all" : value })
                    }
                    required
                    disabled={loading || !(formData.networkId || formData.companyId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as lojas</SelectItem>
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
                      networkId: currentNetwork || "",
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
          <CardTitle>Convites Enviados</CardTitle>
          <CardDescription>
            {isAdmin 
              ? "Visualize e gerencie todos os convites enviados. Os mais recentes aparecem primeiro."
              : "Visualize os convites da sua rede. Os mais recentes aparecem primeiro."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros para admins */}
          {isAdmin && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold mb-3">Filtros</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-network">Rede</Label>
                  <Select value={filterNetworkId} onValueChange={setFilterNetworkId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as redes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as redes</SelectItem>
                      {networks.map((network) => (
                        <SelectItem key={network.id} value={network.id}>
                          {network.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-store">Loja</Label>
                  <Select 
                    value={filterStoreId} 
                    onValueChange={setFilterStoreId}
                    disabled={filterNetworkId === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as lojas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as lojas</SelectItem>
                      {stores
                        .filter((store) => 
                          filterNetworkId === "all" || 
                          store.networkId === filterNetworkId || 
                          store.companyId === filterNetworkId
                        )
                        .map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="used">Usados</SelectItem>
                      <SelectItem value="expired">Expirados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-role">Cargo</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os cargos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      <SelectItem value="finance">Financeiro</SelectItem>
                      <SelectItem value="leader">Líder</SelectItem>
                      <SelectItem value="owner">Proprietário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Total: {invites.length} convites</span>
                <span>•</span>
                <span>Filtrados: {filteredInvites.length} convites</span>
              </div>
            </div>
          )}

          {loadingInvites ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Carregando convites...</p>
            </div>
          ) : (isAdmin ? filteredInvites : invites).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isAdmin && (filterNetworkId !== "all" || filterStoreId !== "all" || filterStatus !== "all" || filterRole !== "all")
                ? "Nenhum convite encontrado com os filtros selecionados"
                : "Nenhum convite encontrado"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  {isAdmin && <TableHead>Rede</TableHead>}
                  {isAdmin && <TableHead>Loja</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isAdmin ? filteredInvites : invites).map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const isUsed = invite.used_at !== null;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                          {getRoleLabel(invite.role)}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {(() => {
                            const network = networks.find(
                              (n) => n.id === invite.network_id || n.id === invite.company_id
                            );
                            return network ? network.name : "-";
                          })()}
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell>
                          {(() => {
                            // Se store_id é null, significa "Todas as lojas"
                            if (!invite.store_id) {
                              return "Todas as lojas";
                            }
                            const store = stores.find((s) => s.id === invite.store_id);
                            return store ? store.name : "-";
                          })()}
                        </TableCell>
                      )}
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!isUsed && !isExpired && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResendInvite(invite)}
                                  disabled={loading}
                                  aria-label="Reenviar convite"
                                >
                                  <Mail className="w-3 h-3 mr-1" />
                                  Reenviar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reenviar email de convite para {invite.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteInvite(invite.id)}
                                disabled={loading}
                                aria-label="Excluir convite"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir convite permanentemente</p>
                            </TooltipContent>
                          </Tooltip>
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
    </TooltipProvider>
  );
}

