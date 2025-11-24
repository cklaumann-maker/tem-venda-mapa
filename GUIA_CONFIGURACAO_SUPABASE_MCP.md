# 🔧 Guia Completo: Configuração do Supabase MCP Server no Cursor

## 📋 O que é o Supabase MCP Server?

O Supabase MCP Server permite que o Cursor (e outros assistentes de IA) se conectem diretamente ao seu projeto Supabase para:
- ✅ Verificar estrutura do banco de dados
- ✅ Verificar políticas RLS
- ✅ Executar queries SQL
- ✅ Gerar tipos TypeScript
- ✅ Ver logs e avisos de segurança
- ✅ Gerenciar migrações

## 🎯 Pré-requisitos

1. **Conta no Supabase** (já tem)
2. **Projeto Supabase criado** (já tem)
3. **Cursor instalado** (já tem)
4. **Project Reference ID** do seu projeto Supabase

## 📝 Passo 1: Encontrar o Project Reference ID

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** (⚙️) → **General**
4. Procure por **Reference ID** ou **Project ID**
5. Copie o ID (exemplo: `abcdefghijklmnop`)

**Alternativa:** O Project ID também aparece na URL do projeto:
```
https://supabase.com/dashboard/project/abcdefghijklmnop
                                    ^^^^^^^^^^^^^^^^
                                    Este é o Project ID
```

## 🔐 Passo 2: Configurar no Cursor

### Opção A: Via Interface do Cursor (Recomendado)

1. **Abra o Cursor**
2. Pressione `Ctrl + ,` (ou `Cmd + ,` no Mac) para abrir as configurações
3. No menu lateral, procure por **"MCP"** ou **"Model Context Protocol"**
4. Clique em **"Add new MCP Server"** ou **"+"**
5. Preencha os campos:

   **Nome:** `supabase` (ou qualquer nome que preferir)
   
   **Tipo:** Selecione `http` ou `HTTP`
   
   **URL:** Cole a URL abaixo, substituindo `<SEU-PROJECT-ID>` pelo seu Project ID:
   ```
   https://mcp.supabase.com/mcp?project_ref=<SEU-PROJECT-ID>&read_only=true
   ```
   
   **Exemplo completo:**
   ```
   https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnop&read_only=true
   ```

6. Clique em **"Save"** ou **"Salvar"**

### Opção B: Via Arquivo de Configuração

1. **Localize o arquivo de configuração do Cursor:**
   - **Windows:** `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - **Mac:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - **Linux:** `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2. **Abra o arquivo** (crie se não existir)

3. **Adicione a configuração:**
   ```json
   {
     "mcpServers": {
       "supabase": {
         "type": "http",
         "url": "https://mcp.supabase.com/mcp?project_ref=<SEU-PROJECT-ID>&read_only=true"
       }
     }
   }
   ```

4. **Substitua `<SEU-PROJECT-ID>`** pelo seu Project ID real

5. **Salve o arquivo**

6. **Reinicie o Cursor**

## 🔑 Passo 3: Autenticação OAuth

Na primeira vez que usar o MCP Server:

1. O Cursor abrirá automaticamente uma janela do navegador
2. Você será redirecionado para fazer login no Supabase
3. Faça login com suas credenciais
4. **Escolha a organização** que contém o projeto que você quer usar
5. Autorize o acesso ao Cursor
6. A janela fechará automaticamente

**Nota:** Você só precisa fazer isso uma vez. O token será salvo automaticamente.

## ⚙️ Passo 4: Configurações de Segurança (Recomendado)

### Parâmetros da URL

Você pode adicionar parâmetros à URL para maior segurança:

#### 1. **Read-Only Mode** (Recomendado)
```
?read_only=true
```
- ✅ Executa queries como usuário read-only
- ✅ Previne operações de escrita acidentais
- ✅ Mais seguro para desenvolvimento

#### 2. **Project Scoping** (Recomendado)
```
?project_ref=<SEU-PROJECT-ID>
```
- ✅ Limita acesso a apenas um projeto
- ✅ Previne acesso acidental a outros projetos
- ✅ Mais seguro

