"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, Power, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type EntityType = "network" | "store";

export function DesativarView() {
  const { stores, networks, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [entityType, setEntityType] = useState<EntityType>("network");
  const [selectedId, setSelectedId] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (entityType === "network" && networks.length > 0) {
      setSelectedId(networks[0].id);
    } else if (entityType === "store" && stores.length > 0) {
      setSelectedId(stores[0].id);
    } else {
      setSelectedId("");
    }
  }, [entityType, networks, stores]);

  const handleDeactivate = async () => {
    if (!selectedId) {
      setFeedback({ 
        type: "error", 
        message: `Selecione ${entityType === "network" ? "a rede" : "a loja"} que deseja desativar.` 
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

      if (entityType === "network") {
        // Verificar usuários afetados
        const affectedResponse = await fetch(`/api/networks/affected-users?networkId=${selectedId}`, {
          method: 'GET',
          headers,
        });

        if (!affectedResponse.ok) {
          let errorMessage = "Erro ao verificar usuários afetados";
          try {
            const errorData = await affectedResponse.json();
            console.error("Erro da API:", errorData);
            errorMessage = errorData.error || errorData.details?.message || errorData.details || errorMessage;
          } catch (parseError) {
            errorMessage = `Erro ${affectedResponse.status}: ${affectedResponse.statusText || errorMessage}`;
            console.error("Erro ao parsear resposta:", parseError);
          }
          throw new Error(errorMessage);
        }

        const affectedData = await affectedResponse.json();
        const affectedCount = affectedData.totalCount || 0;

        // Confirmar com informações sobre usuários afetados
        const confirmMessage = affectedCount > 0
          ? `Tem certeza que deseja desativar esta rede?\n\nATENÇÃO: Esta ação irá desativar TODAS as lojas desta rede.\n\n${affectedCount} usuário(s) serão afetados.\n\nEstratégia: Usuários serão desativados (não há outra rede para migração).`
          : `Tem certeza que deseja desativar esta rede?\n\nATENÇÃO: Esta ação irá desativar TODAS as lojas desta rede.`;

        if (!window.confirm(confirmMessage)) {
          setProcessing(false);
          return;
        }

        // Desativar rede
        const response = await fetch('/api/networks/deactivate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            networkId: selectedId,
            migrationStrategy: 'auto_migrate',
            notes: `Desativado via interface de administração`,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Erro ao desativar a rede";
          try {
            const errorData = await response.json();
            console.error("Erro da API de desativação:", errorData);
            errorMessage = errorData.error || errorData.details?.message || errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = `Erro ${response.status}: ${response.statusText || errorMessage}`;
            console.error("Erro ao parsear resposta de desativação:", parseError);
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        await refresh();
        
        const networkName = networks.find(n => n.id === selectedId)?.name || "a rede";
        const successMessage = affectedCount > 0
          ? `Rede "${networkName}" desativada com sucesso. Todas as lojas da rede foram desativadas. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
          : `Rede "${networkName}" desativada com sucesso. Todas as lojas da rede foram desativadas.`;
        
        setFeedback({ type: "success", message: successMessage });
      } else {
        // Desativar loja
        const affectedResponse = await fetch(`/api/stores/affected-users?storeId=${selectedId}`, {
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
          setProcessing(false);
          return;
        }

        const response = await fetch('/api/stores/deactivate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedId,
            migrationStrategy: 'auto_migrate',
            notes: `Desativado via interface de administração`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao desativar a empresa");
        }

        const result = await response.json();
        await refresh();
        
        const storeName = stores.find(s => s.id === selectedId)?.name || "a empresa";
        const successMessage = affectedCount > 0
          ? `Empresa "${storeName}" desativada com sucesso. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
          : `Empresa "${storeName}" desativada com sucesso.`;
        
        setFeedback({ type: "success", message: successMessage });
      }
    } catch (error: any) {
      console.error(error);
      setFeedback({ 
        type: "error", 
        message: error.message || `Erro ao desativar ${entityType === "network" ? "a rede" : "a loja"}. Tente novamente.` 
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
            <CardTitle className="flex items-center gap-2 text-gray-900 text-rose-600">
              <Power className="w-5 h-5" />
              Desativar Rede ou Loja
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-rose-600">ATENÇÃO:</strong> Ao desativar uma rede, TODAS as lojas dessa rede serão desativadas automaticamente.
              Os usuários associados serão tratados conforme a estratégia de migração. Os dados históricos não serão excluídos.
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

            <div className="space-y-2">
              <Label>{entityType === "network" ? "Rede" : "Loja (Empresa)"}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione ${entityType === "network" ? "a rede" : "a loja"}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="destructive" 
                onClick={handleDeactivate} 
                disabled={processing || !selectedId}
                className="min-w-[140px]"
              >
                {processing ? "Desativando..." : "Desativar"}
              </Button>
            </div>

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
                      {entityType === "network" ? "A rede foi removida da lista de redes ativas. Os dados históricos foram preservados." : "A empresa foi removida da lista de empresas ativas. Os dados históricos foram preservados."}
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

