# 🌐 Configurar Resend com Domínio Hospedado no WordPress

Este guia mostra como configurar o Resend para enviar emails usando seu próprio domínio (ex: `noreply@seudominio.com.br`) quando seu domínio está hospedado no WordPress.

---

## 🎯 Por que usar seu próprio domínio?

**Vantagens:**
- ✅ Emails mais profissionais (ex: `noreply@seudominio.com.br` em vez de `noreply@resend.dev`)
- ✅ Maior taxa de entrega (menos chance de ir para spam)
- ✅ Melhor reputação do domínio
- ✅ Marca consistente em todos os emails

---

## 📋 Pré-requisitos

- ✅ Conta no Resend criada
- ✅ Acesso ao painel de controle da hospedagem do WordPress
- ✅ Acesso para editar registros DNS do domínio
- ✅ Domínio ativo e funcionando

---

## 🔧 Passo a Passo Completo

### **PASSO 1: Adicionar Domínio no Resend**

1. **Acesse o Resend Dashboard:**
   - Vá em [resend.com](https://resend.com)
   - Faça login na sua conta

2. **Adicionar Domínio:**
   - No menu lateral, clique em **Domains**
   - Clique no botão **Add Domain** (ou "Adicionar Domínio")
   - Digite seu domínio (ex: `seudominio.com.br`)
   - ⚠️ **NÃO inclua** `www` ou `http://` - apenas o domínio: `seudominio.com.br`
   - Clique em **Add Domain**

3. **Ver os Registros DNS Necessários:**
   - Após adicionar, o Resend mostrará uma página com os registros DNS que você precisa adicionar
   - Você verá algo como:
     ```
     Tipo: TXT
     Nome: @
     Valor: v=spf1 include:resend.com ~all
     
     Tipo: TXT
     Nome: resend._domainkey
     Valor: [uma string longa com chaves]
     ```
   - **IMPORTANTE:** Anote ou deixe esta página aberta - você precisará desses valores!

---

### **PASSO 2: Acessar o Painel DNS da Hospedagem WordPress**

O WordPress em si não gerencia DNS - você precisa acessar o painel da sua **hospedagem** (onde o domínio está registrado).

**Onde encontrar:**
- Se você comprou o domínio junto com a hospedagem WordPress: painel da hospedagem
- Se comprou separadamente: painel do registrador de domínio

**Hospedagens comuns no Brasil:**
- **Hostinger** → Painel hPanel
- **HostGator** → cPanel
- **Locaweb** → Painel Locaweb
- **KingHost** → Painel KingHost
- **UOL Host** → Painel UOL
- **GoDaddy** → Painel GoDaddy

**Como encontrar:**
1. Acesse o site da sua hospedagem
2. Faça login no painel de controle
3. Procure por:
   - **"DNS"** ou **"Gerenciar DNS"**
   - **"Zona DNS"**
   - **"Registros DNS"**
   - **"DNS Management"**

---

### **PASSO 3: Adicionar Registros DNS**

Você precisa adicionar **2 registros TXT** que o Resend forneceu.

#### **3.1. Registro SPF (Sender Policy Framework)**

**O que fazer:**
1. No painel DNS da hospedagem, clique em **"Adicionar Registro"** ou **"Add Record"**
2. Selecione o tipo: **TXT**
3. Preencha:
   - **Nome/Host:** `@` ou deixe em branco (depende da hospedagem)
     - Algumas hospedagens usam `@` para o domínio raiz
     - Outras usam apenas deixar em branco
     - Se não funcionar, tente `seudominio.com.br` (sem www)
   - **Valor/Conteúdo:** Cole o valor SPF que o Resend forneceu
     - Geralmente é: `v=spf1 include:resend.com ~all`
   - **TTL:** Deixe o padrão (geralmente 3600 ou 1 hora)
4. Salve o registro

**Exemplo visual:**
```
Tipo: TXT
Nome: @
Valor: v=spf1 include:resend.com ~all
TTL: 3600
```

#### **3.2. Registro DKIM (DomainKeys Identified Mail)**

**O que fazer:**
1. Adicione outro registro **TXT**
2. Preencha:
   - **Nome/Host:** `resend._domainkey` (exatamente como o Resend mostrou)
     - ⚠️ Algumas hospedagens podem pedir apenas `resend._domainkey`
     - Outras podem pedir `resend._domainkey.seudominio.com.br`
     - Teste primeiro sem o domínio completo
   - **Valor/Conteúdo:** Cole o valor DKIM completo que o Resend forneceu
     - É uma string longa, algo como: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...`
   - **TTL:** Deixe o padrão
3. Salve o registro

**Exemplo visual:**
```
Tipo: TXT
Nome: resend._domainkey
Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... (string longa)
TTL: 3600
```

---

### **PASSO 4: Verificar no Resend**

1. **Aguarde a propagação DNS:**
   - Pode levar de **5 minutos a 48 horas**
   - Geralmente leva **15-30 minutos**
   - Você pode verificar o status no Resend

2. **Verificar Status:**
   - No Resend Dashboard, vá em **Domains**
   - Clique no seu domínio
   - Você verá o status de cada registro:
     - ✅ **Verified** (Verificado) - Tudo certo!
     - ⏳ **Pending** (Pendente) - Ainda propagando, aguarde
     - ❌ **Failed** (Falhou) - Verifique se os registros estão corretos

3. **Testar Envio:**
   - Quando ambos os registros estiverem **Verified**, você pode testar
   - No Resend, vá em **Emails** > **Send Test Email**
   - Use um email do seu domínio (ex: `noreply@seudominio.com.br`)

---

## 🎨 Exemplos por Hospedagem

### **Hostinger (hPanel)**

1. Acesse hPanel
2. Vá em **Domains** > **Gerenciar DNS**
3. Clique em **Adicionar Registro**
4. Tipo: **TXT**
5. Nome: `@` (para domínio raiz)
6. Valor: Cole o valor do Resend
7. TTL: 3600
8. Salve

### **HostGator (cPanel)**

1. Acesse cPanel
2. Vá em **Zone Editor** ou **Advanced DNS Zone Editor**
3. Clique em **Add Record**
4. Tipo: **TXT**
5. Name: `@` ou deixe em branco
6. TXT Data: Cole o valor
7. TTL: 3600
8. Salve

### **Locaweb**

1. Acesse o Painel Locaweb
2. Vá em **Domínios** > **Gerenciar DNS**
3. Clique em **Adicionar Registro**
4. Tipo: **TXT**
5. Nome: `@`
6. Valor: Cole o valor
7. Salve

### **GoDaddy**

1. Acesse o Painel GoDaddy
2. Vá em **Meus Produtos** > **DNS**
3. Clique em **Adicionar**
4. Tipo: **TXT**
5. Nome: `@`
6. Valor: Cole o valor
7. TTL: 1 hora
8. Salve

---

## 🐛 Problemas Comuns e Soluções

### **"Registro não está sendo verificado"**

**Possíveis causas:**
- DNS ainda não propagou (aguarde mais tempo)
- Nome do registro está incorreto
- Valor do registro está incorreto (espaços extras, aspas, etc.)

**Soluções:**
- ✅ Aguarde até 48 horas para propagação completa
- ✅ Verifique se copiou o valor exatamente como o Resend mostrou
- ✅ Remova espaços extras no início/fim do valor
- ✅ Verifique se o nome está correto (`@` ou `resend._domainkey`)
- ✅ Use ferramentas online para verificar:
  - [MXToolbox](https://mxtoolbox.com/TXTLookup.aspx) - Digite seu domínio
  - [DNS Checker](https://dnschecker.org) - Verifica propagação global

### **"Não encontro onde adicionar registros DNS"**

**Soluções:**
- ✅ Procure por "DNS", "Zona DNS", "Gerenciar DNS" no painel
- ✅ Se não encontrar, entre em contato com o suporte da hospedagem
- ✅ Pergunte: "Onde adiciono registros TXT no DNS do meu domínio?"

### **"O nome do registro não aceita @ ou resend._domainkey"**

**Soluções:**
- ✅ Tente deixar em branco (algumas hospedagens usam isso para domínio raiz)
- ✅ Tente `seudominio.com.br` (sem www)
- ✅ Para DKIM, tente `resend._domainkey.seudominio.com.br`
- ✅ Consulte a documentação da sua hospedagem

### **"Já existe um registro SPF"**

**Solução:**
- ✅ Você precisa **editar** o registro SPF existente, não criar um novo
- ✅ Adicione `include:resend.com` ao registro existente
- ✅ Exemplo: Se você tem `v=spf1 include:_spf.google.com ~all`
- ✅ Mude para: `v=spf1 include:_spf.google.com include:resend.com ~all`
- ✅ ⚠️ **Nunca tenha dois registros SPF** - sempre edite o existente!

### **"Emails ainda vão para spam"**

**Soluções:**
- ✅ Configure também o registro DMARC (opcional mas recomendado)
- ✅ Use um email profissional (ex: `noreply@seudominio.com.br`)
- ✅ Evite palavras que parecem spam no assunto
- ✅ Aguarde alguns dias para o domínio ganhar reputação

---

## 📝 Adicionar Registro DMARC (Opcional mas Recomendado)

O DMARC ajuda a proteger seu domínio e melhorar a entrega. É opcional, mas recomendado.

**Como adicionar:**

1. No painel DNS, adicione um novo registro **TXT**
2. Preencha:
   - **Nome:** `_dmarc`
   - **Valor:** `v=DMARC1; p=none; rua=mailto:admin@seudominio.com.br`
     - Substitua `admin@seudominio.com.br` pelo seu email
3. Salve

**Explicação:**
- `p=none` - Apenas monitora (não bloqueia nada)
- Depois de alguns dias, você pode mudar para `p=quarantine` ou `p=reject`

---

## ✅ Checklist Final

Antes de considerar completo:

- [ ] Domínio adicionado no Resend
- [ ] Registro SPF adicionado no DNS
- [ ] Registro DKIM adicionado no DNS
- [ ] Ambos os registros aparecem como **Verified** no Resend
- [ ] Teste de envio realizado com sucesso
- [ ] Email recebido na caixa de entrada (não spam)
- [ ] Registro DMARC adicionado (opcional)

---

## 🔗 Links Úteis

- [Documentação Resend - Domains](https://resend.com/docs/dashboard/domains/introduction)
- [MXToolbox - Verificar DNS](https://mxtoolbox.com)
- [DNS Checker - Verificar Propagação](https://dnschecker.org)

---

## 📞 Precisa de Ajuda?

Se tiver dificuldades:

1. **Verifique a documentação da sua hospedagem** sobre DNS
2. **Entre em contato com o suporte da hospedagem** - eles podem ajudar a adicionar os registros
3. **Use ferramentas online** para verificar se os registros estão corretos
4. **Aguarde a propagação DNS** - pode levar até 48 horas

---

**Tempo total estimado:** 15-30 minutos (mais tempo de propagação DNS)

**Dificuldade:** Média (requer acesso ao painel DNS)



