"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, UploadCloud, Type, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type ActionType = "logo" | "name";

export function AlterarDadosView() {
  const { stores, networks, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [actionType, setActionType] = useState<ActionType>("name");
  const [logoNetworkId, setLogoNetworkId] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<FeedbackState>(null);

  const [renameStoreId, setRenameStoreId] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");
  const [renaming, setRenaming] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (networks.length === 0) return;
    setLogoNetworkId((prev) => prev || networks[0].id);
  }, [networks]);

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
    if (logoNetworkId && !networks.some((network) => network.id === logoNetworkId)) {
      setLogoNetworkId(networks[0]?.id ?? "");
    }
    if (renameStoreId && !stores.some((store) => store.id === renameStoreId)) {
      setRenameStoreId(stores[0]?.id ?? "");
    }
  }, [networks, stores, logoNetworkId, renameStoreId]);

  const handleUploadLogo = async () => {
    if (!logoNetworkId || !logoFile) {
      setLogoFeedback({ type: "error", message: "Selecione a rede e um arquivo válido antes de enviar." });
      return;
    }

    try {
      setUploadingLogo(true);
      setLogoFeedback(null);
      const extension = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${logoNetworkId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("company-logos").upload(filePath, logoFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Não foi possível obter o link público da imagem.");

      // Atualizar logo na tabela networks primeiro, se falhar tenta orgs (compatibilidade)
      let updateError = null;
      const { error: networkUpdateError } = await supabase.from("networks").update({ logo_url: publicUrl }).eq("id", logoNetworkId);
      if (networkUpdateError) {
        // Fallback para orgs caso networks não exista
        const { error: orgUpdateError } = await supabase.from("orgs").update({ logo_url: publicUrl }).eq("id", logoNetworkId);
        if (orgUpdateError) {
          updateError = orgUpdateError;
        }
      } else {
        updateError = networkUpdateError;
      }

      if (updateError) throw updateError;

      // Limpar o arquivo selecionado antes do refresh para melhor UX
      setLogoFile(null);
      
      // Aguardar um pouco antes do refresh para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      await refresh();
      
      setLogoFeedback({ 
        type: "success", 
        message: "Logo da rede atualizada com sucesso! A página será atualizada para exibir o novo logo." 
      });
      
      // Limpar feedback após 5 segundos
      setTimeout(() => {
        setLogoFeedback(null);
      }, 5000);
    } catch (error) {
      console.error(error);
      setLogoFeedback({ type: "error", message: "Erro ao atualizar a logo da rede. Tente novamente." });
    } finally {
      setUploadingLogo(false);
    }
  };

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
              Alterar Dados
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={actionType} onValueChange={(value) => setActionType(value as ActionType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="name">Alterar Nome</TabsTrigger>
              <TabsTrigger value="logo">Alterar Logo</TabsTrigger>
            </TabsList>

            <TabsContent value="name" className="space-y-4 mt-6">
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
                      className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                        renameFeedback.type === "success" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {renameFeedback.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="font-medium">{renameFeedback.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logo" className="space-y-4 mt-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Carregue uma nova imagem para representar a rede. Todas as lojas da rede usarão esta logo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                <div className="space-y-2">
                  <Label>Rede</Label>
                  <Select value={logoNetworkId} onValueChange={setLogoNetworkId}>
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
                  <div>
                    <Label htmlFor="network-logo" className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      Arquivo da logo
                    </Label>
                    <Input
                      id="network-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/heic"
                      onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                      className="mt-1 cursor-pointer"
                    />
                    {logoFile && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 mt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{logoFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoFile(null)}
                          disabled={uploadingLogo}
                          className="h-6 px-2 text-xs"
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: png, jpeg, jpg, heic. Tamanho recomendado 512x512.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUploadLogo} disabled={!logoFile || uploadingLogo}>
                      {uploadingLogo ? "Enviando..." : "Salvar logo"}
                    </Button>
                    {logoFile && (
                      <Button variant="ghost" onClick={() => setLogoFile(null)}>
                        Limpar seleção
                      </Button>
                    )}
                  </div>
                  {logoFeedback && (
                    <div
                      className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                        logoFeedback.type === "success" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {logoFeedback.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="font-medium">{logoFeedback.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

