"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, Power, ArrowLeft, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type Network = {
  id: string;
  name: string;
};

type Store = {
  id: string;
  name: string;
  network_id: string | null;
};

export function DesativarLojaView() {
  const { refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(true);
  const [loadingStores, setLoadingStores] = useState(false);
  const [deactivateStoreId, setDeactivateStoreId] = useState<string>("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateFeedback, setDeactivateFeedback] = useState<FeedbackState>(null);

  // Carregar redes ao montar o componente
  useEffect(() => {
    loadNetworks();
  }, []);

  // Carregar lojas quando uma rede for selecionada
  useEffect(() => {
    if (selectedNetworkId) {
      loadStores(selectedNetworkId);
    } else {
      setStores([]);
      setDeactivateStoreId("");
    }
  }, [selectedNetworkId]);

  // Selecionar primeira loja quando lojas forem carregadas
  useEffect(() => {
    if (stores.length > 0 && !deactivateStoreId) {
      setDeactivateStoreId(stores[0].id);
    } else if (stores.length === 0) {
      setDeactivateStoreId("");
    } else if (deactivateStoreId && !stores.some((store) => store.id === deactivateStoreId)) {
      setDeactivateStoreId(stores[0]?.id ?? "");
    }
  }, [stores, deactivateStoreId]);

  const loadNetworks = async () => {
    try {
      setLoadingNetworks(true);
      const { data, error } = await supabase
        .from("networks")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setNetworks(data || []);
      if (data && data.length > 0) {
        setSelectedNetworkId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar redes:", error);
      setDeactivateFeedback({ type: "error", message: "Erro ao carregar redes." });
    } finally {
      setLoadingNetworks(false);
    }
  };

  const loadStores = async (networkId: string) => {
    try {
      setLoadingStores(true);
      setDeactivateFeedback(null);
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, network_id")
        .eq("is_active", true)
        .eq("network_id", networkId)
        .order("name", { ascending: true });

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar lojas:", error);
      setDeactivateFeedback({ type: "error", message: "Erro ao carregar lojas da rede." });
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleDeactivateStore = async () => {
    if (!deactivateStoreId) {
      setDeactivateFeedback({ type: "error", message: "Selecione a empresa que deseja desativar." });
      return;
    }

    // Verificar usuários afetados antes de desativar
    try {
      setDeactivating(true);
      setDeactivateFeedback(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Verificar usuários afetados
      const affectedResponse = await fetch(`/api/stores/affected-users?storeId=${deactivateStoreId}`, {
        method: 'GET',
        headers,
      });

      if (!affectedResponse.ok) {
        throw new Error("Erro ao verificar usuários afetados");
      }

      const affectedData = await affectedResponse.json();
      const affectedCount = affectedData.totalCount || 0;

      // Confirmar com informações sobre usuários afetados
      const confirmMessage = affectedCount > 0
        ? `Tem certeza que deseja desativar esta empresa?\n\n${affectedCount} usuário(s) serão afetados.\n\nEstratégia: Migração automática (usuários serão migrados para outra loja da mesma rede, se disponível, ou desativados).`
        : "Tem certeza que deseja desativar esta empresa?";

      if (!window.confirm(confirmMessage)) {
        setDeactivating(false);
        return;
      }

      // Desativar usando a nova API
      const response = await fetch('/api/stores/deactivate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storeId: deactivateStoreId,
          migrationStrategy: 'auto_migrate', // Migração automática
          notes: `Desativado via interface de administração`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao desativar a empresa");
      }

      const result = await response.json();
      await refresh();
      
      // Recarregar lojas da rede após desativar
      if (selectedNetworkId) {
        await loadStores(selectedNetworkId);
      }
      
      const successMessage = affectedCount > 0
        ? `Loja desativada com sucesso. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
        : "Loja desativada com sucesso.";
      
      setDeactivateFeedback({ type: "success", message: successMessage });
      
      // Limpar feedback após 5 segundos
      setTimeout(() => {
        setDeactivateFeedback(null);
      }, 5000);
    } catch (error: any) {
      console.error(error);
      setDeactivateFeedback({ 
        type: "error", 
        message: error.message || "Erro ao desativar a empresa. Tente novamente." 
      });
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/configuracoes/empresas")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2 text-gray-900 text-rose-600">
              <Power className="w-5 h-5" />
              Desativar Empresa (Loja)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Ao desativar, a empresa deixa de aparecer na lista ativa e os usuários associados são tratados conforme a estratégia de migração.
              Os dados históricos não serão excluídos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[240px_1fr] items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Rede
                </Label>
                <Select 
                  value={selectedNetworkId} 
                  onValueChange={setSelectedNetworkId}
                  disabled={loadingNetworks}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingNetworks ? "Carregando redes..." : "Selecione a rede"} />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.id} value={network.id}>
                        {network.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[240px_1fr] items-end">
              <div className="space-y-2">
                <Label>Loja</Label>
                <Select 
                  value={deactivateStoreId} 
                  onValueChange={setDeactivateStoreId}
                  disabled={!selectedNetworkId || loadingStores || stores.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !selectedNetworkId 
                          ? "Selecione uma rede primeiro" 
                          : loadingStores 
                          ? "Carregando lojas..." 
                          : stores.length === 0
                          ? "Nenhuma loja disponível"
                          : "Selecione a loja"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="destructive" 
                onClick={handleDeactivateStore} 
                disabled={deactivating || !deactivateStoreId || !selectedNetworkId} 
                className="min-w-[140px]"
              >
                {deactivating ? "Desativando..." : "Desativar loja"}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  if (selectedNetworkId) {
                    loadStores(selectedNetworkId);
                  } else {
                    loadNetworks();
                  }
                }}
                disabled={loadingNetworks || loadingStores}
              >
                {selectedNetworkId ? "Atualizar Lojas" : "Atualizar Redes"}
              </Button>
            </div>

            {deactivateFeedback && (
              <div
                className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                  deactivateFeedback.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {deactivateFeedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{deactivateFeedback.message}</p>
                  {deactivateFeedback.type === "success" && (
                    <p className="text-sm mt-1 opacity-80">
                      A loja foi removida da lista de lojas ativas. Os dados históricos foram preservados.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

