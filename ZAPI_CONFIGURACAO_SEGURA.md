# 🔒 Configuração Segura da Z-API

## ✅ Solução Implementada

A solução permite que administradores editem os campos **Instância Z-API** e **Token Z-API** de forma segura, com criptografia e armazenamento protegido no Supabase.

## 🛡️ Medidas de Segurança

### 1. **Criptografia AES-256-GCM**
- Utiliza Web Crypto API do navegador
- Criptografia antes de salvar no banco de dados
- Chave de criptografia armazenada apenas em sessão (sessionStorage)
- Dados descriptografados apenas quando necessário

### 2. **Armazenamento Seguro no Supabase**
- Tabela `zapi_config` com Row Level Security (RLS)
- Apenas administradores podem visualizar/editar
- Campos sensíveis criptografados
- Histórico de quem criou/atualizou

### 3. **Validação e Confirmação**
- Validação de formato antes de salvar
- Confirmação do usuário antes de salvar dados sensíveis
- Feedback visual de erros e sucessos

## 📋 Como Configurar

### Passo 1: Criar Tabela no Supabase

Execute o script SQL no Supabase Dashboard:

1. Acesse o **SQL Editor** no Supabase
2. Execute o arquivo `scripts/create-zapi-config-table.sql`
3. Verifique se as políticas RLS foram criadas corretamente

### Passo 2: Configurar no Sistema

1. Acesse **Configurações → Integrações → Z-API**
2. Preencha os campos:
   - **Instância Z-API**: ID da sua instância
   - **Token Z-API**: Token de autenticação
   - **Client-Token** (opcional): Token sensível (será criptografado)
   - **Número WhatsApp**: Número do gerente
3. Clique em **Salvar Configurações**
4. Confirme a ação

### Passo 3: Testar

1. Clique em **Testar Z-API**
2. Verifique se a mensagem chegou no WhatsApp

## 🔐 Segurança em Camadas

### **Camada 1: Frontend**
- Criptografia AES-256-GCM antes de enviar
- Chave de sessão (apaga ao fechar navegador)
- Validação de dados antes de enviar

### **Camada 2: Banco de Dados**
- Row Level Security (RLS) no Supabase
- Apenas admins podem acessar
- Dados criptografados armazenados

### **Camada 3: API Route**
- Continua usando variável de ambiente para client-token padrão
- Pode ser atualizado para usar dados do banco (opcional)

## 📊 Estrutura da Tabela

```sql
zapi_config
├── id (UUID)
├── instance_id (TEXT) - ID da instância
├── token (TEXT) - Token da instância
├── client_token_encrypted (TEXT) - Client-token criptografado
├── manager_phone (TEXT) - Número do WhatsApp
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── created_by (UUID) - Referência ao usuário
└── updated_by (UUID) - Referência ao usuário
```

## ⚙️ Funcionalidades

### **Edição Segura**
- Campos editáveis apenas para administradores
- Validação em tempo real
- Confirmação antes de salvar
- Feedback visual de erros

### **Criptografia Automática**
- Client-token criptografado automaticamente
- Chave de sessão (não persiste)
- Descriptografia apenas quando necessário

### **Persistência**
- Dados salvos no Supabase
- Compatibilidade com localStorage (número do gerente)
- Recarregamento automático de configurações

## 🔄 Fluxo de Dados

```
1. Admin preenche campos → Frontend
2. Validação → Frontend
3. Criptografia → Frontend (Web Crypto API)
4. Salvamento → Supabase (com RLS)
5. Armazenamento → Banco de dados criptografado
6. Uso → Descriptografia apenas quando necessário
```

## ⚠️ Importante

### **Client-Token**
- Se fornecido no formulário: será criptografado e salvo no banco
- Se vazio: sistema usa `ZAPI_CLIENT_TOKEN` das variáveis de ambiente
- **Recomendação**: Manter client-token em variáveis de ambiente para máxima segurança

### **Backup**
- Faça backup periódico da tabela `zapi_config`
- Mantenha as chaves de acesso em local seguro

### **Auditoria**
- Tabela registra quem criou/atualizou cada configuração
- Campos `created_by` e `updated_by` para rastreabilidade

## 🚨 Troubleshooting

### **Erro ao salvar**
- Verifique se é administrador
- Confirme que a tabela foi criada no Supabase
- Verifique se as políticas RLS estão ativas

### **Erro de criptografia**
- Certifique-se de usar navegador moderno (suporte a Web Crypto API)
- Limpe o sessionStorage e tente novamente

### **Dados não carregam**
- Verifique permissões no Supabase
- Confirme que há um registro na tabela
- Verifique console do navegador para erros

## 📝 Notas

- A criptografia usa **AES-256-GCM** (padrão de criptografia moderna)
- Chave de sessão é gerada automaticamente
- Dados são descriptografados apenas quando necessário
- Sistema mantém compatibilidade com variáveis de ambiente

