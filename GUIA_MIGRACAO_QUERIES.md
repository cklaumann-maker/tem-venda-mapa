# Guia de Migração: Atualizando Queries para Suportar Rede/Loja

## Visão Geral

Com a nova estrutura de Empresas → Lojas, as queries precisam ser atualizadas para suportar dois modos de visualização:
- **Modo Loja**: Mostra dados apenas da loja selecionada
- **Modo Rede**: Mostra dados de todas as lojas da empresa

## Padrão de Atualização

### ANTES (apenas loja)

```typescript
const { currentStore } = useStore();

// Query
const { data } = await supabase
  .from("minha_tabela")
  .select("*")
  .eq("store_id", currentStore?.id);
```

### DEPOIS (suporta rede e loja)

```typescript
const { getStoreIdsForQuery, viewMode } = useStore();

// Obter IDs baseado no modo
const storeIds = getStoreIdsForQuery();

if (storeIds && storeIds.length > 0) {
  const { data } = await supabase
    .from("minha_tabela")
    .select("*")
    .in("store_id", storeIds);
} else {
  // Nenhuma loja disponível
  setData([]);
}
```

## Exemplos Práticos

### Exemplo 1: Listagem Simples

```typescript
// ANTES
useEffect(() => {
  if (!currentStore?.id) return;
  
  const loadData = async () => {
    const { data } = await supabase
      .from("forms")
      .select("*")
      .eq("store_id", currentStore.id)
      .eq("is_active", true);
    
    setForms(data || []);
  };
  
  loadData();
}, [currentStore?.id]);

// DEPOIS
useEffect(() => {
  const storeIds = getStoreIdsForQuery();
  if (!storeIds || storeIds.length === 0) {
    setForms([]);
    return;
  }
  
  const loadData = async () => {
    const { data } = await supabase
      .from("forms")
      .select("*")
      .in("store_id", storeIds)
      .eq("is_active", true);
    
    setForms(data || []);
  };
  
  loadData();
}, [getStoreIdsForQuery, viewMode]);
```

### Exemplo 2: Com Agregações

```typescript
// ANTES
const { data } = await supabase
  .from("sales_daily")
  .select("store_id, total, d")
  .eq("store_id", currentStore?.id)
  .gte("d", startDate)
  .lte("d", endDate);

// DEPOIS
const storeIds = getStoreIdsForQuery();
if (!storeIds || storeIds.length === 0) {
  return { data: [] };
}

const { data } = await supabase
  .from("sales_daily")
  .select("store_id, total, d")
  .in("store_id", storeIds)
  .gte("d", startDate)
  .lte("d", endDate);
```

### Exemplo 3: Com Joins

```typescript
// ANTES
const { data } = await supabase
  .from("employees")
  .select(`
    *,
    store:stores(id, name)
  `)
  .eq("store_id", currentStore?.id)
  .eq("status", "active");

// DEPOIS
const storeIds = getStoreIdsForQuery();
if (!storeIds || storeIds.length === 0) {
  return { data: [] };
}

const { data } = await supabase
  .from("employees")
  .select(`
    *,
    store:stores(id, name)
  `)
  .in("store_id", storeIds)
  .eq("status", "active");
```

### Exemplo 4: Com Contagem e Agrupamento

```typescript
// ANTES
const { data } = await supabase
  .from("form_responses")
  .select("id", { count: "exact" })
  .eq("store_id", currentStore?.id);

// DEPOIS
const storeIds = getStoreIdsForQuery();
if (!storeIds || storeIds.length === 0) {
  return { count: 0 };
}

const { data, count } = await supabase
  .from("form_responses")
  .select("id", { count: "exact" })
  .in("store_id", storeIds);
```

## Componentes que Precisam Atualização

### Prioridade Alta
1. ✅ `StoreContext` - Já atualizado
2. ⏳ `DashboardView` (formulários)
3. ⏳ `MetasView`
4. ⏳ `VendasView`
5. ⏳ `EquipeView`
6. ⏳ `FormulariosView`

### Prioridade Média
7. ⏳ `ColaboradoresView`
8. ⏳ `PerformanceView`
9. ⏳ `RelatoriosView`
10. ⏳ Componentes de relatórios

## Checklist de Migração

Para cada componente que usa `currentStore`:

- [ ] Importar `getStoreIdsForQuery` e `viewMode` do `useStore`
- [ ] Substituir `.eq("store_id", currentStore?.id)` por `.in("store_id", storeIds)`
- [ ] Adicionar verificação `if (!storeIds || storeIds.length === 0)`
- [ ] Atualizar dependências do `useEffect` para incluir `getStoreIdsForQuery` e `viewMode`
- [ ] Testar em modo "Loja" e modo "Rede"
- [ ] Verificar se agregações/somas funcionam corretamente em modo rede

## Tratamento de Erros

```typescript
const storeIds = getStoreIdsForQuery();

if (!storeIds || storeIds.length === 0) {
  // Caso 1: Nenhuma loja disponível
  setData([]);
  setError("Nenhuma loja disponível para visualização.");
  return;
}

// Caso 2: Query com múltiplas lojas
const { data, error } = await supabase
  .from("minha_tabela")
  .select("*")
  .in("store_id", storeIds);

if (error) {
  console.error("Erro ao carregar dados:", error);
  setError("Não foi possível carregar os dados.");
  return;
}
```

## Notas Importantes

1. **Performance**: Queries com `.in()` podem ser mais lentas com muitas lojas. Considere adicionar índices.
2. **Agregações**: Em modo rede, certifique-se de agrupar por `store_id` quando necessário.
3. **Permissões**: O `getStoreIdsForQuery()` já filtra baseado nas permissões do usuário.
4. **Cache**: Considere invalidar cache quando o `viewMode` mudar.




