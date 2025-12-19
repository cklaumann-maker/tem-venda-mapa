# ✅ Implementação: Sistema de Gestão de Usuários (Opção A - Convite por Email)

## 📋 O que foi implementado

### 1. **Banco de Dados**
- ✅ Migration SQL criada: `scripts/migrate-user-invites.sql`
- ✅ Tabela `user_invites` para gerenciar convites
- ✅ Campos adicionais em `profiles` (first_login_completed, password_changed_at, etc.)
- ✅ RLS Policies configuradas
- ✅ Funções SQL para geração de tokens

### 2. **Páginas e Componentes**

#### **Gerenciamento de Usuários** (`/configuracoes/acessos`)
- ✅ Interface completa para criar convites
- ✅ Lista de convites pendentes/usados/expirados
- ✅ Reenvio de convites
- ✅ Exclusão de convites
- ✅ Permissões baseadas em roles (Admin/Manager)

#### **Ativação de Conta** (`/ativar-conta`)
- ✅ Página de ativação via token
- ✅ Validação de token e expiração
- ✅ Definição de senha no primeiro acesso
- ✅ Criação automática de usuário e perfil

#### **Recuperação de Senha** (`/recuperar-senha`)
- ✅ Solicitação de recuperação por email
- ✅ Redefinição de senha via token
- ✅ Integração com Supabase Auth

#### **Login Melhorado** (`/login`)
- ✅ Link funcional para recuperação de senha
- ✅ Mensagens de sucesso após ativação/reset

### 3. **Serviços e APIs**

#### **Serviço de Email** (`src/lib/email.ts`)
- ✅ Função para envio de emails de convite
- ✅ Função para envio de emails de recuperação
- ✅ Templates HTML responsivos

#### **API Routes**
- ✅ `/api/email/send-invite` - Envio de email de convite
- ✅ `/api/email/send-reset` - Envio de email de recuperação
- ✅ `/api/users/create` - Criação de usuário (usa service role key)

### 4. **Componentes UI**
- ✅ `Badge` - Para exibir roles e status
- ✅ `Alert` - Para mensagens de erro/sucesso
- ✅ `Table` - Para listagem de convites

---

## 🚀 Como Aplicar

### **Passo 1: Aplicar Migration SQL**

Execute o script SQL no Supabase:

```bash
# Acesse o Supabase Dashboard > SQL Editor
# Execute o conteúdo de: scripts/migrate-user-invites.sql
```

Ou via CLI:
```bash
supabase db push
```

### **Passo 2: Configurar Variáveis de Ambiente**

Adicione ao seu `.env.local`:

```env
# Já deve existir
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ADICIONAR (obtenha no Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OPCIONAL (para URLs de email)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # ou sua URL de produção
```

**⚠️ IMPORTANTE:** A `SUPABASE_SERVICE_ROLE_KEY` é sensível e deve ser mantida em segredo. Nunca commite no repositório.

### **Passo 3: Configurar Envio de Emails**

#### **Opção A: Usar Supabase Auth (Padrão)**
O Supabase já envia emails de recuperação de senha automaticamente. Para emails de convite, você precisa:

1. **Configurar SMTP no Supabase** (recomendado para produção):
   - Acesse: Supabase Dashboard > Settings > Auth > SMTP Settings
   - Configure seu provedor de email (SendGrid, AWS SES, etc.)

2. **OU usar um serviço externo** (Resend, SendGrid, etc.):
   - Edite `src/app/api/email/send-invite/route.ts`
   - Integre com o serviço escolhido
   - Exemplo com Resend:
   ```typescript
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);
   await resend.emails.send({
     from: 'noreply@seuapp.com',
     to,
     subject,
     html,
   });
   ```

#### **Opção B: Usar Edge Function (Avançado)**
Crie uma Edge Function no Supabase para envio de emails customizados.

---

## 📖 Como Usar

### **Para Administradores:**

1. **Criar Convite:**
   - Acesse `/configuracoes/acessos`
   - Clique em "Convidar Usuário"
   - Preencha: Nome, Email, Cargo, Empresa, Loja (opcional)
   - Clique em "Enviar Convite"
   - Sistema envia email automaticamente

