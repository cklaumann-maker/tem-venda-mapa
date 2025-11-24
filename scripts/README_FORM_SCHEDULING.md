# Sistema de Agendamento de Formulários

## 📋 Visão Geral

Este sistema permite agendar formulários para serem respondidos em horários específicos e acompanhar se foram respondidos ou não através de um calendário.

## 🚀 Instalação

### 1. Execute os Scripts SQL na Ordem:

1. **`add-form-scheduling.sql`** - Cria as colunas e tabelas necessárias
2. **`add-form-scheduling-triggers.sql`** - Cria as funções e triggers para atualização automática

### 2. Configuração de Execução Automática (Opcional)

Para marcar automaticamente tarefas como "perdidas" à meia-noite, você tem duas opções:

#### Opção A: Usando pg_cron (se disponível no Supabase)

Execute no Supabase SQL Editor:

```sql
-- Marcar tarefas perdidas do dia anterior à meia-noite
SELECT cron.schedule(
  'mark-missed-tasks-daily',
  '0 0 * * *', -- Executa à meia-noite todos os dias (formato cron)
  $$SELECT mark_missed_tasks();$$
);

-- Marcar tarefas perdidas do dia atual a cada hora
SELECT cron.schedule(
  'mark-missed-tasks-hourly',
  '0 * * * *', -- Executa no início de cada hora
  $$SELECT mark_missed_tasks_today();$$
);
```

#### Opção B: Job Externo (Recomendado)

Crie um job externo (ex: usando Vercel Cron, GitHub Actions, ou um servidor) que chama a função periodicamente:

```javascript
// Exemplo usando fetch
const response = await fetch('https://seu-projeto.supabase.co/rest/v1/rpc/mark_missed_tasks_today', {
  method: 'POST',
  headers: {
    'apikey': 'sua-api-key',
    'Authorization': 'Bearer seu-token',
    'Content-Type': 'application/json'
  }
});
```

Ou usando o cliente Supabase:

```javascript
const { data, error } = await supabase.rpc('mark_missed_tasks_today');
```

## 🔄 Como Funciona

### 1. Criação de Tarefas

Quando um formulário é criado com agendamento habilitado:
- O sistema cria automaticamente tarefas na tabela `form_schedule_tasks`
- Cada tarefa representa uma data/hora em que o formulário deve ser respondido
- As tarefas são criadas até 365 dias no futuro (ou até a data de fim, se especificada)

### 2. Atualização Automática ao Responder

Quando um colaborador responde um formulário:
- O trigger `trigger_update_task_on_response` é acionado automaticamente
- O sistema busca a tarefa correspondente (mesmo formulário, mesma data)
- Se encontrar uma tarefa pendente, atualiza para "completed" e vincula a resposta

**Critérios de correspondência:**
- Mesmo `form_id` e `store_id`
- Mesma data (dia)
- Status "pending"
- Horário da resposta próximo ao horário agendado (dentro de 4 horas)

### 3. Marcação de Tarefas Perdidas

As tarefas são marcadas como "missed" quando:
- A data/hora agendada já passou
- A tarefa ainda está com status "pending"
- Não foi vinculada a nenhuma resposta

**Execução:**
- **Automática**: Se configurado pg_cron ou job externo
- **Manual**: Ao abrir o calendário, a função `mark_missed_tasks_today()` é chamada automaticamente

## 📊 Funções Disponíveis

### `update_schedule_task_on_response()`
- **Tipo**: Trigger Function
- **Quando**: Automaticamente ao criar uma resposta
- **Ação**: Atualiza a tarefa correspondente para "completed"

### `mark_missed_tasks()`
- **Tipo**: Function
- **Quando**: Deve ser chamada à meia-noite (via cron ou job)
- **Ação**: Marca todas as tarefas do dia anterior como "missed"

### `mark_missed_tasks_today()`
- **Tipo**: Function
- **Quando**: Pode ser chamada periodicamente (a cada hora) ou ao abrir o calendário
- **Ação**: Marca tarefas do dia atual que já passaram do horário como "missed"

## 🎯 Status das Tarefas

- **pending**: Tarefa agendada, aguardando resposta
- **completed**: Formulário foi respondido
- **missed**: Data/hora passou sem resposta
- **cancelled**: Tarefa cancelada manualmente

## 🔧 Manutenção

### Verificar Tarefas Pendentes Antigas

```sql
SELECT * FROM form_schedule_tasks 
WHERE status = 'pending' 
AND scheduled_date < CURRENT_DATE;
```

### Marcar Manualmente Tarefas Perdidas

```sql
SELECT mark_missed_tasks(); -- Para dias anteriores
SELECT mark_missed_tasks_today(); -- Para o dia atual
```

### Limpar Tarefas Antigas (Opcional)

```sql
-- Deletar tarefas com mais de 1 ano
DELETE FROM form_schedule_tasks 
WHERE scheduled_date < CURRENT_DATE - INTERVAL '1 year';
```

## 📝 Notas Importantes

1. **Limite de Tarefas**: O sistema cria tarefas até 365 dias no futuro para evitar sobrecarga
2. **Vinculação de Respostas**: Uma resposta pode vincular apenas uma tarefa. Se houver múltiplas tarefas no mesmo dia, a mais próxima do horário será escolhida
3. **Performance**: O trigger é otimizado para não impactar a performance ao criar respostas
4. **Timezone**: Certifique-se de que o timezone do banco está configurado corretamente

