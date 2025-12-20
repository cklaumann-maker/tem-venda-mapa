"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Logo from "@/components/common/Logo";

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    finance: 'Financeiro',
    leader: 'Líder',
    owner: 'Proprietário',
  };
  return labels[role] || role;
}

export default function AtivarContaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extrair token da query string, removendo qualquer # no final
  let token = searchParams.get("token");
  if (token) {
    // Remover qualquer # no final
    if (token.endsWith("#")) {
      token = token.slice(0, -1);
    }
    // Remover espaços em branco
    token = token.trim();
    // Não decodificar, pois o token já é alfanumérico e pode causar problemas
    // com clientes de email que fazem conversões automáticas (O -> 0)
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (token) {
      console.log("✅ [useEffect] Token extraído da URL");
      console.log("📋 [useEffect] Token (primeiros 20 chars):", token.substring(0, 20) + "...");
      console.log("📋 [useEffect] Token (últimos 20 chars):", "..." + token.substring(token.length - 20));
      console.log("📋 [useEffect] Token length:", token.length);
      loadInviteData();
    } else {
      console.error("❌ [useEffect] Token não encontrado na URL");
      setError("Token de ativação não fornecido");
    }
  }, [token]);

  const loadInviteData = async () => {
    try {
      if (!token) {
        setError("Token de ativação não fornecido");
        return;
      }

      const cleanToken = token.trim();
      console.log("🔍 [loadInviteData] Buscando convite com token:", cleanToken.substring(0, 20) + "...");
      console.log("🔍 [loadInviteData] Token completo:", cleanToken);
      console.log("🔍 [loadInviteData] Token length:", cleanToken.length);
      
      // Usar API route server-side para buscar o convite (bypass RLS)
      const response = await fetch(`/api/invites/verify-token?token=${encodeURIComponent(cleanToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ [loadInviteData] Erro na API:", errorData);
        
        if (response.status === 404) {
          setError("Convite não encontrado ou token inválido. Verifique se o convite não foi deletado ou já utilizado.");
          return;
        }
        
        if (response.status === 400) {
          setError(errorData.error || "Erro ao verificar convite");
          return;
        }
        
        throw new Error(errorData.error || 'Erro ao buscar convite');
      }

      const result = await response.json();
      console.log("📋 [loadInviteData] Resultado da busca:", result.invite ? "✅ Encontrado" : "❌ Não encontrado");
      
      if (!result.invite) {
        setError("Convite não encontrado ou token inválido. Verifique se o convite não foi deletado ou já utilizado.");
        return;
      }

      const data = result.invite;
      
      // Adicionar token aos dados do convite para usar na ativação
      setInviteData({
        ...data,
        token: cleanToken, // Incluir token para usar na ativação
      });
    } catch (err: any) {
      console.error("Erro ao carregar convite:", err);
      setError(err.message || "Erro ao carregar convite");
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validar senhas
      if (password.length < 8) {
        setError("A senha deve ter no mínimo 8 caracteres");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não coincidem");
        setLoading(false);
        return;
      }

      // Usar API route para criar/atualizar usuário e definir senha
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          password,
          inviteId: inviteData.id,
          token: token,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Erro ao criar usuário' };
        }
        throw new Error(errorData.error || 'Erro ao ativar conta');
      }

      setSuccess(true);

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push("/login?activated=true");
      }, 2000);
    } catch (err: any) {
      console.error("Erro ao ativar conta:", err);
      setError(err.message || "Erro ao ativar conta");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <Logo width={220} height={88} priority />
            </div>
            <CardTitle>Token Inválido</CardTitle>
            <CardDescription>
              O token de ativação não foi fornecido ou é inválido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <Logo width={220} height={88} priority />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Erro
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <Logo width={220} height={88} priority />
            </div>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle>Conta Ativada com Sucesso!</CardTitle>
            <CardDescription>
              Sua conta foi ativada. Você será redirecionado para o login em instantes...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo width={220} height={88} priority />
          </div>
          <CardTitle>Ativar Conta</CardTitle>
          <CardDescription>
            Defina uma senha para ativar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Email:</strong> {inviteData.email}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Cargo:</strong> {getRoleLabel(inviteData.role)}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                A senha deve ter no mínimo 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Digite a senha novamente"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ativando...
                </div>
              ) : (
                "Ativar Conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

