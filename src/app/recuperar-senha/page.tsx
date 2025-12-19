"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import Logo from "@/components/common/Logo";
import { sendPasswordResetEmail } from "@/lib/email";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // O Supabase envia o token no hash (#), não como query parameter (?)
  // Formato: /recuperar-senha#access_token=...&type=recovery
  const [hasToken, setHasToken] = useState(false);

  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Verificar se há token no hash da URL (Supabase usa hash fragments)
  useEffect(() => {
    const checkForToken = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        const hasAccessToken = hash.includes("access_token=") && hash.includes("type=recovery");
        
        console.log("🔍 Debug - Hash da URL:", hash ? "Presente" : "Ausente");
        console.log("🔍 Debug - Hash completo:", hash);
        console.log("🔍 Debug - Tem access_token:", hash.includes("access_token="));
        console.log("🔍 Debug - Tipo recovery:", hash.includes("type=recovery"));
        
        if (hasAccessToken) {
          setHasToken(true);
          setStep("reset");
          verifyToken();
        } else {
          // Também verificar query parameter para compatibilidade
          const queryToken = searchParams.get("token");
          if (queryToken) {
            console.log("🔍 Debug - Token encontrado em query parameter");
            setHasToken(true);
            setStep("reset");
            verifyToken();
          }
        }
      }
    };

    checkForToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyToken = async () => {
    setLoading(true);
    setError("");
    setDebugInfo("");
    
    try {
      const supabase = supabaseClient();
      
      // Log de debug
      console.log("🔍 Debug - Verificando token...");
      console.log("🔍 Debug - URL atual:", typeof window !== "undefined" ? window.location.href : "N/A");
      console.log("🔍 Debug - Hash:", typeof window !== "undefined" ? window.location.hash : "N/A");
      
      // O Supabase precisa processar o hash primeiro
      // Isso é feito automaticamente quando há um hash na URL
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash;
        if (hash.includes("access_token=")) {
          console.log("🔍 Debug - Processando hash do Supabase...");
          // O Supabase processa automaticamente o hash na próxima chamada
          // Aguardar um pouco para garantir que o processamento aconteceu
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Verificar se o usuário está autenticado com o token
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log("🔍 Debug - Resultado getUser:", {
        hasUser: !!user,
        userEmail: user?.email,
        error: userError?.message,
      });
      
      if (userError) {
        console.error("❌ Erro ao obter usuário:", userError);
        setDebugInfo(`Erro: ${userError.message} | Código: ${userError.status || "N/A"}`);
        
        if (userError.message?.includes("expired") || userError.message?.includes("invalid")) {
          setError("Link inválido ou expirado. Solicite um novo link de recuperação.");
        } else {
          setError(`Erro ao validar o link: ${userError.message}`);
        }
        setTokenValid(false);
        setStep("request");
        return;
      }
      
      if (!user) {
        console.error("❌ Usuário não encontrado");
        setDebugInfo("Usuário não encontrado após verificação do token");
        setError("Link inválido ou expirado. Solicite um novo link de recuperação.");
        setTokenValid(false);
        setStep("request");
        return;
      }
      
      console.log("✅ Token válido! Usuário:", user.email);
      setTokenValid(true);
      setStep("reset");
      setDebugInfo(`Token válido para: ${user.email}`);
    } catch (err: any) {
      console.error("❌ Erro ao verificar token:", err);
      setDebugInfo(`Erro inesperado: ${err.message || JSON.stringify(err)}`);
      setError("Erro ao validar o link. Tente novamente.");
      setTokenValid(false);
      setStep("request");
    } finally {
      setLoading(false);
    }
  };

  // Validar força da senha
  const validatePasswordStrength = (pwd: string): "weak" | "medium" | "strong" => {
    if (pwd.length < 8) return "weak";
    
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 2) return "weak";
    if (strength <= 4) return "medium";
    return "strong";
  };

  // Validar se a senha atende todos os critérios obrigatórios
  const validatePasswordRequirements = (pwd: string): { valid: boolean; missing: string[] } => {
    const missing: string[] = [];
    
    if (pwd.length < 8) {
      missing.push("Mínimo 8 caracteres");
    }
    if (!/[a-z]/.test(pwd)) {
      missing.push("Letra minúscula");
    }
    if (!/[A-Z]/.test(pwd)) {
      missing.push("Letra maiúscula");
    }
    if (!/[0-9]/.test(pwd)) {
      missing.push("Número");
    }
    if (!/[^a-zA-Z0-9]/.test(pwd)) {
      missing.push("Símbolo especial");
    }
    
    return {
      valid: missing.length === 0,
      missing,
    };
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePasswordStrength(password));
    } else {
      setPasswordStrength("weak");
    }
  }, [password]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validação de email
      if (!email) {
        setError("Email é obrigatório");
        setLoading(false);
        return;
      }

      // Validação básica de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Por favor, insira um email válido");
        setLoading(false);
        return;
      }

      // Usar Supabase Auth para enviar email de recuperação
      // O Supabase gerencia automaticamente:
      // - Rate limiting (proteção contra spam)
      // - Token único e seguro
      // - Expiração de token (padrão: 1 hora)
      // - Proteção contra enumeração de emails
      const supabase = supabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/recuperar-senha`,
      });

      if (error) {
        // Não revelar se o email existe ou não (segurança)
        // O Supabase sempre retorna sucesso para evitar enumeração
        throw error;
      }

      const emailEnviado = email; // Salvar o email antes de limpar
      setSuccess(`Email de recuperação enviado para ${emailEnviado}. Verifique sua caixa de entrada e siga as instruções. O link expira em 1 hora.`);
      setEmail("");
    } catch (err: any) {
      console.error("Erro ao solicitar recuperação:", err);
      // Mensagem genérica para não revelar informações sensíveis
      if (err.message?.includes("rate limit") || err.message?.includes("too many")) {
        setError("Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.");
      } else {
        setError("Erro ao solicitar recuperação de senha. Verifique se o email está correto e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validações de segurança da senha
      if (password.length < 8) {
        setError("A senha deve ter no mínimo 8 caracteres");
        setLoading(false);
        return;
      }

      if (password.length > 128) {
        setError("A senha não pode ter mais de 128 caracteres");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não coincidem");
        setLoading(false);
        return;
      }

      // Validar se a senha atende TODOS os critérios obrigatórios
      const requirements = validatePasswordRequirements(password);
      if (!requirements.valid) {
        const missingList = requirements.missing.join(", ");
        setError(`A senha não atende todos os critérios obrigatórios. Faltam: ${missingList}.`);
        setLoading(false);
        return;
      }

      // Verificar se o token ainda é válido
      const supabase = supabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError("Sessão expirada. Solicite um novo link de recuperação.");
        setStep("request");
        setLoading(false);
        return;
      }

      // Verificar se a nova senha é diferente da atual (se possível)
      // Nota: O Supabase não permite verificar a senha atual diretamente,
      // mas podemos registrar a mudança no perfil

      // Atualizar senha usando o token do Supabase
      // O Supabase automaticamente:
      // - Valida o token
      // - Invalida o token após uso (one-time use)
      // - Atualiza a senha de forma segura (hash bcrypt)
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (error.message?.includes("expired") || error.message?.includes("invalid")) {
          setError("Link expirado ou inválido. Solicite um novo link de recuperação.");
          setStep("request");
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      // Atualizar password_changed_at no perfil (auditoria)
      if (user) {
        await supabase
          .from("profiles")
          .update({ password_changed_at: new Date().toISOString() })
          .eq("id", user.id);
      }

      // Fazer logout para garantir que todas as sessões sejam invalidadas
      await supabase.auth.signOut();

      setSuccess("Senha alterada com sucesso! Redirecionando para o login...");

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/login?passwordReset=true");
      }, 2000);
    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      if (err.message?.includes("expired") || err.message?.includes("invalid")) {
        setError("Link expirado ou inválido. Solicite um novo link de recuperação.");
        setStep("request");
      } else {
        setError(err.message || "Erro ao redefinir senha. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "request") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <Logo width={220} height={88} priority />
            </div>
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu email para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 mb-4">
                <Mail className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="seu@email.com"
                />
              </div>

              <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </div>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-sm cursor-pointer"
              >
                Voltar para Login
              </Button>
            </div>
          </CardContent>
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
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {tokenValid === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                <div className="space-y-2">
                  <p>Link inválido ou expirado. Solicite um novo link de recuperação abaixo.</p>
                  {debugInfo && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-semibold">Informações de debug (clique para expandir)</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {debugInfo}
                      </pre>
                      <p className="mt-2 text-xs text-gray-600">
                        Copie essas informações se precisar de ajuda adicional.
                      </p>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {loading && hasToken && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-800">
                Validando link de recuperação...
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || tokenValid === false}
                minLength={8}
                maxLength={128}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  A senha deve ter no mínimo 8 caracteres
                </p>
                {password && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength === "weak"
                            ? "bg-red-500 w-1/3"
                            : passwordStrength === "medium"
                            ? "bg-yellow-500 w-2/3"
                            : "bg-green-500 w-full"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {passwordStrength === "weak"
                        ? "Fraca"
                        : passwordStrength === "medium"
                        ? "Média"
                        : "Forte"}
                    </span>
                  </div>
                )}
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
                  <li className={password.length >= 8 ? "text-green-600" : ""}>
                    {password.length >= 8 ? "✓" : "○"} Mínimo 8 caracteres
                  </li>
                  <li className={password.length >= 12 ? "text-green-600" : ""}>
                    {password.length >= 12 ? "✓" : "○"} Recomendado: 12+ caracteres
                  </li>
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} Letra maiúscula
                  </li>
                  <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                    {/[a-z]/.test(password) ? "✓" : "○"} Letra minúscula
                  </li>
                  <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                    {/[0-9]/.test(password) ? "✓" : "○"} Número
                  </li>
                  <li className={/[^a-zA-Z0-9]/.test(password) ? "text-green-600" : ""}>
                    {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Símbolo especial
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || tokenValid === false}
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full cursor-pointer" 
              disabled={loading || tokenValid === false || !validatePasswordRequirements(password).valid || password !== confirmPassword}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redefinindo...
                </div>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
              className="text-sm cursor-pointer"
            >
              Voltar para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

