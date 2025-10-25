# 🔐 Sistema de Autenticação

A aplicação TEM VENDA agora possui um sistema completo de autenticação integrado com Supabase.

## ✅ O que foi implementado

### 🔒 Proteção da Página Principal
- A página principal (`/`) agora está protegida
- Usuários não autenticados são automaticamente redirecionados para `/login`
- A página só é acessível após login bem-sucedido

### 📱 Tela de Login
- Design moderno e responsivo
- Formulário com email e senha
- Estados de loading e tratamento de erros
- Mensagens de erro em português

### 👤 Menu de Usuário
- Mostra o email do usuário logado
- Botão de logout no header
- Logout redireciona automaticamente para login

### 🛡️ Componentes de Proteção
- `ProtectedRoute`: Protege rotas privadas
- `useAuth`: Hook para gerenciar estado de autenticação
- Sessão persistente entre recarregamentos

## 🚀 Como usar

### 1. Configurar Supabase
Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 2. Configurar Authentication no Supabase
1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Authentication** > **Settings**
3. Configure os **Site URL** e **Redirect URLs**:
   - Site URL: `http://localhost:3000` (desenvolvimento)
   - Redirect URLs: `http://localhost:3000/**`

### 3. Criar usuários
No Supabase Dashboard:
1. Vá em **Authentication** > **Users**
2. Clique em **Add user**
3. Adicione email e senha para teste

### 4. Testar a aplicação
1. Inicie a aplicação: `npm run dev`
2. Acesse `http://localhost:3000`
3. Você será redirecionado para `/login`
4. Faça login com um usuário criado no Supabase
5. Será redirecionado para a página principal

## 🎯 Fluxo de Autenticação

### Usuário não logado:
1. Acessa `/` → Redirecionado para `/login`
2. Faz login → Redirecionado para `/`
3. Tem acesso completo à aplicação

### Usuário logado:
1. Acessa `/login` → Redirecionado para `/`
2. Vê email no header com botão de logout
3. Pode navegar livremente pela aplicação

### Logout:
1. Clica em "Sair" no header
2. Sessão é encerrada
3. Redirecionado para `/login`

## 🔧 Arquivos importantes

- `/src/components/auth/LoginForm.tsx` - Tela de login
- `/src/components/auth/ProtectedRoute.tsx` - Proteção de rotas
- `/src/components/auth/UserMenu.tsx` - Menu do usuário
- `/src/hooks/useAuth.ts` - Hook de autenticação
- `/src/app/login/page.tsx` - Página de login
- `/src/lib/supabaseClient.ts` - Cliente Supabase

## 🎨 Personalização

Para personalizar a tela de login, edite:
- `/src/components/auth/LoginForm.tsx` - Layout e estilos
- Cores e temas estão definidos no Tailwind CSS

## 🐛 Problemas comuns

1. **Erro "Supabase URL/Key ausentes"**
   - Verifique se o arquivo `.env.local` está na raiz
   - Confirme se as variáveis estão corretas

2. **Usuário não consegue logar**
   - Verifique se o usuário existe no Supabase
   - Confirme email e senha
   - Verifique configurações de Auth no Supabase

3. **Redirecionamentos não funcionam**
   - Verifique se as URLs estão configuradas no Supabase
   - Confirme se não há erros no console

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador para erros
2. Logs do Supabase Dashboard
3. Configurações de Auth no Supabase
