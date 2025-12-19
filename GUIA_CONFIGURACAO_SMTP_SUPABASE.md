# 📧 Guia Completo: Configurar SMTP no Supabase

Este guia mostra como configurar o envio de emails no Supabase usando diferentes provedores SMTP.

---

## 🎯 Por que configurar SMTP?

O Supabase precisa de um servidor SMTP para enviar:
- ✅ Emails de confirmação de conta
- ✅ Emails de recuperação de senha
- ✅ Emails de convite de usuário
- ✅ Notificações do sistema

**Sem SMTP configurado:** Os emails não serão enviados e os usuários não conseguirão ativar contas ou recuperar senhas.

---

## 📍 Onde Configurar no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** (ícone de engrenagem no menu lateral)
4. Clique em **Auth** no menu de configurações
5. Role até a seção **SMTP Settings**

---

## 🔧 Opções de Provedores SMTP

### **Opção 1: Resend (RECOMENDADO - Mais Fácil)** ⭐

**Vantagens:**
- ✅ Gratuito até 3.000 emails/mês
- ✅ Configuração muito simples
- ✅ API moderna e confiável
- ✅ Dashboard intuitivo

**Passo a Passo:**

1. **Criar conta no Resend:**
   - Acesse [resend.com](https://resend.com)
   - Clique em "Sign Up" (pode usar GitHub)
   - Confirme seu email

2. **Obter credenciais SMTP:**
   - No dashboard do Resend, vá em **Settings** > **SMTP**
   - Você verá:
     - **SMTP Host:** `smtp.resend.com`
     - **SMTP Port:** `465` (SSL) ou `587` (TLS)
     - **SMTP User:** `resend`
     - **SMTP Password:** (sua API key - começa com `re_`)

3. **Configurar no Supabase:**
   - **Enable Custom SMTP:** Ative o toggle
   - **Sender email:** Use um email verificado no Resend (ex: `noreply@seudominio.com`)
   - **Sender name:** Nome que aparecerá (ex: "TEM VENDA")
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (recomendado) ou `587`
   - **Username:** `resend`
   - **Password:** Cole sua API key do Resend
   - **Secure:** Marque como `true` (SSL/TLS)

4. **Verificar domínio (opcional mas recomendado):**
   - No Resend, vá em **Domains**
   - Adicione seu domínio
   - Configure os registros DNS conforme instruções
   - Isso permite usar emails do seu domínio (ex: `noreply@seudominio.com`)
   - 📖 **Guia Completo:** Veja `GUIA_RESEND_DOMINIO_WORDPRESS.md` para instruções detalhadas sobre como configurar domínio hospedado no WordPress

**Tempo estimado:** 5-10 minutos

---

### **Opção 2: SendGrid**

**Vantagens:**
- ✅ Gratuito até 100 emails/dia
- ✅ Confiável e popular
- ✅ Boa documentação

**Passo a Passo:**

1. **Criar conta no SendGrid:**
   - Acesse [sendgrid.com](https://sendgrid.com)
   - Crie uma conta gratuita
   - Complete a verificação

2. **Criar API Key:**
   - Vá em **Settings** > **API Keys**
   - Clique em "Create API Key"
   - Dê um nome (ex: "Supabase SMTP")
   - Selecione permissão "Full Access" ou "Mail Send"
   - Copie a API key (só aparece uma vez!)

3. **Obter credenciais SMTP:**
   - Vá em **Settings** > **SMTP Relay**
   - Você verá:
     - **SMTP Host:** `smtp.sendgrid.net`
     - **SMTP Port:** `587`
     - **SMTP User:** `apikey`
     - **SMTP Password:** (a API key que você criou)

4. **Configurar no Supabase:**
   - **Enable Custom SMTP:** Ative
   - **Sender email:** Use um email verificado no SendGrid
   - **Sender name:** Nome desejado
   - **Host:** `smtp.sendgrid.net`
   - **Port:** `587`
   - **Username:** `apikey`
   - **Password:** Cole sua API key do SendGrid
   - **Secure:** `true`

**Tempo estimado:** 10-15 minutos

---

### **Opção 3: AWS SES (Amazon Simple Email Service)**

**Vantagens:**
- ✅ Muito barato ($0.10 por 1.000 emails)
- ✅ Escalável
- ✅ Confiável

**Desvantagens:**
- ⚠️ Configuração mais complexa
- ⚠️ Requer conta AWS

**Passo a Passo:**

1. **Criar conta AWS:**
   - Acesse [aws.amazon.com](https://aws.amazon.com)
   - Crie uma conta (se não tiver)
   - Acesse o console AWS

2. **Configurar SES:**
   - Procure por "SES" (Simple Email Service)
   - Vá em **SMTP Settings**
   - Clique em "Create SMTP Credentials"
   - Dê um nome (ex: "Supabase")
   - Baixe as credenciais (salve em local seguro!)

3. **Verificar email ou domínio:**
   - Vá em **Verified identities**
   - Clique em "Create identity"
   - Escolha "Email address" ou "Domain"
   - Siga as instruções de verificação

4. **Obter credenciais SMTP:**
   - Vá em **SMTP Settings**
   - Você verá:
     - **SMTP Host:** (varia por região, ex: `email-smtp.us-east-1.amazonaws.com`)
     - **SMTP Port:** `587` ou `465`
     - **SMTP User:** (o usuário que você criou)
     - **SMTP Password:** (a senha que você baixou)

5. **Configurar no Supabase:**
   - **Enable Custom SMTP:** Ative
   - **Sender email:** Use o email verificado no SES
   - **Host:** Cole o host do SES (da sua região)
   - **Port:** `587`
   - **Username:** Cole o usuário SMTP
   - **Password:** Cole a senha SMTP
   - **Secure:** `true`

**Tempo estimado:** 20-30 minutos

---

### **Opção 4: Gmail (Apenas para Testes)** ⚠️

**Atenção:** Gmail não é recomendado para produção, apenas para testes rápidos.

**Limitações:**
- ⚠️ Apenas 500 emails/dia
- ⚠️ Pode ser bloqueado se usar muito
- ⚠️ Requer "App Password" (não funciona com senha normal)

**Passo a Passo:**

1. **Ativar verificação em 2 etapas:**
   - Acesse [myaccount.google.com](https://myaccount.google.com)
   - Vá em **Segurança**
   - Ative "Verificação em duas etapas"

2. **Criar App Password:**
   - Ainda em **Segurança**, procure por "Senhas de app"
   - Clique em "Senhas de app"
   - Selecione "Email" e "Outro (nome personalizado)"
   - Digite "Supabase" e clique em "Gerar"
   - **Copie a senha** (16 caracteres, sem espaços)

3. **Configurar no Supabase:**
   - **Enable Custom SMTP:** Ative
   - **Sender email:** Seu email Gmail completo
   - **Sender name:** Nome desejado
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** Seu email Gmail completo
   - **Password:** A senha de app que você gerou (16 caracteres)
   - **Secure:** `true`

**Tempo estimado:** 5 minutos

---

### **Opção 5: Mailgun**

**Vantagens:**
- ✅ Gratuito até 5.000 emails/mês (primeiros 3 meses)
- ✅ Depois: 1.000 emails/mês grátis
- ✅ Boa para produção

**Passo a Passo:**

1. **Criar conta no Mailgun:**
   - Acesse [mailgun.com](https://mailgun.com)
   - Crie uma conta
   - Verifique seu email

2. **Obter credenciais SMTP:**
   - No dashboard, vá em **Sending** > **Domain Settings**
   - Selecione seu domínio (ou crie um)
   - Vá em **SMTP credentials**
   - Você verá:
     - **SMTP Host:** `smtp.mailgun.org`
     - **SMTP Port:** `587` ou `465`
     - **SMTP User:** (seu usuário SMTP)
     - **SMTP Password:** (sua senha SMTP)

3. **Configurar no Supabase:**
   - **Enable Custom SMTP:** Ative
   - **Sender email:** Use um email do seu domínio verificado
   - **Host:** `smtp.mailgun.org`
   - **Port:** `587`
   - **Username:** Cole o usuário SMTP
   - **Password:** Cole a senha SMTP
   - **Secure:** `true`

**Tempo estimado:** 10-15 minutos

---

## ✅ Como Testar se Está Funcionando

### **Teste 1: Email de Recuperação de Senha**

1. No Supabase Dashboard, vá em **Authentication** > **Users**
2. Clique em um usuário existente
3. Clique em "Send password reset email"
4. Verifique se o email chegou na caixa de entrada

### **Teste 2: Criar Novo Usuário**

1. No Supabase Dashboard, vá em **Authentication** > **Users**
2. Clique em "Add user"
3. Preencha email e senha
4. Marque "Auto Confirm User" como **desmarcado**
5. Clique em "Create user"
6. O usuário deve receber um email de confirmação

### **Teste 3: Via API (se estiver usando no código)**

1. Use a funcionalidade de convite de usuário na sua aplicação
2. Verifique se o email é enviado
3. Verifique os logs no console do navegador (F12)

---

## 🐛 Problemas Comuns e Soluções

### **"SMTP connection failed"**

**Possíveis causas:**
- Credenciais incorretas
- Porta errada
- Firewall bloqueando

**Soluções:**
- ✅ Verifique se copiou as credenciais corretamente (sem espaços extras)
- ✅ Tente a porta alternativa (587 ou 465)
- ✅ Verifique se "Secure" está marcado como `true`
- ✅ Teste as credenciais em um cliente de email (Outlook, Thunderbird)

### **"Email não está sendo enviado"**

**Possíveis causas:**
- SMTP não está habilitado
- Email do remetente não verificado
- Limite de emails atingido

**Soluções:**
- ✅ Verifique se "Enable Custom SMTP" está ativado
- ✅ Verifique se o email do remetente está verificado no provedor
- ✅ Verifique os limites do seu plano (gratuito tem limites)

### **"Emails indo para spam"**

**Soluções:**
- ✅ Configure SPF, DKIM e DMARC no seu domínio
- ✅ Use um domínio verificado (não email genérico)
- ✅ Evite palavras que parecem spam no assunto/corpo
- ✅ Use um provedor confiável (Resend, SendGrid)

### **"Gmail bloqueando emails"**

**Soluções:**
- ✅ Não use Gmail para produção
- ✅ Use Resend ou SendGrid
- ✅ Configure domínio próprio

---

## 📊 Comparação Rápida de Provedores

| Provedor | Plano Grátis | Facilidade | Recomendado Para |
|----------|--------------|------------|------------------|
| **Resend** | 3.000/mês | ⭐⭐⭐⭐⭐ | Iniciantes e produção |
| **SendGrid** | 100/dia | ⭐⭐⭐⭐ | Produção |
| **Mailgun** | 1.000/mês | ⭐⭐⭐⭐ | Produção |
| **AWS SES** | $0.10/1.000 | ⭐⭐⭐ | Alta escala |
| **Gmail** | 500/dia | ⭐⭐⭐ | Apenas testes |

---

## 🎯 Recomendação Final

**Para começar rapidamente:**
👉 Use **Resend** - É o mais fácil e tem um bom plano gratuito

**Para produção:**
👉 Use **Resend** ou **SendGrid** - Ambos são confiáveis e fáceis

**Para alta escala:**
👉 Use **AWS SES** - Mais barato em grandes volumes

---

## 📝 Checklist de Configuração

Antes de considerar completo:

- [ ] Conta criada no provedor SMTP escolhido
- [ ] Credenciais SMTP obtidas
- [ ] SMTP configurado no Supabase Dashboard
- [ ] "Enable Custom SMTP" ativado
- [ ] Email do remetente verificado
- [ ] Teste de envio realizado com sucesso
- [ ] Email recebido na caixa de entrada (não spam)

---

## 🔗 Links Úteis

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Resend - SMTP Setup](https://resend.com/docs/send-with-smtp)
- [SendGrid - SMTP Relay](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)
- [AWS SES - SMTP](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)

---

**Tempo total estimado:** 5-30 minutos (dependendo do provedor)

**Dificuldade:** Fácil a Média

