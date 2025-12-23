"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, UploadCloud, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function AlterarLogoView() {
  const { stores, networks, refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [logoNetworkId, setLogoNetworkId] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (networks.length === 0) return;
    setLogoNetworkId((prev) => prev || networks[0].id);
  }, [networks]);

  useEffect(() => {
    if (logoNetworkId && !networks.some((network) => network.id === logoNetworkId)) {
      setLogoNetworkId(networks[0]?.id ?? "");
    }
  }, [networks, logoNetworkId]);

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
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              Alterar Logos das Redes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                <Label>Arquivo da logo</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/heic"
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  className="mt-1"
                />
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
                  className={`text-sm flex items-center gap-2 ${
                    logoFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {logoFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {logoFeedback.message}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

