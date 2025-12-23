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

type Network = {
  id: string;
  name: string;
  deactivated_at: string | null;
};

export function ReativarRedeView() {
  const { refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivateNetworkId, setReactivateNetworkId] = useState<string>("");
  const [reactivating, setReactivating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    loadInactiveNetworks();
  }, []);

  const loadInactiveNetworks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("networks")
        .select("id, name, deactivated_at")
        .eq("is_active", false)
        .order("name", { ascending: true });

      if (error) throw error;
      setNetworks(data || []);
      if (data && data.length > 0) {
        setReactivateNetworkId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar redes desativadas:", error);
      setFeedback({ type: "error", message: "Erro ao carregar redes desativadas." });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateNetwork = async () => {
    if (!reactivateNetworkId) {
      setFeedback({ type: "error", message: "Selecione a rede que deseja reativar." });
      return;
    }

    try {
      setReactivating(true);
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

      // Reativar usando a API
      const response = await fetch('/api/networks/reactivate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          networkId: reactivateNetworkId,
          notes: `Reativado via interface de administração`,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Erro ao reativar rede");
      }

      // Guardar nome antes de recarregar
      const networkName = networks.find(n => n.id === reactivateNetworkId)?.name || "a rede";
      
      await refresh();
      await loadInactiveNetworks(); // Recarregar lista de desativadas
      
      setFeedback({ 
        type: "success", 
        message: `Rede "${networkName}" reativada com sucesso!` 
      });
    } catch (error: any) {
      console.error(error);
      setFeedback({ 
        type: "error", 
        message: error.message || "Erro ao reativar rede. Tente novamente." 
      });
    } finally {
      setReactivating(false);
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
            <CardTitle className="flex items-center gap-2 text-gray-900 text-emerald-600">
              <RotateCcw className="w-5 h-5" />
              Reativar Rede
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Reative uma rede que foi desativada anteriormente. A rede voltará a aparecer na lista de redes ativas.
            </p>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando redes desativadas...</div>
          ) : networks.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <p className="text-sm font-medium">Nenhuma rede desativada encontrada.</p>
              <p className="text-xs mt-1 opacity-80">Todas as redes estão ativas no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rede Desativada</Label>
                <Select value={reactivateNetworkId} onValueChange={setReactivateNetworkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a rede para reativar" />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.id} value={network.id}>
                        {network.name}
                        {network.deactivated_at && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (desativada em {new Date(network.deactivated_at).toLocaleDateString('pt-BR')})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleReactivateNetwork} 
                  disabled={reactivating || !reactivateNetworkId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                >
                  {reactivating ? "Reativando..." : "Reativar Rede"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={loadInactiveNetworks}
                  disabled={reactivating || loading}
                >
                  Atualizar Lista
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
                        A rede voltou a aparecer na lista de redes ativas.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

