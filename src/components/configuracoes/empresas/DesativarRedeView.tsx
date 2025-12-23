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

export function DesativarRedeView() {
  const { networks, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [deactivateNetworkId, setDeactivateNetworkId] = useState<string>("");
  const [deactivatingNetwork, setDeactivatingNetwork] = useState(false);
  const [deactivateNetworkFeedback, setDeactivateNetworkFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (networks.length === 0) return;
    setDeactivateNetworkId((prev) => prev || networks[0].id);
  }, [networks]);

  useEffect(() => {
    if (deactivateNetworkId && !networks.some((network) => network.id === deactivateNetworkId)) {
      setDeactivateNetworkId(networks[0]?.id ?? "");
    }
  }, [networks, deactivateNetworkId]);

  const handleDeactivateNetwork = async () => {
    if (!deactivateNetworkId) {
      setDeactivateNetworkFeedback({ type: "error", message: "Selecione a rede que deseja desativar." });
      return;
    }

    // Verificar usuários afetados antes de desativar
    try {
      setDeactivatingNetwork(true);
      setDeactivateNetworkFeedback(null);

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
      const affectedResponse = await fetch(`/api/networks/affected-users?networkId=${deactivateNetworkId}`, {
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
          // Se não conseguir parsear JSON, usar o status text
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
        setDeactivatingNetwork(false);
        return;
      }

      // Desativar usando a nova API
      const response = await fetch('/api/networks/deactivate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          networkId: deactivateNetworkId,
          migrationStrategy: 'auto_migrate', // Migração automática
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
      
      // Limpar seleção se a rede desativada era a selecionada
      if (deactivateNetworkId && !networks.some(n => n.id === deactivateNetworkId)) {
        setDeactivateNetworkId("");
      }
      
      const successMessage = affectedCount > 0
        ? `Rede desativada com sucesso. Todas as lojas da rede foram desativadas. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
        : "Rede desativada com sucesso. Todas as lojas da rede foram desativadas.";
      
      setDeactivateNetworkFeedback({ type: "success", message: successMessage });
    } catch (error: any) {
      console.error(error);
      setDeactivateNetworkFeedback({ 
        type: "error", 
        message: error.message || "Erro ao desativar a rede. Tente novamente." 
      });
    } finally {
      setDeactivatingNetwork(false);
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
              Desativar Rede
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

          <div className="grid gap-4 sm:grid-cols-[240px_1fr] items-end">
            <div className="space-y-2">
              <Label>Rede</Label>
              <Select value={deactivateNetworkId} onValueChange={setDeactivateNetworkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rede" />
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
            <div className="space-y-4">
              <Button variant="destructive" onClick={handleDeactivateNetwork} disabled={deactivatingNetwork || !deactivateNetworkId} className="min-w-[140px]">
                {deactivatingNetwork ? "Desativando..." : "Desativar rede"}
              </Button>
              
              {deactivateNetworkFeedback && (
                <div
                  className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                    deactivateNetworkFeedback.type === "success" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {deactivateNetworkFeedback.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{deactivateNetworkFeedback.message}</p>
                    {deactivateNetworkFeedback.type === "success" && (
                      <p className="text-sm mt-1 opacity-80">
                        A rede foi removida da lista de redes ativas. Os dados históricos foram preservados.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

