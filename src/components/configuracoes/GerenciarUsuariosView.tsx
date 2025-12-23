"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit2, Trash2, Power, PowerOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  network_id: string | null;
  org_id: string | null;
  default_store_id: string | null;
  is_active: boolean;
  deleted_at: string | null;
  network_name?: string;
  store_name?: string;
}

export function GerenciarUsuariosView() {
  const {
    networks,
    companies,
    stores,
    currentNetworkId,
    currentCompanyId,
    profileRole,
    isAdmin,
    isManager,
  } = useStore();

  const availableNetworks = networks.length > 0 ? networks : companies;
  const currentNetwork = currentNetworkId || currentCompanyId;

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Filtros
  const [filterNetworkId, setFilterNetworkId] = useState<string>("all");
  const [filterStoreId, setFilterStoreId] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active"); // active, inactive, deleted

  // Dialog de edição
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    role: "",
    network_id: "",
    store_id: "",
  });

  useEffect(() => {
    loadUsers();
  }, [currentNetwork, isAdmin]);

  useEffect(() => {
    if (users.length > 0) {
      applyFilters(users);
    }
  }, [filterNetworkId, filterStoreId, filterRole, filterStatus, users, isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = supabaseClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, network_id, org_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const userRole = profile?.role;
      const userIsAdmin = userRole === "admin";
      const userNetworkId = profile?.network_id || profile?.org_id;

      let query = supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role,
          network_id,
          org_id,
          default_store_id,
          is_active,
          deleted_at
        `);

      if (!userIsAdmin && userNetworkId) {
        query = query.or(`network_id.eq.${userNetworkId},org_id.eq.${userNetworkId}`);
      }

      const { data, error } = await query.order("full_name", { ascending: true });

      if (error) throw error;

      const usersData = (data || []).map((u: any) => {
        const networkId = u.network_id || u.org_id;
        const network = availableNetworks.find((n) => n.id === networkId);
        const store = stores.find((s) => s.id === u.default_store_id);

        return {
          ...u,
          email: "", // Será preenchido depois
          network_name: network?.name || null,
          store_name: store?.name || null,
        };
      });

      // Buscar emails dos usuários do auth.users
      const userIds = usersData.map((u: any) => u.id);
      if (userIds.length > 0) {
        try {
          // Obter token de autenticação
          const supabase = supabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Usar API route para buscar emails
          const response = await fetch('/api/users/get-emails', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userIds }),
          });

          if (response.ok) {
            const result = await response.json();
            const emails = result.emails || {};
            
            // emails é um objeto Record<string, string> onde a chave é o userId e o valor é o email
            usersData.forEach((u: any) => {
              u.email = emails[u.id] || "Email não encontrado";
            });
          } else {
            // Se a API falhar, definir emails como "Erro ao carregar"
            const errorText = await response.text().catch(() => 'Erro desconhecido');
            console.warn('Erro ao buscar emails:', response.status, response.statusText, errorText);
            usersData.forEach((u: any) => {
              if (!u.email || u.email === "") {
                u.email = "Erro ao carregar email";
              }
            });
          }
        } catch (err) {
          console.error('Erro ao buscar emails:', err);
          // Em caso de erro, definir emails como "Erro ao carregar"
          usersData.forEach((u: any) => {
            if (!u.email || u.email === "") {
              u.email = "Erro ao carregar email";
            }
          });
        }
      } else {
        // Se não houver userIds, garantir que todos tenham um email padrão
        usersData.forEach((u: any) => {
          if (!u.email || u.email === "") {
            u.email = "Email não disponível";
          }
        });
      }

      setUsers(usersData);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
      setError(err.message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (usersToFilter: User[]) => {
    let filtered = [...usersToFilter];

    if (filterStatus === "active") {
      filtered = filtered.filter((u) => u.is_active && !u.deleted_at);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((u) => !u.is_active && !u.deleted_at);
    } else if (filterStatus === "deleted") {
      filtered = filtered.filter((u) => u.deleted_at);
    }

    if (isAdmin && filterNetworkId !== "all") {
      filtered = filtered.filter(
        (u) => u.network_id === filterNetworkId || u.org_id === filterNetworkId
      );
    }

    if (filterStoreId !== "all") {
      filtered = filtered.filter((u) => u.default_store_id === filterStoreId);
    }

    if (filterRole !== "all") {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    // Se default_store_id for null e o usuário tiver network_id, é "todas as lojas"
    const hasNetwork = !!(user.network_id || user.org_id);
    const hasNoStore = !user.default_store_id;
    const storeId = hasNetwork && hasNoStore ? "all_stores" : (user.default_store_id || "none");
    
    setEditFormData({
      full_name: user.full_name || "",
      role: user.role,
      network_id: user.network_id || user.org_id || "",
      store_id: storeId,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const updateData: any = {
        userId: editingUser.id,
        full_name: editFormData.full_name,
        role: editFormData.role,
      };

      if (isAdmin) {
        if (editFormData.network_id) {
          updateData.network_id = editFormData.network_id;
        }
        // "all_stores" significa que o usuário tem acesso a todas as lojas da rede
        // Neste caso, salvamos como null no default_store_id
        if (editFormData.store_id === "none" || !editFormData.store_id || editFormData.store_id === "") {
          updateData.store_id = null;
        } else if (editFormData.store_id === "all_stores") {
          // "Todas as lojas" - salvar como null para indicar acesso a todas as lojas da rede
          updateData.store_id = null;
          // Nota: Podemos adicionar um campo específico no futuro para indicar "todas as lojas"
        } else {
          updateData.store_id = editFormData.store_id;
        }
      }

      // Obter token de autenticação
      const supabase = supabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar usuário");
      }

      setSuccess("Usuário atualizado com sucesso!");
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error("Erro ao atualizar usuário:", err);
      setError(err.message || "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!confirm(`Tem certeza que deseja ${user.is_active ? "desativar" : "reativar"} este usuário?`)) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Obter token de autenticação
      const supabase = supabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao alterar status do usuário");
      }

      setSuccess(`Usuário ${user.is_active ? "desativado" : "reativado"} com sucesso!`);
      loadUsers();
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      setError(err.message || "Erro ao alterar status do usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Obter token de autenticação
      const supabase = supabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir usuário");
      }

      setSuccess("Usuário excluído com sucesso!");
      loadUsers();
    } catch (err: any) {
      console.error("Erro ao excluir usuário:", err);
      setError(err.message || "Erro ao excluir usuário");
    } finally {
      setLoading(false);
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

  // Filtrar lojas baseado na rede selecionada no formulário de edição
  const filteredStores = useMemo(() => {
    const selectedNetwork = editFormData.network_id;
    
    // Se não houver rede selecionada no formulário, mostrar todas as lojas
    if (!selectedNetwork || selectedNetwork === "" || selectedNetwork === "all") {
      return stores;
    }
    
    // Filtrar por networkId ou companyId (compatibilidade)
    const filtered = stores.filter((s) => {
      const matchesNetworkId = s.networkId === selectedNetwork;
      const matchesCompanyId = s.companyId === selectedNetwork;
      return matchesNetworkId || matchesCompanyId;
    });
    
    // Log para debug
    if (selectedNetwork) {
      console.log('🔍 Filtro de lojas:', {
        selectedNetwork,
        totalStores: stores.length,
        filteredCount: filtered.length,
        stores: stores.map(s => ({
          id: s.id,
          name: s.name,
          networkId: s.networkId,
          companyId: s.companyId
        })),
        filtered: filtered.map(s => ({
          id: s.id,
          name: s.name,
          networkId: s.networkId,
          companyId: s.companyId
        }))
      });
    }
    
    return filtered;
  }, [editFormData.network_id, stores]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize e gerencie todos os usuários do sistema
        </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Rede</Label>
                <Select value={filterNetworkId} onValueChange={setFilterNetworkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as redes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as redes</SelectItem>
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
              <Label>Loja</Label>
              <Select value={filterStoreId} onValueChange={setFilterStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cargo</Label>
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

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="deleted">Excluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Total: {users.length} usuários</span>
            <span>•</span>
            <span>Filtrados: {filteredUsers.length} usuários</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum usuário encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  {isAdmin && <TableHead>Rede</TableHead>}
                  <TableHead>Loja Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "Sem nome"}
                    </TableCell>
                    <TableCell>
                      {user.email && user.email !== "" ? (
                        user.email
                      ) : (
                        <span className="text-muted-foreground italic">Carregando email...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "destructive" : "default"}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>{user.network_name || "-"}</TableCell>
                    )}
                    <TableCell>
                      {user.default_store_id 
                        ? user.store_name || "Nenhuma"
                        : (user.network_id || user.org_id)
                          ? "Todas as lojas da rede"
                          : "Nenhuma"
                      }
                    </TableCell>
                    <TableCell>
                      {user.deleted_at ? (
                        <Badge variant="outline" className="bg-red-50">
                          <XCircle className="w-3 h-3 mr-1" />
                          Excluído
                        </Badge>
                      ) : user.is_active ? (
                        <Badge variant="outline" className="bg-green-50">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(user)}
                              aria-label="Editar usuário"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar informações do usuário</p>
                          </TooltipContent>
                        </Tooltip>

                        {!user.deleted_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActive(user)}
                                disabled={loading}
                                aria-label={user.is_active ? "Desativar usuário" : "Ativar usuário"}
                              >
                                {user.is_active ? (
                                  <PowerOff className="w-3 h-3 text-yellow-600" />
                                ) : (
                                  <Power className="w-3 h-3 text-green-600" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.is_active ? "Desativar usuário" : "Ativar usuário"}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user)}
                              disabled={loading || !!user.deleted_at}
                              aria-label="Excluir usuário"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.deleted_at ? "Usuário já excluído" : "Excluir usuário permanentemente"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin ? (
                      <>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="seller">Vendedor</SelectItem>
                        <SelectItem value="finance">Financeiro</SelectItem>
                        <SelectItem value="leader">Líder</SelectItem>
                        <SelectItem value="owner">Proprietário</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="seller">Vendedor</SelectItem>
                        <SelectItem value="finance">Financeiro</SelectItem>
                        <SelectItem value="leader">Líder</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label>Rede</Label>
                    <Select
                      value={editFormData.network_id || ""}
                      onValueChange={(value) => {
                        // Quando a rede muda, resetar a loja padrão para "none"
                        setEditFormData({ 
                          ...editFormData, 
                          network_id: value || "",
                          store_id: "none" // Resetar loja quando rede muda
                        });
                      }}
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
                    {editFormData.network_id && (
                      <p className="text-xs text-muted-foreground">
                        {filteredStores.length} loja(s) encontrada(s) para esta rede
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Loja Padrão</Label>
                    <Select
                      value={editFormData.store_id || "none"}
                      onValueChange={(value) => {
                        if (value === "all_stores") {
                          // "Todas as lojas" - salvar como null para indicar acesso a todas
                          setEditFormData({ ...editFormData, store_id: "all_stores" });
                        } else if (value === "none") {
                          setEditFormData({ ...editFormData, store_id: "" });
                        } else {
                          setEditFormData({ ...editFormData, store_id: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {editFormData.network_id && (
                          <SelectItem value="all_stores">Todas as lojas da rede</SelectItem>
                        )}
                        {filteredStores.length > 0 ? (
                          filteredStores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {editFormData.network_id ? "Nenhuma loja encontrada para esta rede" : "Selecione uma rede primeiro"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={loading}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </TooltipProvider>
  );
}
