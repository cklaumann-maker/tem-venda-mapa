# 📋 Guia Passo a Passo - Sistema de Usuários

## ✅ O QUE JÁ ESTÁ FEITO (Você não precisa fazer nada)

### 1. **Código Implementado**
- ✅ Todos os componentes React criados
- ✅ Páginas de gerenciamento, ativação e recuperação
- ✅ API routes configuradas
- ✅ Serviços de email implementados
- ✅ Componentes UI (Badge, Alert, Table)
- ✅ Integração com Supabase Auth
- ✅ RLS Policies definidas no SQL

### 2. **Arquivos Criados**
- ✅ `src/components/configuracoes/GerenciarUsuariosView.tsx`
- ✅ `src/app/ativar-conta/page.tsx`
- ✅ `src/app/recuperar-senha/page.tsx`
- ✅ `src/app/api/email/send-invite/route.ts`
- ✅ `src/app/api/email/send-reset/route.ts`
- ✅ `src/app/api/users/create/route.ts`
- ✅ `src/lib/email.ts`
- ✅ `scripts/migrate-user-invites.sql`

---

## 🔧 O QUE VOCÊ PRECISA FAZER

### **PASSO 1: Aplicar Migration SQL** ⚠️ OBRIGATÓRIO

**O que fazer:**
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo `scripts/migrate-user-invites.sql`
6. Cole no editor SQL
7. Clique em **Run** (ou pressione Ctrl+Enter)

**Como verificar se funcionou:**
- Execute esta query no SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_invites';
```
- Se retornar `user_invites`, está OK ✅

**Tempo estimado:** 2-3 minutos

---

### **PASSO 2: Configurar Variáveis de Ambiente** ⚠️ OBRIGATÓRIO

**O que fazer:**

1. **Crie o arquivo `.env.local` na raiz do projeto** (se ainda não existir)

2. **Adicione estas variáveis:**

```env
# Já deve existir (verifique se estão corretas)
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima

# ADICIONAR ESTA (obtenha no Supabase Dashboard)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# OPCIONAL (para URLs de email funcionarem corretamente)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Como obter a `SUPABASE_SERVICE_ROLE_KEY`:**
   - Acesse: Supabase Dashboard > **Settings** (ícone de engrenagem)
   - Vá em **API**
   - Role: **service_role**
   - Copie a chave (ela começa com `eyJ...`)
   - ⚠️ **NUNCA compartilhe ou commite esta chave!**

4. **Reinicie o servidor Next.js:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Inicie novamente
   npm run dev
   ```

**Tempo estimado:** 3-5 minutos

---

### **PASSO 3: Configurar Envio de Emails** ⚠️ OBRIGATÓRIO PARA PRODUÇÃO

📖 **Guia Completo:** Veja `GUIA_CONFIGURACAO_SMTP_SUPABASE.md` para instruções detalhadas passo a passo.

**Resumo Rápido:**

1. Acesse: Supabase Dashboard > **Settings** > **Auth** > **SMTP Settings**
2. Ative "Enable Custom SMTP"
3. Escolha um provedor (recomendado: **Resend** - mais fácil):
   - **Resend** (gratuito até 3.000 emails/mês) ⭐ RECOMENDADO
   - **SendGrid** (gratuito até 100 emails/dia)
   - **AWS SES** (muito barato)
   - **Mailgun** (gratuito até 1.000 emails/mês)
4. Preencha as credenciais SMTP:
   - SMTP Host
   - SMTP Port (geralmente 587 ou 465)
   - SMTP User
   - SMTP Password
   - From Email (deve estar verificado no provedor)

**Para desenvolvimento/testes:**
- Por enquanto, os emails serão apenas logados no console
- Isso é suficiente para testar o fluxo completo
- Configure SMTP quando for para produção

**Tempo estimado:** 5-15 minutos (dependendo do provedor escolhido)

---

### **PASSO 4: Testar o Sistema** ✅ RECOMENDADO

**Teste 1: Criar um Convite**
1. Faça login como admin
2. Acesse `/configuracoes/acessos`
3. Clique em "Convidar Usuário"
4. Preencha:
   - Nome: Teste Usuário
   - Email: seu-email-de-teste@gmail.com
   - Cargo: Vendedor
   - Empresa: Selecione uma
5. Clique em "Enviar Convite"
6. Verifique o console do navegador (F12) - deve mostrar log do email

**Teste 2: Ativar Conta**
1. Verifique o email (ou use o token do console)
2. Acesse `/ativar-conta?token=TOKEN_AQUI`
3. Defina uma senha
4. Verifique se redireciona para login

**Teste 3: Recuperação de Senha**
1. Acesse `/recuperar-senha`
2. Digite um email válido
3. Verifique se recebe email (ou veja logs)

**Tempo estimado:** 10 minutos

---

## 📝 RESUMO RÁPIDO

### ✅ Já está pronto (não precisa fazer nada):
- Todo o código
- Componentes e páginas
- API routes
- Estrutura do banco (SQL pronto)

### ⚠️ Você precisa fazer (3 passos):

1. **Aplicar SQL** → Copiar `scripts/migrate-user-invites.sql` e executar no Supabase SQL Editor
2. **Configurar `.env.local`** → Adicionar `SUPABASE_SERVICE_ROLE_KEY`
3. **Configurar emails** → SMTP no Supabase OU usar Resend (opcional para testes)

---

## 🆘 PROBLEMAS COMUNS

### "Cannot apply migration in read-only mode"
- **Solução:** Execute o SQL manualmente no Supabase Dashboard > SQL Editor

### "SUPABASE_SERVICE_ROLE_KEY is not defined"
- **Solução:** Adicione a variável no `.env.local` e reinicie o servidor

### "Email não está sendo enviado"
- **Solução:** 
  - Em desenvolvimento: Verifique os logs no console (F12)
  - Em produção: Configure SMTP no Supabase ou use Resend

### "Erro ao criar usuário"
- **Solução:** Verifique se a migration SQL foi aplicada corretamente

---

## 📞 PRÓXIMOS PASSOS (Opcional)

Depois que tudo estiver funcionando:

- [ ] Configurar domínio de email personalizado
- [ ] Adicionar templates de email mais bonitos
- [ ] Configurar notificações por WhatsApp quando usuário é criado
- [ ] Adicionar logs de auditoria
- [ ] Implementar reenvio automático de convites

---

## ✅ CHECKLIST FINAL

Antes de considerar completo, verifique:

- [ ] Migration SQL aplicada com sucesso
- [ ] `.env.local` configurado com `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Servidor reiniciado após adicionar variáveis
- [ ] Teste de criação de convite funcionando
- [ ] Teste de ativação de conta funcionando
- [ ] Teste de recuperação de senha funcionando
- [ ] Emails sendo enviados (ou pelo menos logados)

---

**Tempo total estimado:** 15-25 minutos

**Dificuldade:** Fácil (apenas copiar/colar e configurar)
