# ✅ Verificação de Políticas RLS no Supabase

## 📋 Status das Políticas RLS

### ✅ **Políticas Criadas nos Scripts SQL**

#### 1. **Tabela `forms`** (`scripts/create-formularios-tables.sql`)
- ✅ `"Admins can view all forms"` - SELECT para admins
- ✅ `"Users can view forms from their stores"` - SELECT para usuários da loja
- ✅ `"Admins can manage all forms"` - ALL (INSERT/UPDATE/DELETE) para admins
- ✅ `"Managers can manage forms from their stores"` - ALL para managers da loja

#### 2. **Tabela `form_responses`** (`scripts/create-formularios-tables.sql`)
- ✅ `"Admins can view all responses"` - SELECT para admins
- ✅ `"Users can view responses from their stores"` - SELECT para usuários da loja
- ✅ `"Employees can view their own responses"` - SELECT para próprias respostas
- ✅ `"Authenticated users can create responses"` - INSERT para usuários autenticados
- ✅ `"Admins can manage all responses"` - ALL para admins
- ✅ `"Managers can update responses from their stores"` - UPDATE para managers

#### 3. **Tabela `form_schedule_tasks`** (`scripts/add-form-scheduling.sql`)
- ✅ `"Admins can view all schedule tasks"` - SELECT para admins
- ✅ `"Users can view schedule tasks from their stores"` - SELECT para usuários da loja
- ✅ `"Admins can manage all schedule tasks"` - ALL para admins
- ✅ `"Managers can manage schedule tasks from their stores"` - ALL para managers

#### 4. **Tabelas de Equipe** (`scripts/create-equipe-tables.sql`)
- ✅ Políticas para `employees`, `employee_shifts`, `time_records`, `overtime_requests`
- ✅ Todas verificam `store_id` em `store_members`
- ✅ Admins podem ver tudo
- ✅ Managers podem gerenciar suas lojas
- ✅ Usuários podem ver dados da sua loja

## ⚠️ **Possível Problema Identificado**

### **Tabela `form_schedule_tasks` - Atualização por Usuários Normais**

**Situação:**
- O código em `PendingFormsWidget.tsx` tenta atualizar tarefas:
```typescript
await supabase
  .from("form_schedule_tasks")
  .update(updateData)
  .eq("id", taskId);
```

**Políticas Atuais:**
- ✅ Usuários podem **VER** tarefas da sua loja
- ✅ Managers podem **GERENCIAR** (UPDATE) tarefas da sua loja
- ❌ **Usuários normais NÃO podem ATUALIZAR** tarefas

**Problema:**
Se um usuário normal (não manager) tentar marcar uma tarefa como "respondido" no widget da página inicial, pode receber erro de permissão.

**Solução Necessária:**
Adicionar uma política que permita usuários atualizarem o status de tarefas da sua loja:

```sql
-- Permitir que usuários atualizem status de tarefas da sua loja
CREATE POLICY "Users can update schedule tasks from their stores"
  ON form_schedule_tasks FOR UPDATE
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );
```

## 🔍 **Como Verificar se as Políticas Estão Aplicadas no Supabase**

### **1. Via Supabase Dashboard:**
1. Acesse o Supabase Dashboard
2. Vá em **Authentication** > **Policies**
3. Selecione a tabela (ex: `forms`, `form_responses`, `form_schedule_tasks`)
4. Verifique se as políticas listadas acima estão presentes

### **2. Via SQL Editor:**
```sql
-- Ver todas as políticas de uma tabela
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'forms'
ORDER BY policyname;
```

### **3. Testar uma Política:**
```sql
-- Simular como usuário normal
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'id-do-usuario-teste';

-- Tentar ver formulários
SELECT * FROM forms;
-- Deve retornar apenas formulários da loja do usuário

-- Tentar ver formulários de outra loja
SELECT * FROM forms WHERE store_id = 'id-de-outra-loja';
-- Deve retornar vazio (RLS bloqueia)
```

## 📝 **Checklist de Verificação**

### **Para cada tabela, verificar:**

- [ ] RLS está habilitado: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Política para admins ver tudo (SELECT)
- [ ] Política para usuários ver dados da sua loja (SELECT)
- [ ] Política para admins gerenciar tudo (ALL)
- [ ] Política para managers gerenciar sua loja (ALL ou UPDATE/INSERT/DELETE)
- [ ] Política para usuários criarem/atualizarem quando necessário (INSERT/UPDATE)

## 🎯 **Recomendações**

1. **Verificar no Supabase** se todas as políticas foram aplicadas
2. **Testar** se usuários normais conseguem marcar tarefas como respondidas
3. **Adicionar política** para UPDATE de tarefas por usuários normais (se necessário)
4. **Documentar** qualquer política adicional criada manualmente

## 📄 **Scripts SQL que Precisam ser Executados**

1. ✅ `scripts/create-formularios-tables.sql` - Já tem políticas
2. ✅ `scripts/add-form-scheduling.sql` - Já tem políticas (mas pode precisar de UPDATE para usuários)
3. ✅ `scripts/create-equipe-tables.sql` - Já tem políticas
4. ✅ `scripts/create-equipe-phase2-tables.sql` - Verificar se tem políticas
5. ✅ `scripts/create-equipe-phase3-tables.sql` - Verificar se tem políticas

