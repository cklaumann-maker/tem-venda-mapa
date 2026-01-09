"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, Power, ArrowLeft, Building2, Store } from "lucide-react";
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

export function DesativarView() {
  const { networks: contextNetworks, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const networks = contextNetworks || [];

  // Estados para desativar rede
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("");
  const [processingNetwork, setProcessingNetwork] = useState(false);
  const [networkFeedback, setNetworkFeedback] = useState<FeedbackState>(null);

  // Estados para desativar loja
  const [selectedStoreNetworkId, setSelectedStoreNetworkId] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(false);
  const [processingStore, setProcessingStore] = useState(false);
  const [storeFeedback, setStoreFeedback] = useState<FeedbackState>(null);

  // Inicializar com primeira rede
  useEffect(() => {
    if (networks.length > 0) {
      if (!selectedNetworkId) {
        setSelectedNetworkId(networks[0].id);
      }
      if (!selectedStoreNetworkId) {
        setSelectedStoreNetworkId(networks[0].id);
      }
    }
  }, [networks, selectedNetworkId, selectedStoreNetworkId]);

  // Carregar lojas quando rede for selecionada
  useEffect(() => {
    if (selectedStoreNetworkId) {
      loadStores(selectedStoreNetworkId);
    }
  }, [selectedStoreNetworkId]);

  // Selecionar primeira loja quando lojas forem carregadas
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    } else if (stores.length === 0) {
      setSelectedStoreId("");
    } else if (selectedStoreId && !stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(stores[0]?.id ?? "");
    }
  }, [stores, selectedStoreId]);

  const loadStores = useCallback(async (networkId: string) => {
    try {
      setLoadingStores(true);
      setStoreFeedback(null);
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
      setStoreFeedback({ type: "error", message: "Erro ao carregar lojas da rede." });
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, [supabase]);

  const handleDeactivateNetwork = async () => {
    if (!selectedNetworkId) {
      setNetworkFeedback({ type: "error", message: "Selecione uma rede para desativar." });
      return;
    }

    try {
      setProcessingNetwork(true);
      setNetworkFeedback(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Verificar usuários afetados
      const affectedResponse = await fetch(`/api/networks/affected-users?networkId=${selectedNetworkId}`, {
        method: 'GET',
        headers,
      });

      if (!affectedResponse.ok) {
        let errorMessage = "Erro ao verificar usuários afetados";
        try {
          const errorData = await affectedResponse.json();
          errorMessage = errorData.error || errorData.details?.message || errorData.details || errorMessage;
        } catch (parseError) {
          errorMessage = `Erro ${affectedResponse.status}: ${affectedResponse.statusText || errorMessage}`;
        }
        throw new Error(errorMessage);
      }

      const affectedData = await affectedResponse.json();
      const affectedCount = affectedData.totalCount || 0;

      const confirmMessage = affectedCount > 0
        ? `Tem certeza que deseja desativar esta rede?\n\nATENÇÃO: Esta ação irá desativar TODAS as lojas desta rede.\n\n${affectedCount} usuário(s) serão afetados.\n\nEstratégia: Usuários serão desativados (não há outra rede para migração).`
        : `Tem certeza que deseja desativar esta rede?\n\nATENÇÃO: Esta ação irá desativar TODAS as lojas desta rede.`;

      if (!window.confirm(confirmMessage)) {
        setProcessingNetwork(false);
        return;
      }

      // Desativar rede
      const response = await fetch('/api/networks/deactivate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          networkId: selectedNetworkId,
          migrationStrategy: 'auto_migrate',
          notes: `Desativado via interface de administração`,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Erro ao desativar a rede";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details?.message || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Erro ${response.status}: ${response.statusText || errorMessage}`;
        }
        throw new Error(errorMessage);
      }

      const networkName = networks.find(n => n.id === selectedNetworkId)?.name || "a rede";
      const successMessage = affectedCount > 0
        ? `Rede "${networkName}" desativada com sucesso. Todas as lojas da rede foram desativadas. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
        : `Rede "${networkName}" desativada com sucesso. Todas as lojas da rede foram desativadas.`;
      
      // Exibir feedback antes do refresh
      setNetworkFeedback({ type: "success", message: successMessage });
      
      // Scroll para o topo para garantir visibilidade do feedback
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Atualizar dados após um pequeno delay para garantir que o feedback seja visto
      setTimeout(async () => {
        await refresh();
        
        // Selecionar próxima rede disponível
        const remainingNetworks = networks.filter(n => n.id !== selectedNetworkId);
        if (remainingNetworks.length > 0) {
          setSelectedNetworkId(remainingNetworks[0].id);
        } else {
          setSelectedNetworkId("");
        }
      }, 500);
    } catch (error: any) {
      console.error(error);
      setNetworkFeedback({ 
        type: "error", 
        message: error.message || "Erro ao desativar a rede. Tente novamente." 
      });
    } finally {
      setProcessingNetwork(false);
    }
  };

  const handleDeactivateStore = async () => {
    if (!selectedStoreId || !selectedStoreNetworkId) {
      setStoreFeedback({ type: "error", message: "Selecione uma rede e uma loja para desativar." });
      return;
    }

    try {
      setProcessingStore(true);
      setStoreFeedback(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Verificar usuários afetados
      const affectedResponse = await fetch(`/api/stores/affected-users?storeId=${selectedStoreId}`, {
        method: 'GET',
        headers,
      });

      if (!affectedResponse.ok) {
        throw new Error("Erro ao verificar usuários afetados");
      }

      const affectedData = await affectedResponse.json();
      const affectedCount = affectedData.totalCount || 0;

      const confirmMessage = affectedCount > 0
        ? `Tem certeza que deseja desativar esta loja?\n\n${affectedCount} usuário(s) serão afetados.\n\nEstratégia: Migração automática (usuários serão migrados para outra loja da mesma rede, se disponível, ou desativados).`
        : "Tem certeza que deseja desativar esta loja?";

      if (!window.confirm(confirmMessage)) {
        setProcessingStore(false);
        return;
      }

      // Desativar loja
      const response = await fetch('/api/stores/deactivate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storeId: selectedStoreId,
          migrationStrategy: 'auto_migrate',
          notes: `Desativado via interface de administração`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao desativar a loja");
      }

      const storeName = stores.find(s => s.id === selectedStoreId)?.name || "a loja";
      const successMessage = affectedCount > 0
        ? `Loja "${storeName}" desativada com sucesso. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
        : `Loja "${storeName}" desativada com sucesso.`;
      
      // Exibir feedback antes do refresh
      setStoreFeedback({ type: "success", message: successMessage });
      
      // Scroll para o topo para garantir visibilidade do feedback
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Atualizar dados após um pequeno delay para garantir que o feedback seja visto
      setTimeout(async () => {
        await refresh();
        
        // Recarregar lojas da rede após desativar
        await loadStores(selectedStoreNetworkId);
      }, 500);
    } catch (error: any) {
      console.error(error);
      setStoreFeedback({ 
        type: "error", 
        message: error.message || "Erro ao desativar a loja. Tente novamente." 
      });
    } finally {
      setProcessingStore(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/configuracoes/empresas")}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 text-rose-600">
          <Power className="w-6 h-6" />
          Desativar Rede ou Loja
        </h1>
      </div>

      {/* Aviso Geral */}
      <Card className="border-rose-200 bg-rose-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-rose-800">
              <p className="font-semibold mb-1">ATENÇÃO:</p>
              <p>
                Ao desativar uma rede, TODAS as lojas dessa rede serão desativadas automaticamente.
                Os usuários associados serão tratados conforme a estratégia de migração.
                Os dados históricos não serão excluídos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duas seções lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção: Desativar Rede */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-rose-600" />
              Desativar Rede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione a rede</Label>
              <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma rede" />
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

            <Button 
              variant="destructive" 
              onClick={handleDeactivateNetwork}
              disabled={processingNetwork || !selectedNetworkId}
              className="w-full"
            >
              {processingNetwork ? "Desativando rede..." : "Desativar Rede"}
            </Button>

            {networkFeedback && (
              <div
                className={`p-4 rounded-lg border-2 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  networkFeedback.type === "success" 
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm" 
                    : "bg-rose-50 border-rose-300 text-rose-900 shadow-sm"
                }`}
              >
                {networkFeedback.type === "success" ? (
                  <CheckCircle2 className="w-6 h-6 mt-0.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-rose-600" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-base leading-relaxed">{networkFeedback.message}</p>
                  {networkFeedback.type === "success" && (
                    <p className="text-sm text-emerald-700 mt-2 opacity-90">
                      A rede foi removida da lista de redes ativas. Os dados históricos foram preservados.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção: Desativar Loja */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-rose-600" />
              Desativar Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4" />
                  Rede
                </Label>
                <Select 
                  value={selectedStoreNetworkId} 
                  onValueChange={setSelectedStoreNetworkId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rede" />
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

              <div className="space-y-2">
                <Label className="text-sm">Loja</Label>
                <Select 
                  value={selectedStoreId} 
                  onValueChange={setSelectedStoreId}
                  disabled={!selectedStoreNetworkId || loadingStores || stores.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !selectedStoreNetworkId
                          ? "Selecione a rede"
                          : loadingStores
                          ? "Carregando..."
                          : stores.length === 0
                          ? "Sem lojas"
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

            <Button 
              variant="destructive" 
              onClick={handleDeactivateStore}
              disabled={processingStore || !selectedStoreId || !selectedStoreNetworkId}
              className="w-full"
            >
              {processingStore ? "Desativando loja..." : "Desativar Loja"}
            </Button>

            {storeFeedback && (
              <div
                className={`p-4 rounded-lg border-2 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  storeFeedback.type === "success" 
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm" 
                    : "bg-rose-50 border-rose-300 text-rose-900 shadow-sm"
                }`}
              >
                {storeFeedback.type === "success" ? (
                  <CheckCircle2 className="w-6 h-6 mt-0.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-rose-600" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-base leading-relaxed">{storeFeedback.message}</p>
                  {storeFeedback.type === "success" && (
                    <p className="text-sm text-emerald-700 mt-2 opacity-90">
                      A loja foi removida da lista de lojas ativas. Os dados históricos foram preservados.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
