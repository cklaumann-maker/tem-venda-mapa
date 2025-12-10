# Migração: Estrutura Empresas → Lojas

## Resumo da Mudança

O sistema foi atualizado para suportar uma hierarquia de **Empresas → Lojas**, permitindo:
- Cada empresa ter uma ou mais lojas
- Visualização de rede (todas as lojas da empresa)
- Visualização de loja (apenas a loja selecionada)
- Permissões diferenciadas por tipo de usuário

## Estrutura do Banco de Dados

### Tabelas Existentes
- `orgs` (empresas/organizações)
- `stores` (lojas) - já possui `org_id` apontando para `orgs`

### Migração SQL

Execute o script `scripts/migrate-companies-stores.sql` para:
1. Garantir que todas as stores tenham `org_id`
2. Tornar `org_id` obrigatório (NOT NULL)
3. Adicionar índices para performance

## Mudanças no Código

### 1. StoreContext Atualizado

O `StoreContext` agora gerencia:
- **Empresas** (`companies`)
- **Lojas** (`stores`) filtradas por empresa
- **Modo de visualização** (`viewMode`): `"network"` ou `"store"`
- **Helper** `getStoreIdsForQuery()` para obter IDs baseado no modo

### 2. Componente StoreSelector

Novo componente `StoreSelector` que permite:
- Selecionar empresa (se houver mais de uma)
- Selecionar loja
- Alternar entre modo "Rede" e "Loja" (apenas para gerentes/admins)

### 3. Permissões

- **Usuários comuns**: Veem apenas sua loja (modo "store" fixo)
- **Gerentes/Owners**: Podem alternar entre rede e loja
- **Admins**: Veem todas as empresas/lojas, podem filtrar

## Como Usar

### Em Componentes

```typescript
import { useStore } from "@/contexts/StoreContext";

function MeuComponente() {
  const {
    currentCompanyId,
    currentStoreId,
    viewMode,
    getStoreIdsForQuery,
    canViewNetwork,
  } = useStore();

  // Obter IDs de lojas para query baseado no modo
  const storeIds = getStoreIdsForQuery();
  
  // Query com filtro
  const { data } = await supabase
    .from("minha_tabela")
    .select("*")
    .in("store_id", storeIds || []);
}
```

### Atualizar Queries Existentes

Substitua:
```typescript
// ANTES
.eq("store_id", currentStoreId)

// DEPOIS
const storeIds = getStoreIdsForQuery();
if (storeIds) {
  .in("store_id", storeIds)
}
```

## Próximos Passos

1. ✅ Migração SQL criada
2. ✅ StoreContext atualizado
3. ✅ Componente StoreSelector criado
4. ⏳ Atualizar queries em componentes principais
5. ⏳ Atualizar RLS policies
6. ⏳ Testar visualização de rede vs loja

## Notas Importantes

- O modo "network" retorna todas as lojas da empresa atual
- O modo "store" retorna apenas a loja selecionada
- Admins podem ver todas as empresas, mas devem selecionar uma para filtrar lojas
- A visualização de rede só está disponível para gerentes e admins




