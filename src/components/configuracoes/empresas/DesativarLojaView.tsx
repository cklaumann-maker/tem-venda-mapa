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

export function DesativarLojaView() {
  const { stores, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [deactivateStoreId, setDeactivateStoreId] = useState<string>("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateFeedback, setDeactivateFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (stores.length === 0) return;
    setDeactivateStoreId((prev) => prev || stores[0].id);
  }, [stores]);

  useEffect(() => {
    if (deactivateStoreId && !stores.some((store) => store.id === deactivateStoreId)) {
      setDeactivateStoreId(stores[0]?.id ?? "");
    }
  }, [stores, deactivateStoreId]);

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
      
      const successMessage = affectedCount > 0
        ? `Empresa desativada com sucesso. ${affectedCount} usuário(s) foram tratados conforme a estratégia de migração.`
        : "Empresa desativada com sucesso.";
      
      setDeactivateFeedback({ type: "success", message: successMessage });
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

          <div className="grid gap-4 sm:grid-cols-[240px_1fr] items-end">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={deactivateStoreId} onValueChange={setDeactivateStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
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
            <div className="space-y-4">
              <Button variant="destructive" onClick={handleDeactivateStore} disabled={deactivating || !deactivateStoreId} className="min-w-[140px]">
                {deactivating ? "Desativando..." : "Desativar empresa"}
              </Button>
              
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
                        A empresa foi removida da lista de empresas ativas. Os dados históricos foram preservados.
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