#### 3. **Feature Groups** (Opcional)
```
?features=database,docs,debugging
```
- ✅ Controla quais ferramentas estão disponíveis
- ✅ Reduz superfície de ataque
- ✅ Grupos disponíveis: `account`, `docs`, `database`, `debugging`, `development`, `functions`, `storage`, `branching`

### URL Completa Recomendada

```
https://mcp.supabase.com/mcp?project_ref=<SEU-PROJECT-ID>&read_only=true&features=database,docs,debugging,development
```

**Exemplo:**
```
https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnop&read_only=true&features=database,docs,debugging,development
```

## ✅ Passo 5: Verificar se Funcionou

Após configurar, você pode testar:

1. **No Cursor**, inicie uma conversa comigo
2. **Peça para verificar** algo no banco de dados, por exemplo:
   - "Liste todas as tabelas do banco de dados"
   - "Verifique as políticas RLS da tabela forms"
   - "Mostre a estrutura da tabela employees"

3. **Se funcionar**, você verá que eu tenho acesso direto ao seu Supabase!

## 🛡️ Boas Práticas de Segurança

### ✅ **FAÇA:**
- ✅ Use `read_only=true` por padrão
- ✅ Use `project_ref` para limitar a um projeto
- ✅ Use apenas em projetos de desenvolvimento
- ✅ Revise sempre as queries antes de executar
- ✅ Mantenha o Cursor atualizado

### ❌ **NÃO FAÇA:**
- ❌ Não conecte a projetos de produção
- ❌ Não desative o modo read-only sem necessidade
- ❌ Não compartilhe suas credenciais
- ❌ Não dê acesso a clientes/usuários finais

## 🔍 Troubleshooting

### Problema: "Failed to connect"
**Solução:**
- Verifique se o Project ID está correto
- Verifique sua conexão com a internet
- Tente fazer login novamente no Supabase

### Problema: "Authentication failed"
**Solução:**
- Feche e reabra o Cursor
- Tente fazer login novamente
- Verifique se você tem permissões no projeto

### Problema: "Read-only user cannot execute"
**Solução:**
- Isso é esperado! O modo read-only previne escritas
- Se precisar fazer alterações, remova `&read_only=true` temporariamente
- **CUIDADO:** Sempre revise antes de executar

### Problema: "Project not found"
**Solução:**
- Verifique se o Project ID está correto
- Verifique se você tem acesso ao projeto
- Verifique se o projeto não foi pausado

## 📚 Ferramentas Disponíveis

Após configurar, eu poderei usar:

### Database
- `list_tables` - Listar todas as tabelas
- `execute_sql` - Executar queries SQL
- `list_migrations` - Ver migrações aplicadas
- `apply_migration` - Aplicar migrações (se não read-only)

### Development
- `generate_typescript_types` - Gerar tipos TypeScript
- `get_project_url` - Obter URL da API
- `get_publishable_keys` - Obter chaves da API

### Debugging
- `get_logs` - Ver logs do projeto
- `get_advisors` - Ver avisos de segurança/performance

### Docs
- `search_docs` - Buscar na documentação do Supabase

## 🎯 Exemplo de Uso

Depois de configurar, você pode me pedir:

```
"Verifique se todas as políticas RLS estão criadas no Supabase"
```

E eu poderei:
1. Listar todas as tabelas
2. Verificar políticas RLS de cada tabela
3. Identificar políticas faltando
4. Sugerir correções

## 📝 Checklist de Configuração

- [ ] Encontrei o Project ID do Supabase
- [ ] Configurei o MCP Server no Cursor
- [ ] Fiz login e autorizei o acesso
- [ ] Adicionei `read_only=true` na URL
- [ ] Adicionei `project_ref` na URL
- [ ] Testei a conexão pedindo para listar tabelas
- [ ] Funcionou! ✅

## 🆘 Precisa de Ajuda?

Se tiver problemas:
1. Verifique os logs do Cursor
2. Tente reiniciar o Cursor
3. Verifique se o projeto Supabase está ativo
4. Consulte a [documentação oficial](https://supabase.com/docs/guides/mcp)

---

**Pronto!** Agora você pode me pedir para verificar diretamente o seu banco de dados Supabase! 🚀

