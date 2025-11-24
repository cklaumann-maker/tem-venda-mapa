-- =====================================================
-- Script para Triggers e Funções de Agendamento de Formulários
-- Sistema TEM VENDA
-- =====================================================

-- Função para atualizar tarefa quando uma resposta é criada
CREATE OR REPLACE FUNCTION update_schedule_task_on_response()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  response_date DATE;
BEGIN
  -- Obter a data da resposta (no timezone local)
  response_date := DATE(NEW.submitted_at);
  
  -- Buscar a tarefa correspondente ao formulário para o dia de hoje
  -- Aceita qualquer tarefa pendente do mesmo dia, independente do horário
  SELECT * INTO task_record
  FROM form_schedule_tasks
  WHERE 
    form_id = NEW.form_id
    AND store_id = NEW.store_id
    AND scheduled_date = response_date
    AND status = 'pending'
  ORDER BY 
    -- Priorizar tarefas com horário mais próximo (se houver)
    CASE 
      WHEN scheduled_time IS NOT NULL 
      THEN ABS(EXTRACT(EPOCH FROM (NEW.submitted_at::time - scheduled_time)))
      ELSE 0
    END
  LIMIT 1;
  
  -- Se encontrou uma tarefa, atualizar
  IF FOUND THEN
    UPDATE form_schedule_tasks
    SET 
      status = 'completed',
      completed_at = NEW.submitted_at,
      response_id = NEW.id,
      updated_at = NOW()
    WHERE id = task_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar tarefa quando resposta é criada
DROP TRIGGER IF EXISTS trigger_update_task_on_response ON form_responses;
CREATE TRIGGER trigger_update_task_on_response
  AFTER INSERT ON form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_task_on_response();

-- Função para marcar tarefas perdidas (chamada à meia-noite ou manualmente)
CREATE OR REPLACE FUNCTION mark_missed_tasks()
RETURNS void AS $$
BEGIN
  -- Marcar como "missed" todas as tarefas pendentes do dia anterior
  -- que não foram completadas até o final do dia
  UPDATE form_schedule_tasks
  SET 
    status = 'missed',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND scheduled_date < CURRENT_DATE
    AND (
      -- Se tem horário agendado, verificar se já passou do horário do dia anterior
      (scheduled_time IS NOT NULL AND scheduled_datetime < NOW())
      OR
      -- Se não tem horário, considerar perdido se for de um dia anterior
      (scheduled_time IS NULL AND scheduled_date < CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Função para marcar tarefas perdidas do dia atual (pode ser chamada periodicamente)
CREATE OR REPLACE FUNCTION mark_missed_tasks_today()
RETURNS void AS $$
BEGIN
  -- Marcar como "missed" tarefas do dia atual que já passaram do horário
  UPDATE form_schedule_tasks
  SET 
    status = 'missed',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND scheduled_date = CURRENT_DATE
    AND scheduled_datetime < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON FUNCTION update_schedule_task_on_response() IS 'Atualiza automaticamente a tarefa quando uma resposta é criada';
COMMENT ON FUNCTION mark_missed_tasks() IS 'Marca tarefas do dia anterior como perdidas';
COMMENT ON FUNCTION mark_missed_tasks_today() IS 'Marca tarefas do dia atual que já passaram do horário como perdidas';

-- =====================================================
-- Configuração de pg_cron (se disponível)
-- =====================================================
-- Para executar automaticamente à meia-noite, você pode usar pg_cron:
-- 
-- SELECT cron.schedule(
--   'mark-missed-tasks-daily',
--   '0 0 * * *', -- Executa à meia-noite todos os dias
--   $$SELECT mark_missed_tasks();$$
-- );
--
-- Para executar a cada hora e marcar tarefas do dia atual:
--
-- SELECT cron.schedule(
--   'mark-missed-tasks-hourly',
--   '0 * * * *', -- Executa no início de cada hora
--   $$SELECT mark_missed_tasks_today();$$
-- );
--
-- Nota: pg_cron precisa estar habilitado no Supabase. 
-- Alternativamente, você pode criar um job externo que chama essas funções.

