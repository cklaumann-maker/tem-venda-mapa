# 📧 Como Usar o Template no Supabase

Este guia mostra como copiar e colar o template HTML/CSS profissional no Supabase Dashboard.

---

## 📋 Passo a Passo

### **1. Acessar Configurações de Email no Supabase**

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Authentication** (menu lateral)
4. Clique em **Email Templates** (ou "Templates de Email")
5. Selecione **Reset password** (ou "Redefinir senha")

### **2. Configurar o Assunto (Subject)**

No campo **Subject**, cole:
```
Redefinir sua senha - TEM VENDA
```

Ou personalize:
```
Redefinir senha da sua conta TEM VENDA
```

### **3. Configurar o Corpo (Body)**

1. Clique na aba **Source** (para editar HTML)
2. **Delete todo o conteúdo** existente
3. Abra o arquivo `TEMPLATE_SUPABASE_RESET_PASSWORD.html`
4. **Copie TODO o conteúdo** do arquivo
5. **Cole no campo Body** do Supabase
6. Clique em **Save** (ou "Salvar")

### **4. Visualizar Preview**

1. Clique na aba **Preview** para ver como ficará
2. Verifique se o botão e o layout estão corretos
3. Teste em diferentes tamanhos de tela

---

## 🔧 Variáveis do Supabase

O template usa a variável do Supabase:
- `{{ .ConfirmationURL }}` - Link de confirmação/redefinição

**Importante:** Não altere `{{ .ConfirmationURL }}` - ela é substituída automaticamente pelo Supabase.

---

## ✅ Checklist

Antes de salvar, verifique:

- [ ] Subject configurado
- [ ] HTML completo copiado
- [ ] `{{ .ConfirmationURL }}` presente no template
- [ ] Preview visualizado
- [ ] Template salvo com sucesso

---

## 🧪 Testar o Template

### **1. Solicitar Recuperação de Senha**

1. Acesse `/recuperar-senha` na sua aplicação
2. Digite um email válido
3. Clique em "Enviar Link de Recuperação"

### **2. Verificar o Email**

1. Abra a caixa de entrada do email
2. Verifique se o email chegou
3. Confira se o design está correto
4. Teste o botão "Redefinir senha"
5. Verifique se o link funciona

---

## 🎨 Personalização

### **Alterar Cores**

No template, procure por:
```html
background-color: #16a34a;  /* Cor do botão (verde) */
```

Substitua `#16a34a` pela cor desejada.

### **Alterar Textos**

Edite os textos diretamente no HTML:
- "TEM VENDA" → Seu nome de empresa
- "Sistema de Gestão Comercial" → Sua descrição
- "suporte@temvenda.com.br" → Seu email de suporte

### **Alterar Footer**

Procure por:
```html
© 2025 TEM VENDA. Todos os direitos reservados.
```

Edite conforme necessário.

---

## 📝 Variáveis Disponíveis no Supabase

O Supabase oferece estas variáveis (além de `.ConfirmationURL`):

- `{{ .SiteURL }}` - URL do site
- `{{ .Email }}` - Email do usuário
- `{{ .Token }}` - Token de confirmação (não recomendado usar diretamente)
- `{{ .TokenHash }}` - Hash do token

**Nota:** Para recuperação de senha, use apenas `{{ .ConfirmationURL }}`.

---

## 🐛 Problemas Comuns

### **"Template não está funcionando"**

**Solução:**
- Verifique se copiou TODO o HTML
- Confirme que `{{ .ConfirmationURL }}` está presente
- Salve novamente o template

### **"Email não está chegando"**

**Solução:**
- Verifique configurações SMTP no Supabase
- Confira se o email não está na pasta de spam
- Teste com outro email

### **"Botão não funciona"**

**Solução:**
- Verifique se `{{ .ConfirmationURL }}` está no href do botão
- Teste o link alternativo (texto)
- Confira configurações de Redirect URLs no Supabase

### **"Design quebrado no mobile"**

**Solução:**
- O template já é responsivo
- Verifique se copiou todo o CSS
- Teste em diferentes clientes de email

---

## 🔗 Links Úteis

- [Documentação Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Dashboard](https://app.supabase.com)

---

## ✅ Próximos Passos

Após configurar:

1. **Teste** o fluxo completo de recuperação
2. **Verifique** se emails estão chegando
3. **Confira** se não estão indo para spam
4. **Personalize** cores e textos se desejar

---

**O template está pronto para uso no Supabase!** 📧✨

