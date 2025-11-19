"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, PlugZap, CheckCircle2, ArrowLeft, Save, Loader2 } from "lucide-react";
import { useZApi } from "@/lib/zapi";
import { useStore } from "@/contexts/StoreContext";
import { useRouter } from "next/navigation";
import { loadZApiConfig, saveZApiConfig, validateZApiConfig, getDecryptedClientToken, type ZApiConfig } from "@/lib/zapiConfig";
import { encrypt } from "@/lib/encryption";

export default function ZApiView() {
  const { isAdmin } = useStore();
  const router = useRouter();
  const { testConnection, isLoading: zapiLoading } = useZApi();
  
  // Estados dos campos
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [managerPhone, setManagerPhone] = useState('5551982813505');
  
  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carrega configuração do banco de dados
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Verifica se o Supabase está configurado
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Variáveis de ambiente do Supabase não configuradas. Não é possível carregar configurações salvas.');
        // Valores padrão se não houver configuração salva
        setInstanceId(process.env.NEXT_PUBLIC_ZAPI_INSTANCE || '');
        setToken(process.env.NEXT_PUBLIC_ZAPI_TOKEN || '');
        setClientToken('');
        return;
      }

      const config = await loadZApiConfig();
      
      if (config) {
        // Garante que instance_id e token não sejam emails ou valores inválidos
        const instanceIdValue = config.instance_id || '';
        const tokenValue = config.token || '';
        
        // Valida que não são emails (verifica se contém @)
        const validInstanceId = instanceIdValue && !instanceIdValue.includes('@') ? instanceIdValue : '';
        const validToken = tokenValue && !tokenValue.includes('@') ? tokenValue : '';
        
        setInstanceId(validInstanceId);
        setToken(validToken);
        
        // Client-token descriptografado - sempre oculto
        if (config.client_token_encrypted) {
          const decrypted = await getDecryptedClientToken(config.client_token_encrypted);
          // Preenche com o valor descriptografado (mas sempre será mostrado como senha)
          // Valida que não é email
          const validClientToken = decrypted && !decrypted.includes('@') ? decrypted : '';
          setClientToken(validClientToken);
        } else {
          // Se não houver client-token salvo, verifica variável de ambiente como fallback
          // Mas ainda assim o usuário precisa preencher (campo obrigatório)
          setClientToken('');
        }
        setManagerPhone(config.manager_phone || '5551982813505');
        
        // Salva no localStorage para compatibilidade
        localStorage.setItem('managerPhone', config.manager_phone || '5551982813505');
      } else {
        // Valores padrão se não houver configuração salva
        setInstanceId(process.env.NEXT_PUBLIC_ZAPI_INSTANCE || '');
        setToken(process.env.NEXT_PUBLIC_ZAPI_TOKEN || '');
        setClientToken('');
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      // Em caso de erro, tenta valores padrão
      setInstanceId(process.env.NEXT_PUBLIC_ZAPI_INSTANCE || '');
      setToken(process.env.NEXT_PUBLIC_ZAPI_TOKEN || '');
      setClientToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setErrors([]);
    setSuccess(false);

    // Validação
    const validation = validateZApiConfig({
      instance_id: instanceId,
      token: token,
      client_token_encrypted: clientToken,
      manager_phone: managerPhone,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Confirmação antes de salvar
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Você está prestes a salvar configurações sensíveis da Z-API.\n\n' +
      'Certifique-se de que os dados estão corretos antes de continuar.\n\n' +
      'Deseja continuar?'
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      // Valida que o client-token foi preenchido
      if (!clientToken || clientToken.trim().length === 0) {
        setErrors(['Client-Token Z-API é obrigatório']);
        setSaving(false);
        return;
      }

      // Criptografa o client-token antes de salvar
      const encryptedClientToken = await encrypt(clientToken.trim());

      await saveZApiConfig({
        instance_id: instanceId.trim(),
        token: token.trim(),
        client_token_encrypted: encryptedClientToken,
        manager_phone: managerPhone.trim(),
      });

      // Salva no localStorage para compatibilidade
      localStorage.setItem('managerPhone', managerPhone.trim());

      setSuccess(true);
      setHasChanges(false);
      
      // Limpa mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      setErrors([error.message || 'Erro ao salvar configuração. Tente novamente.']);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = () => {
    setHasChanges(true);
    setSuccess(false);
    setErrors([]);
  };

  // Se não for admin, mostra mensagem de acesso restrito
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-dashed border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Acesso Restrito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Apenas administradores podem acessar as configurações de integrações.</p>
            <Button
              variant="outline"
              onClick={() => router.push("/configuracoes/integracoes")}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Integrações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/configuracoes/integracoes")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <PlugZap className="w-8 h-8 text-emerald-600" />
            Z-API
          </h1>
          <p className="text-gray-600 mt-2">Configure a integração com WhatsApp via Z-API para envio de notificações</p>
        </div>
      </div>

      {/* Z-API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <PlugZap className="w-5 h-5 text-emerald-600" />
            Configurações Z-API
          </CardTitle>
          <CardDescription>
            Configure a integração com WhatsApp via Z-API para envio de notificações e mensagens automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-gray-600">Carregando configurações...</span>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Erros encontrados:</p>
                      <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Configurações salvas com sucesso!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Os dados foram salvos de forma segura no banco de dados.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="instance-id">Instância Z-API *</Label>
                <Input 
                  id="instance-id"
                  name="zapi-instance-id"
                  type="text"
                  autoComplete="off"
                  value={instanceId}
                  onChange={(e) => {
                    setInstanceId(e.target.value);
                    handleFieldChange();
                  }}
                  placeholder="3E5617B992C1A1A44BE92AC1CE4E084C"
                  className="bg-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID da instância da sua conta Z-API (será criptografado ao salvar)
                </p>
              </div>

              <div>
                <Label htmlFor="token">Token Z-API *</Label>
                <Input 
                  id="token"
                  name="zapi-token"
                  type="text"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    handleFieldChange();
                  }}
                  placeholder="965006A3DBD3AE6A5ACF05EF"
                  className="bg-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token de autenticação da instância (será criptografado ao salvar)
                </p>
              </div>

              <div>
                <Label htmlFor="client-token">Client-Token Z-API *</Label>
                <Input 
                  id="client-token"
                  name="zapi-client-token"
                  type="password"
                  autoComplete="new-password"
                  value={clientToken}
                  onChange={(e) => {
                    setClientToken(e.target.value);
                    handleFieldChange();
                  }}
                  placeholder="Digite o client-token (sempre oculto)"
                  className="bg-white font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token sensível obrigatório (sempre oculto por segurança). Será criptografado com AES-256-GCM antes de salvar no banco de dados.
                </p>
              </div>

              <div>
                <Label htmlFor="manager-phone">Número WhatsApp (Gerentes)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="manager-phone"
                    value={managerPhone}
                    onChange={(e) => {
                      setManagerPhone(e.target.value);
                      handleFieldChange();
                    }}
                    placeholder="5551982813505"
                    className="bg-white flex-1"
                  />
                  <Button
                    onClick={() => {
                      setManagerPhone('5551982813505');
                      handleFieldChange();
                    }}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Resetar
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Número padrão: 5551982813505. Altere conforme necessário.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasChanges || !instanceId.trim() || !token.trim() || !clientToken.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  onClick={loadConfiguration}
                  variant="outline"
                  disabled={saving || loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Recarregar"
                  )}
                </Button>
              </div>

              {hasChanges && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    ⚠️ Você tem alterações não salvas. Clique em "Salvar Configurações" para aplicar.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <PlugZap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Teste a integração Z-API
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Use o botão abaixo para enviar uma mensagem de teste e verificar se a integração está funcionando corretamente. 
                    O teste usará os dados preenchidos acima ou, se não estiverem preenchidos, os dados salvos no banco de dados.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={async () => {
                try {
                  // Primeiro tenta usar os dados preenchidos nos campos
                  let testInstanceId = instanceId.trim();
                  let testToken = token.trim();
                  let testClientToken = clientToken.trim();
                  let testPhone = managerPhone.trim() || '5551982813505';

                  // Se algum campo não estiver preenchido, tenta buscar do banco de dados
                  if (!testInstanceId || !testToken || !testClientToken) {
                    try {
                      // Verifica se o Supabase está configurado antes de tentar buscar
                      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                      
                      // Só tenta buscar do banco se o Supabase estiver configurado
                      if (supabaseUrl && supabaseKey && supabaseUrl.length > 0 && supabaseKey.length > 0) {
                        try {
                          const savedConfig = await loadZApiConfig();
                          if (savedConfig) {
                            // Usa dados salvos se os campos não estiverem preenchidos
                            if (!testInstanceId && savedConfig.instance_id) {
                              testInstanceId = savedConfig.instance_id;
                            }
                            if (!testToken && savedConfig.token) {
                              testToken = savedConfig.token;
                            }
                            if (!testClientToken && savedConfig.client_token_encrypted) {
                              const decrypted = await getDecryptedClientToken(savedConfig.client_token_encrypted);
                              if (decrypted) {
                                testClientToken = decrypted;
                              }
                            }
                            // Usa número salvo
                            if (savedConfig.manager_phone) {
                              testPhone = savedConfig.manager_phone;
                            }
                          }
                        } catch (dbError: any) {
                          // Erro ao buscar do banco - ignora silenciosamente e continua
                          // Não logar detalhes do erro para evitar exposição de dados sensíveis
                          console.warn('Não foi possível buscar dados salvos do banco de dados');
                        }
                      }
                    } catch (error: any) {
                      // Erro geral - ignora e continua com dados disponíveis
                      // Não logar detalhes do erro para evitar exposição de dados sensíveis
                      console.warn('Erro ao tentar carregar configuração');
                    }
                  }

                  // Após buscar do banco, verifica o que temos
                  // Não bloqueia - deixa a API route tentar buscar do banco ou usar variáveis de ambiente
                  // A API route fará a validação final e retornará erro se realmente não tiver dados
                  
                  if (!testInstanceId || !testToken || !testClientToken) {
                    console.log('Alguns campos não estão preenchidos. A API route tentará buscar do banco de dados ou usar variáveis de ambiente.');
                    // Nunca logar informações sobre client-token
                    console.log('Dados disponíveis:', {
                      hasInstanceId: !!testInstanceId,
                      hasToken: !!testToken,
                      hasClientToken: '***' // Nunca expor se existe ou não
                    });
                  }

                  // Testa a conexão com os dados disponíveis, passando a configuração
                  const config = {
                    instanceId: testInstanceId,
                    token: testToken,
                    clientToken: testClientToken
                  };
                  
                  const success = await testConnection(testPhone, config);
                  if (success) {
                    alert(`✅ Teste Z-API bem-sucedido! Mensagem enviada para ${testPhone}. Verifique seu WhatsApp!`);
                  } else {
                    alert(`❌ Erro no teste Z-API para ${testPhone}. Verifique o console para detalhes.\n\nMas se você recebeu a mensagem no WhatsApp, a Z-API está funcionando!`);
                  }
                } catch (error) {
                  console.error('Erro ao realizar teste Z-API:', error);
                  alert(`❌ Erro ao realizar teste Z-API. Verifique o console para detalhes.`);
                }
              }}
              disabled={zapiLoading || loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {zapiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <PlugZap className="w-4 h-4 mr-2" />
                  Testar Z-API
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Documentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            Para mais informações sobre a configuração da Z-API, consulte a documentação oficial em{" "}
            <a 
              href="https://developer.z-api.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              developer.z-api.io
            </a>
          </p>
          <p className="text-xs text-blue-700 mt-2">
            O Client-Token é sempre oculto (como uma senha) e criptografado antes de ser salvo no banco de dados. 
            Apenas administradores podem visualizar e editar essas configurações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

