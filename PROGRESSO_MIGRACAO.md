# Progresso da Migração: Empresas → Lojas

## ✅ Concluído

### 1. Estrutura Base
- ✅ Migração SQL criada (`scripts/migrate-companies-stores.sql`)
- ✅ StoreContext atualizado com suporte a empresas e modo de visualização
- ✅ Componente StoreSelector criado
- ✅ Função `getStoreIdsForQuery()` implementada

### 2. Componentes Atualizados
- ✅ `PendingFormsWidget` - Widget de formulários pendentes
- ✅ `ListarFormulariosView` - Listagem de formulários
- ✅ `DashboardView` - Dashboard de formulários

### 3. Header
- ✅ StoreSelector integrado no header (precisa ser adicionado visualmente)

## ⏳ Em Progresso

### Componentes que Precisam Atualização

**Prioridade Alta:**
- ⏳ `CriarFormularioView` - Criar formulários
- ⏳ `ResponderFormularioView` - Responder formulários
- ⏳ `RespostasView` - Ver respostas
- ⏳ `CalendarView` - Calendário de formulários
- ⏳ `ColaboradoresView` - Lista de colaboradores
- ⏳ `EquipeView` - Visão geral da equipe

**Prioridade Média:**
- ⏳ `MetasView` - Metas
- ⏳ `VendasView` - Vendas
- ⏳ Outros componentes de equipe

## 📋 Padrão de Atualização

Todos os componentes devem seguir este padrão:

```typescript
// ANTES
const { currentStore } = useStore();
.eq("store_id", currentStore?.id)

// DEPOIS
const { getStoreIdsForQuery, viewMode } = useStore();
const storeIds = getStoreIdsForQuery();
if (storeIds && storeIds.length > 0) {
  .in("store_id", storeIds)
}
```

## 🔍 Como Encontrar Componentes para Atualizar

Execute no terminal:
```bash
grep -r "\.eq(\"store_id\"" src/components
grep -r "currentStore\?\.id" src/components
```

## 📝 Próximos Passos

1. Executar migração SQL no banco de dados
2. Continuar atualizando componentes restantes
3. Testar visualização de rede vs loja
4. Atualizar RLS policies se necessário
5. Documentar mudanças para a equipe

## 🎯 Status Atual

- **Estrutura**: 100% ✅
- **Componentes**: ~15% (3 de ~20)
- **Testes**: 0%
- **Documentação**: 50%

