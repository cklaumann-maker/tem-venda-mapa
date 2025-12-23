"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, Plus, ArrowLeft, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export function CriarRedeView() {
  const { refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  const [networkName, setNetworkName] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleCreateNetwork = async () => {
    const trimmed = networkName.trim();
    
    if (trimmed.length < 2) {
      setFeedback({ type: "error", message: "O nome da rede deve ter pelo menos 2 caracteres." });
      return;
    }

    if (trimmed.length > 255) {
      setFeedback({ type: "error", message: "O nome da rede é muito longo (máximo 255 caracteres)." });
      return;
    }

    try {
      setCreating(true);
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

      // Criar rede usando a API (sem logo primeiro)
      const response = await fetch('/api/networks/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: trimmed,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Erro ao criar rede");
      }

      const networkId = responseData.data?.id;

      if (!networkId) {
        throw new Error("Rede criada mas ID não retornado");
      }

      // Se há logo, fazer upload agora que temos o ID da rede
      let logoUploaded = false;
      if (logoFile) {
        try {
          const extension = logoFile.name.split(".").pop()?.toLowerCase() || "png";
          const filePath = `${networkId}/${Date.now()}.${extension}`;
          
          const { error: uploadError } = await supabase.storage.from("company-logos").upload(filePath, logoFile, {
            cacheControl: "3600",
            upsert: false,
          });
          
          if (uploadError) {
            console.error("Erro ao fazer upload da logo:", uploadError);
            // Não falhar a criação se o upload da logo falhar
          } else {
            const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
            const publicUrl = urlData?.publicUrl;
            
            if (publicUrl) {
              // Atualizar logo_url na rede
              const { error: updateError } = await supabase
                .from("networks")
                .update({ logo_url: publicUrl })
                .eq("id", networkId);
              
              if (!updateError) {
                logoUploaded = true;
              } else {
                console.error("Erro ao atualizar logo_url:", updateError);
              }
            }
          }
        } catch (logoError: any) {
          console.error("Erro ao processar logo:", logoError);
          // Não falhar a criação se o processamento da logo falhar
        }
      }

      await refresh();
      setNetworkName("");
      setLogoFile(null);
      setFeedback({ 
        type: "success", 
        message: `Rede "${trimmed}" criada com sucesso!${logoUploaded ? " Logo adicionada." : logoFile ? " (Logo não pôde ser adicionada, mas você pode adicionar depois)" : ""}` 
      });
    } catch (error: any) {
      console.error(error);
      setFeedback({ 
        type: "error", 
        message: error.message || "Erro ao criar rede. Tente novamente." 
      });
    } finally {
      setCreating(false);
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
              <Plus className="w-5 h-5 text-emerald-600" />
              Criar Nova Rede
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Crie uma nova rede para organizar suas lojas. Você poderá criar lojas e associar usuários a esta rede posteriormente.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="network-name">Nome da Rede *</Label>
              <Input
                id="network-name"
                value={networkName}
                onChange={(event) => {
                  setNetworkName(event.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="Digite o nome da rede"
                disabled={creating}
                maxLength={255}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating && networkName.trim().length >= 2) {
                    handleCreateNetwork();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 2 caracteres, máximo 255 caracteres. O nome deve ser único.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="network-logo" className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                Logo da Rede (Opcional)
              </Label>
              <Input
                id="network-logo"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/heic"
                onChange={(event) => {
                  setLogoFile(event.target.files?.[0] ?? null);
                  if (feedback) setFeedback(null);
                }}
                disabled={creating}
                className="cursor-pointer"
              />
              {logoFile && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{logoFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoFile(null)}
                    disabled={creating}
                    className="h-6 px-2 text-xs"
                  >
                    Remover
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: png, jpeg, jpg, heic. Tamanho recomendado 512x512.
              </p>
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
                      Você pode voltar para a página anterior ou criar outra rede.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleCreateNetwork} 
                disabled={creating || networkName.trim().length < 2}
                className="min-w-[120px]"
              >
                {creating ? "Criando..." : "Criar Rede"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setNetworkName("");
                  setLogoFile(null);
                  setFeedback(null);
                }}
                disabled={creating}
              >
                Limpar
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-6">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> Após criar a rede, você poderá:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>Criar lojas associadas a esta rede</li>
              <li>Adicionar usuários e associá-los à rede</li>
              <li>Personalizar a logo da rede (se não adicionou agora)</li>
              <li>Configurar outras opções através das outras seções de gestão</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
