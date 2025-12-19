# 👥 Proposta: Sistema de Gestão de Usuários

## 🎯 Visão Geral

Sistema completo de criação, gerenciamento e recuperação de usuários seguindo as melhores práticas de mercado (similar a Slack, Notion, Asana).

---

## 🔐 1. PERMISSÕES DE CRIAÇÃO

### **Administradores (Admins)**
- ✅ Podem criar **qualquer tipo de usuário** (admin, manager, seller, etc.)
- ✅ Podem criar usuários em **qualquer empresa/loja**
- ✅ Podem gerenciar todos os usuários do sistema
- ✅ Acesso: `/configuracoes/acessos`

### **Gerentes (Managers)**
- ✅ Podem criar usuários **apenas nas lojas da sua empresa**
- ✅ Podem criar apenas usuários com permissões **inferiores** (seller, finance, etc.)
- ❌ **NÃO podem** criar outros managers ou admins
- ✅ Acesso: `/configuracoes/acessos` (versão limitada)

### **Outros Usuários**
- ❌ Não podem criar usuários

---

## 📋 2. FLUXO DE CRIAÇÃO DE USUÁRIOS

### **Opção A: Convite por Email (RECOMENDADO - Padrão de Mercado)**

#### **Passo 1: Admin/Gerente cria o usuário**
1. Acessa `/configuracoes/acessos`
2. Clica em "Convidar Usuário" ou "Novo Usuário"
3. Preenche formulário:
   - **Nome completo** (obrigatório)
   - **Email** (obrigatório, único)
   - **Cargo/Role** (admin, manager, seller, finance, etc.)
   - **Empresa** (se admin) ou **Loja** (se manager)
   - **Loja específica** (se aplicável)
4. Sistema envia **email de convite** automaticamente

#### **Passo 2: Usuário recebe email**
- Email contém:
  - Link de ativação único (válido por 7 dias)
  - Nome da empresa/loja
  - Quem convidou
  - Instruções de primeiro acesso

#### **Passo 3: Primeiro acesso**
1. Usuário clica no link do email
2. É redirecionado para `/ativar-conta?token=...`
3. Tela de ativação solicita:
   - **Definir senha** (mínimo 8 caracteres, com validação)
   - **Confirmar senha**
4. Após definir senha:
   - Conta é ativada
   - Email confirmado automaticamente
   - Redirecionado para login
   - Faz login com email + senha definida

#### **Vantagens:**
- ✅ Mais seguro (sem senha temporária)
- ✅ Email já confirmado
- ✅ Padrão de mercado (Slack, Notion, etc.)
- ✅ Usuário define sua própria senha

---

### **Opção B: Criação Direta com Senha Temporária (Alternativa)**

#### **Passo 1: Admin/Gerente cria o usuário**
1. Acessa `/configuracoes/acessos`
2. Preenche formulário:
   - Nome completo
   - Email
   - Cargo/Role
   - Empresa/Loja
   - **Senha temporária** (gerada automaticamente ou definida)
3. Sistema cria usuário e envia email com:
   - Senha temporária
   - Link para primeiro acesso
   - **Aviso para alterar senha no primeiro login**

#### **Passo 2: Primeiro acesso**
1. Usuário acessa `/login`
2. Faz login com email + senha temporária
3. Sistema detecta primeiro acesso e **força alteração de senha**
4. Tela de "Definir Nova Senha" aparece automaticamente
5. Após alterar, pode acessar o sistema

#### **Vantagens:**
- ✅ Mais rápido (sem esperar email)
- ✅ Útil para criação em massa
- ⚠️ Menos seguro (senha temporária)

---

## 🔄 3. RECUPERAÇÃO DE SENHA

### **Fluxo Completo:**

#### **Passo 1: Solicitar recuperação**
1. Usuário acessa `/login`
2. Clica em "Esqueci minha senha"
3. Informa **email**
4. Sistema envia email com link de redefinição

#### **Passo 2: Email de recuperação**
- Link único (válido por 1 hora)
- Instruções claras
- Botão "Redefinir Senha"

#### **Passo 3: Redefinir senha**
1. Usuário clica no link
2. Redirecionado para `/recuperar-senha?token=...`
3. Tela solicita:
   - **Nova senha** (mínimo 8 caracteres)
   - **Confirmar nova senha**
4. Após redefinir:
   - Senha atualizada
   - Token invalidado
   - Redirecionado para login
   - Pode fazer login com nova senha

---

## 🏗️ 4. ESTRUTURA TÉCNICA PROPOSTA

### **Tabelas do Banco de Dados:**

```sql
-- Tabela de convites (se usar Opção A)
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES orgs(id),
  store_id UUID REFERENCES stores(id),
  role TEXT NOT NULL, -- 'admin', 'manager', 'seller', etc.
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
```

### **Páginas/Componentes Necessários:**