2. **Gerenciar Convites:**
   - Veja lista de convites pendentes/usados/expirados
   - Reenvie convites expirados
   - Exclua convites desnecessários

### **Para Usuários Convidados:**

1. **Receber Email:**
   - Email com link de ativação (válido por 7 dias)

2. **Ativar Conta:**
   - Clique no link do email
   - Defina uma senha (mínimo 8 caracteres)
   - Confirme a senha
   - Conta é ativada automaticamente
   - Redirecionado para login

3. **Fazer Login:**
   - Use email + senha definida
   - Acesse o sistema

### **Recuperação de Senha:**

1. **Solicitar Recuperação:**
   - Acesse `/login`
   - Clique em "Esqueceu sua senha?"
   - Digite seu email
   - Receba email com link de recuperação

2. **Redefinir Senha:**
   - Clique no link do email (válido por 1 hora)
   - Defina nova senha
   - Confirme a senha
   - Redirecionado para login

---

## 🔐 Permissões

### **Administradores:**
- ✅ Criar qualquer tipo de usuário (admin, manager, seller, etc.)
- ✅ Criar usuários em qualquer empresa/loja
- ✅ Ver todos os convites do sistema
- ✅ Gerenciar todos os usuários

### **Gerentes:**
- ✅ Criar usuários apenas na sua empresa
- ✅ Criar apenas usuários com permissões inferiores (seller, finance, leader)
- ❌ NÃO podem criar admins ou managers
- ✅ Ver apenas convites da sua empresa

### **Outros Usuários:**
- ❌ Não podem criar usuários

---

## 🧪 Testar

### **1. Teste de Criação de Convite:**
```bash
# 1. Faça login como admin
# 2. Acesse /configuracoes/acessos
# 3. Crie um convite para um email de teste
# 4. Verifique se o email foi enviado (ou logs no console)
```

### **2. Teste de Ativação:**
```bash
# 1. Use o link do email de convite
# 2. Defina uma senha
# 3. Verifique se a conta foi criada
# 4. Faça login com email + senha
```

### **3. Teste de Recuperação:**
```bash
# 1. Acesse /recuperar-senha
# 2. Digite um email válido
# 3. Verifique se o email foi enviado
# 4. Use o link para redefinir senha
```

---

## ⚠️ Notas Importantes

1. **Service Role Key:** Necessária para criar usuários via API. Mantenha em segredo.

2. **Emails:** Por padrão, os emails de convite são logados no console. Para produção, configure SMTP ou use um serviço externo.

3. **Tokens:** Tokens de convite expiram em 7 dias. Tokens de recuperação expiram em 1 hora.

4. **RLS Policies:** As políticas de segurança estão configuradas. Teste as permissões antes de ir para produção.

5. **Primeiro Acesso:** Usuários devem definir senha no primeiro acesso. O campo `first_login_completed` é atualizado automaticamente.

---

## 🔄 Próximos Passos (Opcional)

- [ ] Integrar com serviço de email real (Resend, SendGrid, etc.)
- [ ] Adicionar notificações por WhatsApp quando usuário é criado
- [ ] Adicionar logs de auditoria para criação de usuários
- [ ] Implementar reenvio automático de convites expirados
- [ ] Adicionar validação de força de senha
- [ ] Implementar 2FA (autenticação de dois fatores)

---

## 📚 Arquivos Criados/Modificados

### **Novos Arquivos:**
- `scripts/migrate-user-invites.sql`
- `src/lib/email.ts`
- `src/components/configuracoes/GerenciarUsuariosView.tsx`
- `src/app/ativar-conta/page.tsx`
- `src/app/recuperar-senha/page.tsx`
- `src/app/api/email/send-invite/route.ts`
- `src/app/api/email/send-reset/route.ts`
- `src/app/api/users/create/route.ts`
- `src/components/ui/badge.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/table.tsx`

### **Arquivos Modificados:**
- `src/app/(protected)/configuracoes/acessos/page.tsx`
- `src/components/auth/LoginForm.tsx`

---

## ✅ Status

**Implementação completa e pronta para uso!**

Apenas configure as variáveis de ambiente e aplique a migration SQL para começar a usar.

