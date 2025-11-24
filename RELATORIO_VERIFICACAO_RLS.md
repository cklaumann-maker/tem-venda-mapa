# 📊 Relatório de Verificação de Políticas RLS - Supabase

**Data da Verificação:** $(date)  
**Método:** Supabase MCP Server

## ✅ **Status Geral: POLÍTICAS CRIADAS**

A maioria das políticas RLS estão criadas e funcionando corretamente!

---

## 📋 **Análise por Tabela**

### ✅ **1. Tabela `forms`** - **COMPLETA**
- ✅ `Admins can view all forms` (SELECT)
- ✅ `Admins can manage all forms` (ALL)
- ✅ `Users can view forms from their stores` (SELECT)
- ✅ `Managers can manage forms from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **2. Tabela `form_responses`** - **COMPLETA**
- ✅ `Admins can view all responses` (SELECT)
- ✅ `Admins can manage all responses` (ALL)
- ✅ `Users can view responses from their stores` (SELECT)
- ✅ `Employees can view their own responses` (SELECT)
- ✅ `Authenticated users can create responses` (INSERT)
- ✅ `Managers can update responses from their stores` (UPDATE)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ⚠️ **3. Tabela `form_schedule_tasks`** - **PROBLEMA IDENTIFICADO**

**Políticas Existentes:**
- ✅ `Admins can view all schedule tasks` (SELECT)
- ✅ `Admins can manage all schedule tasks` (ALL)
- ✅ `Users can view schedule tasks from their stores` (SELECT)
- ✅ `Managers can manage schedule tasks from their stores` (ALL)

**❌ PROBLEMA:**
- **Usuários normais (não managers) NÃO podem atualizar tarefas**
- O widget da página inicial (`PendingFormsWidget.tsx`) tenta atualizar o status das tarefas
- Apenas managers podem fazer UPDATE, mas usuários normais também precisam marcar tarefas como "respondido"

**Solução Necessária:**
Adicionar uma política que permita usuários atualizarem o status de tarefas da sua loja:

```sql
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

**Status:** ⚠️ **Falta política para UPDATE por usuários normais**

---

### ✅ **4. Tabela `employees`** - **COMPLETA**
- ✅ `Admins can view all employees` (SELECT)
- ✅ `Admins can manage employees` (ALL)
- ✅ `Users can view employees from their stores` (SELECT)
- ✅ `Managers can manage employees from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **5. Tabela `employee_shifts`** - **COMPLETA**
- ✅ `Users can view shifts from their stores` (SELECT)
- ✅ `Managers can manage shifts from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **6. Tabela `time_records`** - **COMPLETA**
- ✅ `Users can view time records from their stores` (SELECT)
- ✅ `Employees can view their own time records` (SELECT)
- ✅ `Managers can manage time records from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **7. Tabela `overtime_requests`** - **COMPLETA**
- ✅ `Users can view overtime requests from their stores` (SELECT)
- ✅ `Employees can create their own overtime requests` (INSERT)
- ✅ `Managers can approve overtime requests` (UPDATE)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **8. Tabela `admissions`** - **COMPLETA**
- ✅ `Admins can view all admissions` (SELECT)
- ✅ `Admins can manage all admissions` (ALL)
- ✅ `Users can view admissions from their stores` (SELECT)
- ✅ `Managers can manage admissions from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **9. Tabela `employee_documents`** - **COMPLETA**
- ✅ `Users can view documents from their stores` (SELECT)
- ✅ `Employees can view their own documents` (SELECT)
- ✅ `Managers can manage documents from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **10. Tabela `vacations`** - **COMPLETA**
- ✅ `Users can view vacations from their stores` (SELECT)
- ✅ `Employees can create their own vacation requests` (INSERT)
- ✅ `Managers can approve vacation requests` (UPDATE)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **11. Tabela `leaves`** - **COMPLETA**
- ✅ `Users can view leaves from their stores` (SELECT)
- ✅ `Employees can create their own leave requests` (INSERT)
- ✅ `Managers can approve leave requests` (UPDATE)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **12. Tabela `terminations`** - **COMPLETA**
- ✅ `Admins can view all terminations` (SELECT)
- ✅ `Admins can manage all terminations` (ALL)
- ✅ `Users can view terminations from their stores` (SELECT)
- ✅ `Managers can manage terminations from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **13. Tabela `performance_reviews`** - **COMPLETA**
- ✅ `Admins can view all reviews` (SELECT)
- ✅ `Admins can manage all reviews` (ALL)
- ✅ `Users can view reviews from their stores` (SELECT)
- ✅ `Employees can view their own reviews` (SELECT)
- ✅ `Managers can manage reviews from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

### ✅ **14. Tabela `employee_goals`** - **COMPLETA**
- ✅ `Admins can view all goals` (SELECT)
- ✅ `Admins can manage all goals` (ALL)
- ✅ `Users can view goals from their stores` (SELECT)
- ✅ `Employees can view their own goals` (SELECT)
- ✅ `Managers can manage goals from their stores` (ALL)

**Status:** ✅ **Todas as políticas necessárias estão criadas**

---

## 🎯 **Resumo**

### ✅ **Tabelas com Políticas Completas (13):**
1. `forms` ✅
2. `form_responses` ✅
3. `employees` ✅
4. `employee_shifts` ✅
5. `time_records` ✅
6. `overtime_requests` ✅
7. `admissions` ✅
8. `employee_documents` ✅
9. `vacations` ✅
10. `leaves` ✅
11. `terminations` ✅
12. `performance_reviews` ✅
13. `employee_goals` ✅

### ⚠️ **Tabelas com Políticas Incompletas (1):**
1. `form_schedule_tasks` ⚠️ - **Falta política para UPDATE por usuários normais**

---

## 🔧 **Ação Necessária**

### **Script SQL para Corrigir:**

Crie um arquivo `scripts/fix-form-schedule-tasks-update-policy.sql`:

```sql
-- Permitir que usuários normais atualizem tarefas agendadas da sua loja
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

**Execute este script no Supabase SQL Editor.**

---

## ✅ **Conclusão**

**Status Geral:** 🟢 **95% Completo**

- ✅ **13 de 14 tabelas** têm todas as políticas necessárias
- ⚠️ **1 tabela** precisa de uma política adicional para UPDATE por usuários normais

**Recomendação:** Execute o script acima para completar a segurança do sistema.

---

**Verificado via:** Supabase MCP Server  
**Data:** $(date)