1. **`/configuracoes/acessos`** - Gerenciar usuários
   - Lista de usuários
   - Botão "Convidar Usuário"
   - Formulário de criação
   - Edição de usuários
   - Desativar/Reativar usuários

2. **`/ativar-conta`** - Ativação de conta (primeiro acesso)
   - Validação de token
   - Formulário de definição de senha

3. **`/recuperar-senha`** - Recuperação de senha
   - Validação de token
   - Formulário de nova senha

4. **`/login`** - Melhorar página existente
   - Adicionar link "Esqueci minha senha"
   - Adicionar link "Reenviar convite" (se aplicável)

---

## 📧 5. TEMPLATES DE EMAIL

### **Email de Convite:**
```
Assunto: Você foi convidado para o TEM VENDA

Olá {nome},

Você foi convidado por {quem_convidou} para acessar o sistema TEM VENDA 
da empresa {empresa_nome}.

Para ativar sua conta e definir sua senha, clique no link abaixo:

[Ativar Conta] (link válido por 7 dias)

Se você não solicitou este convite, pode ignorar este email.

Atenciosamente,
Equipe TEM VENDA
```

### **Email de Recuperação de Senha:**
```
Assunto: Redefinir senha - TEM VENDA

Olá,

Você solicitou a redefinição de senha da sua conta TEM VENDA.

Clique no link abaixo para criar uma nova senha:

[Redefinir Senha] (link válido por 1 hora)

Se você não solicitou esta redefinição, ignore este email ou entre em contato conosco.

Atenciosamente,
Equipe TEM VENDA
```

---

## 🔒 6. SEGURANÇA E BOAS PRÁTICAS

### **Validações:**
- ✅ Email único no sistema
- ✅ Senha mínima de 8 caracteres
- ✅ Senha deve conter letras e números (recomendado)
- ✅ Tokens expiram automaticamente
- ✅ Tokens são únicos e não reutilizáveis
- ✅ Rate limiting em tentativas de login
- ✅ Logs de ações administrativas

### **Permissões:**
- ✅ RLS (Row Level Security) no Supabase
- ✅ Validação de permissões no backend
- ✅ Verificação de role antes de criar usuários

### **Auditoria:**
- ✅ Log de criação de usuários
- ✅ Log de alterações de senha
- ✅ Log de tentativas de login falhadas

---

## 🎨 7. INTERFACE PROPOSTA

### **Tela de Gerenciamento de Usuários (`/configuracoes/acessos`):**

```
┌─────────────────────────────────────────────────┐
│  👥 Perfis e Acessos                            │
│                                                 │
│  [➕ Convidar Usuário]                          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Filtros: [Todas as empresas ▼] [Loja ▼]  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Nome          │ Email        │ Cargo │ ... │ │
│  ├─────────────────────────────────────────────┤ │
│  │ João Silva    │ joao@...      │ Seller│ ... │ │
│  │ Maria Santos  │ maria@...     │ Manager│... │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### **Tela de Ativação (`/ativar-conta`):**

```
┌─────────────────────────────────────────────────┐
│  🎉 Bem-vindo ao TEM VENDA!                    │
│                                                 │
│  Você foi convidado por [Nome] para acessar     │
│  o sistema da empresa [Nome da Empresa].       │
│                                                 │
│  Para começar, defina sua senha:                │
│                                                 │
│  [Nova Senha: _______________]                  │
│  [Confirmar:   _______________]                 │
│                                                 │
│  [Ativar Conta]                                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 8. IMPLEMENTAÇÃO SUGERIDA (Ordem)

### **Fase 1: Base (Essencial)**
1. ✅ Página de gerenciamento de usuários
2. ✅ Formulário de criação (Opção A ou B)
3. ✅ Tela de ativação de conta
4. ✅ Tela de recuperação de senha
5. ✅ Melhorar página de login

### **Fase 2: Melhorias**
1. ✅ Templates de email personalizados
2. ✅ Reenvio de convites
3. ✅ Edição de usuários
4. ✅ Desativar/Reativar usuários

### **Fase 3: Avançado**
1. ✅ Logs de auditoria
2. ✅ Exportação de usuários
3. ✅ Importação em massa (CSV)
4. ✅ Políticas de senha configuráveis

---

## 💡 RECOMENDAÇÃO FINAL

**Sugestão: Implementar Opção A (Convite por Email)**

**Motivos:**
- ✅ Padrão de mercado (Slack, Notion, Asana, etc.)
- ✅ Mais seguro
- ✅ Melhor experiência do usuário
- ✅ Email já confirmado automaticamente
- ✅ Usuário define sua própria senha desde o início

**Permissões:**
- **Admins**: Podem criar qualquer usuário em qualquer empresa/loja
- **Managers**: Podem criar apenas usuários não-admin nas lojas da sua empresa

**Fluxo:**
1. Admin/Manager cria → Envia convite
2. Usuário recebe email → Clica no link
3. Define senha → Conta ativada → Login

Posso começar a implementar este sistema completo?

