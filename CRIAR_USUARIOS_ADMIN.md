# 👥 **CRIAR USUÁRIOS ADMINISTRADORES**

## 🎯 **Usuários a Criar**

### **Admin 1 - César**
- **Email:** `cesar@temvenda.com.br`
- **Senha:** `admin`

### **Admin 2 - Davi**  
- **Email:** `davi@temvenda.com.br`
- **Senha:** `admin`

---

## 📋 **PASSO A PASSO - Supabase Dashboard**

### **1. Acesse o Supabase Dashboard**
1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto **TEM VENDA**

### **2. Navegue para Authentication**
1. No menu lateral, clique em **"Authentication"**
2. Clique na aba **"Users"**

### **3. Criar Usuário César**
1. Clique no botão **"Add user"** (verde)
2. Preencha os dados:
   ```
   Email: cesar@temvenda.com.br
   Password: admin
   ```
3. **IMPORTANTE:** Marque a caixa **"Email Confirm"** ✅
4. Clique em **"Create user"**

### **4. Criar Usuário Davi**
1. Clique novamente em **"Add user"**
2. Preencha os dados:
   ```
   Email: davi@temvenda.com.br
   Password: admin
   ```
3. **IMPORTANTE:** Marque a caixa **"Email Confirm"** ✅
4. Clique em **"Create user"**

### **5. Verificar Criação**
Após criar ambos, você deve ver na lista:
- ✅ `cesar@temvenda.com.br` - Status: **Confirmed**
- ✅ `davi@temvenda.com.br` - Status: **Confirmed**

---

## 🧪 **TESTAR LOGIN**

### **1. Acesse a aplicação**
- URL: `http://localhost:3000`
- Será redirecionado para `/login`

### **2. Teste com César**
```
Email: cesar@temvenda.com.br
Senha: admin
```
**Resultado esperado:** Login bem-sucedido → Redirecionamento para página principal

### **3. Teste com Davi**
```
Email: davi@temvenda.com.br  
Senha: admin
```
**Resultado esperado:** Login bem-sucedido → Redirecionamento para página principal

---

## 🔒 **IMPORTANTE - Segurança**

### **⚠️ Senhas Temporárias**
- As senhas `admin` são **temporárias**
- Os usuários devem alterar após o primeiro login
- Implementaremos "Esqueci senha" depois

### **✅ Próximos Passos**
1. **Agora:** Criar usuários no Supabase Dashboard
2. **Depois:** Implementar reset de senha
3. **Futuro:** Adicionar roles/permissões se necessário

---

## 🚨 **Se Der Problema**

### **"User already exists"**
- ✅ **Normal** - Usuário já foi criado
- 🔄 **Solução:** Usar "Esqueci senha" para redefinir

### **"Invalid credentials"**
- 🔍 **Verificar:** Email digitado corretamente
- 🔍 **Verificar:** Senha é exatamente `admin`
- 🔍 **Verificar:** Usuário existe no Supabase Dashboard

### **Não consegue acessar a aplicação**
- 🔍 **Verificar:** Supabase está configurado no `.env.local`
- 🔍 **Verificar:** Servidor está rodando
- 🔍 **Verificar:** Console do navegador para erros

---

## 📞 **Status Atual**

✅ **Scripts criados** - Para automação futura  
✅ **Documentação completa** - Instruções detalhadas  
✅ **Aplicação rodando** - Pronta para teste  
🔄 **Próximo:** Criar usuários no Supabase Dashboard  

**Agora é só seguir o passo a passo acima!** 🚀
