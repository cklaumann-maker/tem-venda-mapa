# 🚀 **DEPLOY NA VERCEL - TEM VENDA**

## ✅ **Vercel CLI Configurado**

**Status:** Vercel CLI 48.6.0 instalado e pronto para uso!

## 🔐 **Login na Vercel**

**Acesse:** https://vercel.com/oauth/device?user_code=ZMNK-NTRF

1. **Abra** o link no navegador
2. **Faça login** com sua conta Vercel
3. **Autorize** o acesso
4. **Volte** ao terminal e pressione ENTER

## 🚀 **Deploy para Produção**

### **Passo 1: Fazer Deploy**
```bash
npx vercel --prod
```

### **Passo 2: Configurar Variáveis de Ambiente**

Após o deploy, configure no **Vercel Dashboard**:

1. **Acesse:** [Vercel Dashboard](https://vercel.com/dashboard)
2. **Selecione** seu projeto TEM VENDA
3. **Vá para:** Settings → Environment Variables
4. **Adicione:**

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### **Passo 3: Configurar Supabase para Produção**

1. **Supabase Dashboard** → Authentication → Settings
2. **Site URL:** `https://seu-projeto.vercel.app`
3. **Redirect URLs:** `https://seu-projeto.vercel.app/**`

## 🎯 **Vantagens da Vercel**

### ✅ **Deploy Automático**
- Conecta com GitHub
- Deploy automático a cada push
- Preview de branches

### ✅ **Otimização Next.js**
- Build otimizado automaticamente
- Edge functions
- CDN global

### ✅ **Variáveis de Ambiente**
- Interface visual para configurar
- Diferentes ambientes (dev, preview, production)
- Segurança automática

### ✅ **Domínio Personalizado**
- Subdomínio gratuito: `seu-projeto.vercel.app`
- Domínio customizado (opcional)
- SSL automático

## 📋 **Checklist de Deploy**

### **Antes do Deploy:**
- ✅ Código commitado localmente
- ✅ Usuários admin criados no Supabase
- ✅ Aplicação testada localmente
- ✅ Logo funcionando

### **Durante o Deploy:**
- 🔄 Fazer login na Vercel
- 🔄 Executar `npx vercel --prod`
- 🔄 Configurar variáveis de ambiente
- 🔄 Configurar Supabase para produção

### **Após o Deploy:**
- ✅ Testar login em produção
- ✅ Verificar redirecionamentos
- ✅ Testar responsividade
- ✅ Verificar performance

## 🔧 **Comandos Úteis**

```bash
# Deploy para produção
npx vercel --prod

# Deploy para preview
npx vercel

# Ver logs
npx vercel logs

# Ver domínios
npx vercel domains

# Remover deploy
npx vercel remove
```

## 🎉 **Resultado Esperado**

Após o deploy, você terá:

- **URL de produção:** `https://tem-venda-mapa.vercel.app`
- **Sistema de login** funcionando
- **Usuários admin** com acesso
- **Logo TEM VENDA** em produção
- **Performance otimizada**

## 📞 **Próximos Passos**

1. **Completar** login na Vercel
2. **Executar** `npx vercel --prod`
3. **Configurar** variáveis de ambiente
4. **Testar** aplicação em produção
5. **Configurar** Supabase para produção

**Status:** ✅ Pronto para deploy na Vercel! 🚀
