"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardPage } from "../../page";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, UploadCloud, Type, Power, Building2 } from "lucide-react";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

function ConfiguracoesEmpresasContent() {
  const { stores, networks, isAdmin, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);

  const [logoNetworkId, setLogoNetworkId] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<FeedbackState>(null);

  const [renameStoreId, setRenameStoreId] = useState<string>("");
  const [renameValue, setRenameValue] = useState<string>("");
  const [renaming, setRenaming] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<FeedbackState>(null);

  const [deactivateStoreId, setDeactivateStoreId] = useState<string>("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateFeedback, setDeactivateFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (networks.length === 0) return;
    setLogoNetworkId((prev) => prev || networks[0].id);
  }, [networks]);

  useEffect(() => {
    if (stores.length === 0) return;
    setRenameStoreId((prev) => prev || stores[0].id);
    setDeactivateStoreId((prev) => prev || stores[0].id);
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
    if (deactivateStoreId && !stores.some((store) => store.id === deactivateStoreId)) {
      setDeactivateStoreId(stores[0]?.id ?? "");
    }
  }, [networks, stores, logoNetworkId, renameStoreId, deactivateStoreId]);

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

      await refresh();
      setLogoFile(null);
      setLogoFeedback({ type: "success", message: "Logo da rede atualizada com sucesso." });
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

  const handleDeactivateStore = async () => {
    if (!deactivateStoreId) {
      setDeactivateFeedback({ type: "error", message: "Selecione a empresa que deseja desativar." });
      return;
    }
    if (!window.confirm("Tem certeza que deseja desativar esta empresa? Os usuários associados perderão acesso.")) {
      return;
    }

    try {
      setDeactivating(true);
      setDeactivateFeedback(null);

      const { error: membersError } = await supabase
        .from("store_members")
        .update({ active: false })
        .eq("store_id", deactivateStoreId);
      if (membersError) throw membersError;

      const { error: storeError } = await supabase
        .from("stores")
        .update({ is_active: false })
        .eq("id", deactivateStoreId);
      if (storeError) throw storeError;

      await refresh();
      setDeactivateFeedback({ type: "success", message: "Empresa desativada com sucesso." });
    } catch (error) {
      console.error(error);
      setDeactivateFeedback({ type: "error", message: "Erro ao desativar a empresa. Tente novamente." });
    } finally {
      setDeactivating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Acesso restrito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Somente administradores podem gerenciar as empresas cadastradas.</p>
            <p>Caso precise atualizar informações, procure o responsável pela sua rede ou fale com o suporte TEM VENDA.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Gestão de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                Alterar logos das redes
              </h3>
              <p className="text-xs text-muted-foreground">
                Carregue uma nova imagem para representar a rede. Todas as lojas da rede usarão esta logo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
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
              <div className="space-y-3">
                <div>
                  <Label>Arquivo da logo</Label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/heic"
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
                    className={`text-xs flex items-center gap-2 ${
                      logoFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {logoFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {logoFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-dashed pt-6" />

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Type className="w-4 h-4 text-emerald-600" />
                Alterar nome das empresas
              </h3>
              <p className="text-xs text-muted-foreground">
                Atualize o nome exibido nas seleções e relatórios. As mudanças são aplicadas imediatamente para todos os usuários.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
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
              <div className="space-y-3">
                <div>
                  <Label>Novo nome</Label>
                  <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="Digite o novo nome da empresa" />
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
                    className={`text-xs flex items-center gap-2 ${
                      renameFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {renameFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {renameFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-dashed pt-6" />

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 text-rose-600">
                <Power className="w-4 h-4" />
                Desativar empresa
              </h3>
              <p className="text-xs text-muted-foreground">
                Ao desativar, a empresa deixa de aparecer na lista ativa e os usuários associados são desligados deste ambiente.
                Os dados históricos não serão excluídos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[240px_1fr] items-end">
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
              <div className="space-y-3">
                <Button variant="destructive" onClick={handleDeactivateStore} disabled={deactivating || !deactivateStoreId}>
                  {deactivating ? "Desativando..." : "Desativar empresa"}
                </Button>
                {deactivateFeedback && (
                  <div
                    className={`text-xs flex items-center gap-2 ${
                      deactivateFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {deactivateFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {deactivateFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfiguracoesEmpresasPage() {
  return (
    <DashboardPage
      initialView="configuracoes-empresas"
      extraRoutes={{
        "configuracoes-empresas": {
          title: "Configurações · Empresas",
          path: "/configuracoes/empresas",
          component: <ConfiguracoesEmpresasContent />,
        },
      }}
    />
  );
}

