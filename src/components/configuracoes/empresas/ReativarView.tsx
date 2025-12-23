"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type EntityType = "network" | "store";

type Network = {
  id: string;
  name: string;
  deactivated_at: string | null;
};

type Store = {
  id: string;
  name: string;
  deactivated_at: string | null;
};

export function ReativarView() {
  const { refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [entityType, setEntityType] = useState<EntityType>("network");
  const [networks, setNetworks] = useState<Network[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    setFeedback(null); // Limpar feedback ao mudar o tipo de entidade
    loadInactiveEntities();
  }, [entityType]);

  useEffect(() => {
    const entities = entityType === "network" ? networks : stores;
    if (entities.length > 0 && !entities.find(e => e.id === selectedId)) {
      setSelectedId(entities[0].id);
    } else if (entities.length === 0) {
      setSelectedId("");
    }
  }, [entityType, networks, stores, selectedId]);

  const loadInactiveEntities = async (preserveFeedback = false) => {
    try {
      setLoading(true);
      if (entityType === "network") {
        const { data, error } = await supabase
          .from("networks")
          .select("id, name, deactivated_at")
          .eq("is_active", false)
          .order("name", { ascending: true });

        if (error) throw error;
        setNetworks(data || []);
        if (data && data.length > 0) {
          setSelectedId(data[0].id);
        } else {
          setSelectedId("");
        }
      } else {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, deactivated_at")
          .eq("is_active", false)
          .order("name", { ascending: true });

        if (error) throw error;
        setStores(data || []);
        if (data && data.length > 0) {
          setSelectedId(data[0].id);
        } else {
          setSelectedId("");
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar entidades desativadas:", error);
      if (!preserveFeedback) {
        setFeedback({ type: "error", message: `Erro ao carregar ${entityType === "network" ? "redes" : "lojas"} desativadas.` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!selectedId) {
      setFeedback({ 
        type: "error", 
        message: `Selecione ${entityType === "network" ? "a rede" : "a loja"} que deseja reativar.` 
      });
      return;
    }

    try {
      setProcessing(true);
      setFeedback(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const endpoint = entityType === "network" 
        ? '/api/networks/reactivate'
        : '/api/stores/reactivate';
      
      const bodyKey = entityType === "network" 
        ? 'networkId'
        : 'storeId';

      // Reativar usando a API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          [bodyKey]: selectedId,
          notes: `Reativado via interface de administração`,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Erro ao reativar ${entityType === "network" ? "rede" : "loja"}`);
      }

      // Guardar nome antes de recarregar
      const entities = entityType === "network" ? networks : stores;
      const entityName = entities.find(e => e.id === selectedId)?.name || (entityType === "network" ? "a rede" : "a loja");
      
      // Definir feedback de sucesso ANTES de recarregar
      setFeedback({ 
        type: "success", 
        message: `${entityType === "network" ? "Rede" : "Loja"} "${entityName}" reativada com sucesso!` 
      });
      
      await refresh();
      // Preservar feedback ao recarregar a lista
      await loadInactiveEntities(true);
    } catch (error: any) {
      console.error(error);
      setFeedback({ 
        type: "error", 
        message: error.message || `Erro ao reativar ${entityType === "network" ? "a rede" : "a loja"}. Tente novamente.` 
      });
    } finally {
      setProcessing(false);
    }
  };

  const availableEntities = entityType === "network" ? networks : stores;

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
            <CardTitle className="flex items-center gap-2 text-gray-900 text-emerald-600">
              <RotateCcw className="w-5 h-5" />
              Reativar Rede ou Loja
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Reative uma rede ou loja que foi desativada anteriormente. Ela voltará a aparecer na lista de entidades ativas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Entidade</Label>
              <Select value={entityType} onValueChange={(value) => setEntityType(value as EntityType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Rede</SelectItem>
                  <SelectItem value="store">Loja (Empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando {entityType === "network" ? "redes" : "lojas"} desativadas...</div>
            ) : availableEntities.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <p className="text-sm font-medium">Nenhuma {entityType === "network" ? "rede" : "loja"} desativada encontrada.</p>
                <p className="text-xs mt-1 opacity-80">Todas as {entityType === "network" ? "redes" : "lojas"} estão ativas no momento.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{entityType === "network" ? "Rede Desativada" : "Loja Desativada"}</Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecione ${entityType === "network" ? "a rede" : "a loja"} para reativar`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                          {entity.deactivated_at && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (desativada em {new Date(entity.deactivated_at).toLocaleDateString('pt-BR')})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleReactivate} 
                    disabled={processing || !selectedId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                  >
                    {processing ? "Reativando..." : "Reativar"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={loadInactiveEntities}
                    disabled={processing || loading}
                  >
                    Atualizar Lista
                  </Button>
                </div>
              </>
            )}

            {feedback && (
              <div
                className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                  feedback.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{feedback.message}</p>
                  {feedback.type === "success" && (
                    <p className="text-sm mt-1 opacity-80">
                      {entityType === "network" ? "A rede voltou a aparecer na lista de redes ativas." : "A loja voltou a aparecer na lista de lojas ativas."}
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

