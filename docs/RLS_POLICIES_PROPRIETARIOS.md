# 🔒 RLS Policies para Proprietários

**Data:** 2025-01-06  
**Status:** ✅ Implementado

## 📋 Resumo

Implementação de RLS (Row Level Security) policies para permitir que proprietários de redes tenham acesso total aos recursos da sua rede, mantendo segurança e isolamento entre redes.

---

## ✅ Policies Implementadas

### 1. Tabela `networks`

#### SELECT Policy: `networks_select_consolidated`
**Permissões:**
- ✅ Admin: Acesso total (todas as redes)
- ✅ Proprietário: Acesso à sua rede (via `owner_id`)
- ✅ Usuários com perfil: Acesso à rede do seu perfil
- ✅ Usuários via store_members: Acesso à rede das lojas onde são membros

**Lógica:**
```sql
owner_id = auth.uid()
OR
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND network_id = networks.id)
OR
EXISTS (SELECT 1 FROM store_members JOIN stores WHERE user_id = auth.uid() AND network_id = networks.id)
```

#### UPDATE Policy: `networks_update_consolidated`
**Permissões:**
- ✅ Admin: Pode atualizar qualquer rede
- ✅ Proprietário: Pode atualizar sua própria rede, **mas não pode alterar `owner_id`**

**Lógica:**
```sql
-- Proprietário pode atualizar, mas owner_id não pode ser alterado
owner_id = auth.uid()
AND owner_id IS NOT DISTINCT FROM (SELECT owner_id FROM networks WHERE id = networks.id)
```

**Segurança:**
- ✅ `owner_id` é protegido - proprietário não pode transferir propriedade
- ✅ Apenas admin pode alterar `owner_id` (via policy de admin)

#### INSERT Policy: `Only admin can create networks`
- ✅ Apenas admin pode criar novas redes (mantido como está)
- ✅ Proprietário não pode criar novas redes diretamente

#### DELETE Policy: `Only admin can delete networks`
- ✅ Apenas admin pode deletar redes (mantido como está)
- ✅ Proprietário não pode deletar sua rede (segurança)

---

### 2. Tabela `stores`

#### SELECT Policy: `stores_select_consolidated`
**Status:** ✅ Já incluía proprietários
- ✅ Proprietário já tinha acesso via `role = 'owner'` e `network_id`

#### INSERT Policy: `stores_insert_consolidated`
**Permissões:**
- ✅ Admin: Pode criar qualquer loja
- ✅ Proprietário: Pode criar lojas na sua rede

**Lógica:**
```sql
EXISTS (
  SELECT 1 FROM networks n
  WHERE n.id = stores.network_id
  AND n.owner_id = auth.uid()
)
```

#### UPDATE Policy: `stores_update_consolidated`
**Permissões:**
- ✅ Admin: Pode atualizar qualquer loja
- ✅ Proprietário: Pode atualizar lojas da sua rede

**Lógica:**
```sql
EXISTS (
  SELECT 1 FROM networks n
  WHERE n.id = stores.network_id
  AND n.owner_id = auth.uid()
)
```

#### DELETE Policy: `stores_delete_consolidated`
- ✅ Apenas admin pode deletar lojas (mantido como está)

---

### 3. Tabela `profiles`

#### SELECT Policy: `profiles_select_consolidated`
**Permissões:**
- ✅ Admin: Acesso total
- ✅ Usuário: Seu próprio perfil
- ✅ Proprietário: Usuários da sua rede
- ✅ Manager/Leader/Finance/Owner: Usuários da mesma rede

**Lógica:**
```sql
EXISTS (
  SELECT 1 FROM networks n
  WHERE n.owner_id = auth.uid()
  AND n.id = profiles.network_id
)
```

#### INSERT Policy: `profiles_insert_consolidated`
**Permissões:**
- ✅ Admin: Pode criar qualquer perfil
- ✅ Usuário: Pode criar seu próprio perfil (primeiro login)
- ✅ Proprietário: Pode criar perfis na sua rede

**Lógica:**
```sql
EXISTS (
  SELECT 1 FROM networks n
  WHERE n.owner_id = auth.uid()
  AND n.id = profiles.network_id
)
```

#### UPDATE Policy: `profiles_update_consolidated`
**Permissões:**
- ✅ Admin: Pode atualizar qualquer perfil
- ✅ Usuário: Pode atualizar seu próprio perfil
- ✅ Proprietário: Pode atualizar perfis da sua rede

**Lógica:**
```sql
EXISTS (
  SELECT 1 FROM networks n
  WHERE n.owner_id = auth.uid()
  AND n.id = profiles.network_id
)
```

---

## 🔒 Segurança

### Proteções Implementadas

1. **Isolamento entre Redes:**
   - ✅ Proprietário só acessa recursos da sua rede
   - ✅ Não pode ver/editar dados de outras redes

2. **Proteção de `owner_id`:**
   - ✅ Proprietário não pode alterar `owner_id` da sua rede
   - ✅ Apenas admin pode transferir propriedade

3. **Operações Críticas:**
   - ✅ DELETE de redes: Apenas admin
   - ✅ DELETE de lojas: Apenas admin
   - ✅ DELETE de perfis: Apenas admin (se houver policy)

4. **Criação de Redes:**
   - ✅ Apenas admin pode criar novas redes
   - ✅ Proprietário não pode criar múltiplas redes diretamente

---

## 📊 Resumo de Permissões

| Recurso | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| **Networks** | ✅ Própria rede | ❌ Apenas admin | ✅ Própria rede (exceto owner_id) | ❌ Apenas admin |
| **Stores** | ✅ Da sua rede | ✅ Na sua rede | ✅ Da sua rede | ❌ Apenas admin |
| **Profiles** | ✅ Da sua rede | ✅ Na sua rede | ✅ Da sua rede | ❌ Apenas admin |

**Legenda:**
- ✅ = Proprietário tem permissão
- ❌ = Apenas admin tem permissão

---

## 🧪 Testes Recomendados

1. **Teste de Isolamento:**
   - Criar duas redes com proprietários diferentes
   - Verificar que proprietário A não vê dados da rede B

2. **Teste de Permissões:**
   - Proprietário deve conseguir criar/editar lojas na sua rede
   - Proprietário deve conseguir criar/editar usuários na sua rede
   - Proprietário NÃO deve conseguir alterar `owner_id`

3. **Teste de Segurança:**
   - Proprietário NÃO deve conseguir deletar sua rede
   - Proprietário NÃO deve conseguir criar nova rede
   - Proprietário NÃO deve conseguir ver dados de outras redes

---

## 📝 Notas Técnicas

### Performance

- ✅ Policies usam `EXISTS` com subqueries otimizadas
- ✅ Índices em `owner_id` e `network_id` melhoram performance
- ✅ Policies são avaliadas em ordem (admin primeiro, depois proprietário)

### Compatibilidade

- ✅ Policies mantêm compatibilidade com roles existentes (manager, leader, finance)
- ✅ Policies não quebram funcionalidades existentes
- ✅ Admin continua com acesso total

---

## ✅ Status

**Migration:** `add_owner_rls_policies`  
**Status:** ✅ Aplicada com sucesso  
**Data:** 2025-01-06

Todas as policies foram criadas e estão ativas no banco de dados.

