# 🔍 Guia de Debug: Problemas com Link de Recuperação de Senha

Este guia ajuda a identificar e resolver problemas com links de recuperação de senha.

---

## 📋 Como Coletar Informações de Erro

### **Passo 1: Abrir o Console do Navegador**

1. Abra a página de recuperação de senha
2. Pressione **F12** (ou **Ctrl+Shift+I** no Windows/Linux, **Cmd+Option+I** no Mac)
3. Vá na aba **Console**

### **Passo 2: Copiar os Logs de Debug**

Quando você clicar no link do email, você verá logs que começam com `🔍 Debug`. Copie TODOS eles:

```
🔍 Debug - Verificando token...
🔍 Debug - URL atual: http://localhost:3000/recuperar-senha#access_token=...
🔍 Debug - Hash: #access_token=...&type=recovery
🔍 Debug - Resultado getUser: { hasUser: true, userEmail: "..." }
```

### **Passo 3: Informações para Enviar**

Envie as seguintes informações:

1. **URL completa do link** (pode mascarar o token se preferir):
   ```
   http://localhost:3000/recuperar-senha#access_token=...
   ```

2. **Logs do console** (todos os logs que começam com 🔍 Debug)

3. **Mensagem de erro exibida** na tela (se houver)

4. **Informações de debug** (se aparecer na tela, clique em "expandir")

---

## 🔧 Problemas Comuns e Soluções

### **Problema 1: "Link inválido ou expirado"**

**Possíveis causas:**
- Token expirou (válido por 1 hora)
- Token já foi usado (one-time use)
- Link foi cortado/alterado

**Solução:**
1. Solicite um novo link de recuperação
2. Use o link dentro de 1 hora
3. Verifique se o link completo foi copiado

**Debug:**
- Verifique no console se o hash está presente
- Verifique se `type=recovery` está no hash

---

### **Problema 2: Hash não está sendo processado**

**Sintoma:**
- Link parece correto mas não funciona
- Console mostra hash presente mas usuário não encontrado

**Solução:**
1. Verifique se a URL está correta no Supabase:
   - Supabase Dashboard → Authentication → Settings
   - **Site URL**: `http://localhost:3000` (dev) ou sua URL de produção
   - **Redirect URLs**: `http://localhost:3000/**` (dev) ou `https://seudominio.com/**` (prod)

2. Verifique se o hash está completo:
   ```
   #access_token=TOKEN_AQUI&type=recovery&expires_in=3600
   ```

---

### **Problema 3: Erro "User not found"**

**Possíveis causas:**
- Email não está cadastrado
- Usuário foi deletado
- Token foi gerado para outro email

**Solução:**
1. Verifique se o email está cadastrado no Supabase
2. Solicite um novo link
3. Verifique se está usando o email correto

---

### **Problema 4: Link não abre a página de reset**

**Possíveis causas:**
- URL de redirecionamento não configurada
- Link está quebrado
- Problema de navegação

**Solução:**
1. Verifique as configurações de Redirect URLs no Supabase
2. Teste o link em uma aba anônima
3. Verifique se há erros no console

---

## 🔍 Checklist de Debug

Antes de reportar o problema, verifique:

- [ ] Console do navegador aberto (F12)
- [ ] Logs de debug copiados
- [ ] URL completa do link copiada
- [ ] Mensagem de erro copiada
- [ ] Configurações do Supabase verificadas:
  - [ ] Site URL está correto
  - [ ] Redirect URLs inclui `/recuperar-senha`
  - [ ] SMTP está configurado
- [ ] Link foi usado dentro de 1 hora
- [ ] Link não foi usado anteriormente

---

## 📝 Formato para Reportar Problema

Use este formato ao reportar:

```
**URL do Link:**
[cole a URL aqui, pode mascarar o token]

**Logs do Console:**
[cole todos os logs que começam com 🔍 Debug]

**Mensagem de Erro:**
[cole a mensagem exibida na tela]

**Informações de Debug:**
[cole as informações de debug se aparecerem]

**Configurações:**
- Site URL no Supabase: [sua URL]
- Redirect URLs: [suas URLs]
- Ambiente: [desenvolvimento/produção]
```

---

## 🛠️ Soluções Rápidas

### **Solução Rápida 1: Limpar Cache e Tentar Novamente**

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Solicite um novo link
3. Use o link em uma aba anônima

### **Solução Rápida 2: Verificar Configurações do Supabase**

1. Acesse Supabase Dashboard
2. Vá em Authentication → Settings
3. Verifique:
   - Site URL: `http://localhost:3000` (dev)
   - Redirect URLs: `http://localhost:3000/**`
4. Salve as alterações
5. Solicite um novo link

### **Solução Rápida 3: Testar em Outro Navegador**

1. Tente em Chrome, Firefox ou Edge
2. Use modo anônimo/privado
3. Verifique se funciona

---

## 🔗 Links Úteis

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Password Reset](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Troubleshooting Supabase Auth](https://supabase.com/docs/guides/auth/troubleshooting)

---

## ✅ O que Foi Implementado para Ajudar

O sistema agora inclui:

- ✅ **Logs detalhados** no console para debug
- ✅ **Informações de debug** na tela (expansível)
- ✅ **Validação melhorada** do token
- ✅ **Suporte para hash fragments** (formato do Supabase)
- ✅ **Mensagens de erro claras** e informativas

---

**Com essas informações, conseguiremos identificar e resolver o problema rapidamente!** 🔍✨

