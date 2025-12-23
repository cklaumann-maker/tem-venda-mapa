# 🔒 Guia de Verificação de RLS Policies

## Como Verificar RLS no Supabase

1. Acesse o **SQL Editor** no painel do Supabase
2. Execute o script `sql/verificar_rls_policies.sql`
3. Revise os resultados

## Tabelas Críticas que DEVEM ter RLS

- ✅ `profiles` - Dados de usuários
- ✅ `stores` - Lojas
- ✅ `networks` (ou `orgs`) - Redes/Empresas
- ✅ `store_members` - Membros de lojas
- ✅ `user_invites` - Convites
- ✅ `zapi_config` - Configurações Z-API
- ✅ `store_tasks` - Tarefas
- ✅ `metas_mensais` - Metas (se existir)

## O que Verificar

1. **RLS Habilitado**: Todas as tabelas acima devem ter `rowsecurity = true`
2. **Policies por Operação**: Cada tabela deve ter policies para SELECT, INSERT, UPDATE, DELETE
3. **Isolamento por Usuário**: Policies devem usar `auth.uid()` para filtrar dados
4. **Isolamento por Rede/Loja**: Policies devem filtrar por `network_id` ou `store_id`

## Exemplo de Policy Segura

```sql
-- Exemplo: Policy para profiles (usuários só veem seus próprios dados ou da mesma rede)
CREATE POLICY "Users can view profiles in their network"
ON profiles FOR SELECT
USING (
  id = auth.uid() 
  OR network_id IN (
    SELECT network_id FROM profiles WHERE id = auth.uid()
  )
);
```

## Próximos Passos

Se alguma tabela não tiver RLS ou policies adequadas:
1. Habilitar RLS: `ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;`
2. Criar policies conforme necessário
3. Testar com diferentes usuários para garantir isolamento

