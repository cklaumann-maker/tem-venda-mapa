"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, Type, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function AlterarNomeView() {
  const { stores, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [renameStoreId, setRenameStoreId] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");
  const [renaming, setRenaming] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (stores.length === 0) return;
    setRenameStoreId((prev) => prev || stores[0].id);
  }, [stores]);

  useEffect(() => {
    if (!renameStoreId) return;
    const current = stores.find((store) => store.id === renameStoreId);
    setRenameValue(current?.name ?? "");
  }, [renameStoreId, stores]);

  useEffect(() => {
    if (renameStoreId && !stores.some((store) => store.id === renameStoreId)) {
      setRenameStoreId(stores[0]?.id ?? "");
    }
  }, [stores, renameStoreId]);

  const handleRenameStore = async () => {
    const trimmed = renameValue.trim();
    if (!renameStoreId || trimmed.length < 2) {
      setRenameFeedback({ type: "error", message: "Informe um nome válido (mínimo 2 caracteres)." });
      return;
    }

    try {
      setRenaming(true);
      setRenameFeedback(null);
      const { error } = await supabase.from("stores").update({ name: trimmed }).eq("id", renameStoreId);
      if (error) throw error;
      await refresh();
      setRenameFeedback({ type: "success", message: "Nome da empresa atualizado com sucesso." });
    } catch (error) {
      console.error(error);
      setRenameFeedback({ type: "error", message: "Erro ao atualizar o nome da empresa." });
    } finally {
      setRenaming(false);
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
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Type className="w-5 h-5 text-emerald-600" />
              Alterar Nome das Empresas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Atualize o nome exibido nas seleções e relatórios. As mudanças são aplicadas imediatamente para todos os usuários.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={renameStoreId} onValueChange={setRenameStoreId}>
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
              <div>
                <Label>Novo nome</Label>
                <Input 
                  value={renameValue} 
                  onChange={(event) => setRenameValue(event.target.value)} 
                  placeholder="Digite o novo nome da empresa"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRenameStore} disabled={renaming || renameValue.trim().length < 2}>
                  {renaming ? "Salvando..." : "Salvar nome"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const current = stores.find((store) => store.id === renameStoreId);
                    setRenameValue(current?.name ?? "");
                  }}
                  disabled={renaming}
                >
                  Reverter alterações
                </Button>
              </div>
              {renameFeedback && (
                <div
                  className={`text-sm flex items-center gap-2 ${
                    renameFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {renameFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {renameFeedback.message}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

