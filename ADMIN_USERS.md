# 👥 Usuários Administradores - TEM VENDA

## 🔐 **Credenciais dos Administradores**

### **Admin 1 - César**
- **Email:** `cesar@temvenda.com.br`
- **Senha:** `admin` *(temporária)*
- **Função:** Administrador Total

### **Admin 2 - Davi**  
- **Email:** `davi@temvenda.com.br`
- **Senha:** `admin` *(temporária)*
- **Função:** Administrador Total

> ⚠️ **IMPORTANTE:** Essas senhas são temporárias e devem ser alteradas pelos usuários após o primeiro acesso através da funcionalidade "Esqueci minha senha".

---

## 🎯 **Como Criar os Usuários**

### **Método 1: Supabase Dashboard (RECOMENDADO)**

1. **Acesse** [Supabase Dashboard](https://app.supabase.com)
2. **Selecione** seu projeto TEM VENDA  
3. **Vá para** `Authentication` > `Users`
4. **Clique** em `Add user` (botão verde)
5. **Para cada usuário, preencha:**

   **Usuário César:**
   ```
   Email: cesar@temvenda.com.br
   Password: admin
   Email Confirm: ✅ (marcado)
   ```
   
   **Usuário Davi:**
   ```
   Email: davi@temvenda.com.br  
   Password: admin
   Email Confirm: ✅ (marcado)
   ```

6. **Clique** em `Create user` para cada um

### **Método 2: Script Automatizado**

**Pré-requisitos:**
- Ter `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env.local`
- Node.js instalado

**Passos:**

1. **Configure a Service Role Key** no `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

2. **Execute o script:**
   ```bash
   cd scripts
   npm install
   npm run create-users
   ```

**Para obter a Service Role Key:**
1. Supabase Dashboard > Settings > API
2. Copie a `service_role` key (secret key)

---

## ✅ **Verificação**

Após criar os usuários, verifique no **Supabase Dashboard**:

1. `Authentication` > `Users`
2. Confirme que aparecem 2 usuários:
   - `cesar@temvenda.com.br` 
   - `davi@temvenda.com.br`
3. Status deve estar `Confirmed` ✅

---

## 🧪 **Testando o Login**

1. **Acesse:** `http://localhost:3000/login`
2. **Teste com:**
   - Email: `cesar@temvenda.com.br`  
   - Senha: `admin`
3. **Deveria:** Redirecionar para página principal
4. **Repita** para o usuário Davi

---

## 🔒 **Segurança**

### **Imediatamente após criação:**
- ✅ Usuários podem fazer login
- ⚠️ Senhas são temporárias (`admin`)
- 🔄 Implementar "Esqueci senha" depois

### **Próximos passos de segurança:**
1. **Implementar** reset de senha
2. **Forçar** alteração no primeiro login  
3. **Adicionar** roles/permissions se necessário
4. **Configurar** políticas RLS no Supabase

---

## 🎯 **Estrutura de Arquivos Criada**

```
📦 tem-venda-mapa/
├── 📁 scripts/
│   ├── 📄 create-admin-users.js    ← Script de criação
│   └── 📄 package.json             ← Dependências do script
└── 📄 ADMIN_USERS.md               ← Esta documentação
```

---

## 🚨 **Troubleshooting**

### **Problema: "User already exists"**
- ✅ **Normal** - Usuário já foi criado
- 🔄 **Solução:** Usar "Esqueci senha" para redefinir

### **Problema: "Invalid credentials"**  
- 🔍 **Verificar:** Email digitado corretamente
- 🔍 **Verificar:** Senha é exatamente `admin`
- 🔍 **Verificar:** Usuário existe no Supabase Dashboard

### **Problema: Não consegue criar via script**
- 🔍 **Verificar:** Service Role Key está correta
- 🔍 **Verificar:** Variáveis de ambiente no `.env.local`  
- 💡 **Alternativa:** Usar Supabase Dashboard (Método 1)

---

## 📞 **Suporte**

Se tiver problemas:
1. **Verifique** se o Supabase está configurado  
2. **Confirme** variáveis de ambiente
3. **Use** Supabase Dashboard como alternativa
4. **Verifique** console do navegador para erros

**Status atual:** ✅ Instruções prontas para criação dos usuários administrativos!
