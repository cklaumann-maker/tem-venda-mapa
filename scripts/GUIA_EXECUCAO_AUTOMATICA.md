# Guia: Como Configurar Execução Automática à Meia-Noite

Este guia explica como configurar a execução automática para marcar tarefas como "perdidas" à meia-noite.

## 📋 Opções Disponíveis

Você tem 3 opções principais:

1. **pg_cron** (se disponível no Supabase) - Mais simples
2. **Vercel Cron Jobs** (se estiver usando Vercel) - Recomendado
3. **API Route + Job Externo** - Mais flexível

---

## Opção 1: Usando pg_cron (Supabase)

### Passo 1: Verificar se pg_cron está disponível

Execute no Supabase SQL Editor:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Se retornar vazio, o pg_cron não está disponível. Pule para outra opção.

### Passo 2: Habilitar pg_cron (se necessário)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Passo 3: Criar o Job

Execute no Supabase SQL Editor:

```sql
-- Marcar tarefas perdidas do dia anterior à meia-noite
SELECT cron.schedule(
  'mark-missed-tasks-daily',
  '0 0 * * *', -- Executa à meia-noite todos os dias (formato cron)
  $$SELECT mark_missed_tasks();$$
);
```

### Passo 4: Verificar se o Job foi criado

```sql
SELECT * FROM cron.job WHERE jobname = 'mark-missed-tasks-daily';
```

### Passo 5: (Opcional) Criar job para marcar tarefas a cada hora

```sql
-- Marcar tarefas perdidas do dia atual a cada hora
SELECT cron.schedule(
  'mark-missed-tasks-hourly',
  '0 * * * *', -- Executa no início de cada hora
  $$SELECT mark_missed_tasks_today();$$
);
```

### Para Remover um Job (se necessário)

```sql
SELECT cron.unschedule('mark-missed-tasks-daily');
```

---

## Opção 2: Usando Vercel Cron Jobs (Recomendado)

### Passo 1: Criar arquivo de configuração

Crie o arquivo `vercel.json` na raiz do projeto (se não existir):

```json
{
  "crons": [
    {
      "path": "/api/cron/mark-missed-tasks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Passo 2: Criar API Route

Crie o arquivo `src/app/api/cron/mark-missed-tasks/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verificar se é uma requisição do Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key para bypass RLS
    );

    // Chamar a função para marcar tarefas perdidas
    const { data, error } = await supabase.rpc('mark_missed_tasks');

    if (error) {
      console.error('Erro ao marcar tarefas perdidas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tarefas perdidas marcadas com sucesso',
      data 
    });
  } catch (error: any) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Passo 3: Configurar variável de ambiente

No Vercel Dashboard:
1. Vá em **Settings** > **Environment Variables**
2. Adicione:
   - `CRON_SECRET`: Uma string aleatória segura (ex: gere com `openssl rand -base64 32`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Sua service role key do Supabase (encontre em Settings > API)

### Passo 4: Fazer deploy

```bash
git add vercel.json src/app/api/cron/mark-missed-tasks/route.ts
git commit -m "Add cron job for marking missed tasks"
git push
```

O Vercel detectará automaticamente o `vercel.json` e configurará o cron job.

### Passo 5: Verificar no Vercel Dashboard

1. Vá em **Settings** > **Cron Jobs**
2. Você deve ver o job `mark-missed-tasks` agendado para executar à meia-noite

---

## Opção 3: API Route + Job Externo (GitHub Actions, etc.)

### Passo 1: Criar API Route (mesmo da Opção 2)

Crie `src/app/api/cron/mark-missed-tasks/route.ts` (mesmo código da Opção 2).

### Passo 2: Criar GitHub Action

Crie o arquivo `.github/workflows/mark-missed-tasks.yml`:

```yaml
name: Mark Missed Tasks

on:
  schedule:
    # Executa à meia-noite UTC todos os dias
    - cron: '0 0 * * *'
  workflow_dispatch: # Permite execução manual

jobs:
  mark-missed-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET "${{ secrets.API_URL }}/api/cron/mark-missed-tasks" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Passo 3: Configurar Secrets no GitHub

1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Adicione:
   - `API_URL`: URL da sua aplicação (ex: https://seu-app.vercel.app)
   - `CRON_SECRET`: Mesma string aleatória usada na API

---

## Opção 4: Usar um Serviço de Cron Externo

### Serviços Recomendados:
- **Cron-job.org** (gratuito)
- **EasyCron** (gratuito com limitações)
- **UptimeRobot** (gratuito)

### Configuração (exemplo com Cron-job.org):

1. Crie uma conta em https://cron-job.org
2. Crie um novo job:
   - **URL**: `https://seu-app.vercel.app/api/cron/mark-missed-tasks`
   - **Schedule**: `0 0 * * *` (meia-noite todos os dias)
   - **Method**: GET
   - **Headers**: `Authorization: Bearer seu-cron-secret`
3. Salve e ative o job

---

## ✅ Verificação

Para verificar se está funcionando:

### 1. Verificar logs

- **Vercel**: Dashboard > Functions > Logs
- **Supabase**: Dashboard > Logs > Postgres Logs

### 2. Testar manualmente

Execute no Supabase SQL Editor:

```sql
-- Ver tarefas pendentes antigas
SELECT COUNT(*) FROM form_schedule_tasks 
WHERE status = 'pending' 
AND scheduled_date < CURRENT_DATE;

-- Executar manualmente
SELECT mark_missed_tasks();

-- Verificar se foram marcadas
SELECT COUNT(*) FROM form_schedule_tasks 
WHERE status = 'missed' 
AND scheduled_date = CURRENT_DATE - INTERVAL '1 day';
```

### 3. Testar a API (se usar Opção 2 ou 3)

```bash
curl -X GET "https://seu-app.vercel.app/api/cron/mark-missed-tasks" \
  -H "Authorization: Bearer seu-cron-secret"
```

---

## 🎯 Recomendação

**Para a maioria dos casos, recomendo a Opção 2 (Vercel Cron Jobs)** porque:
- ✅ Integrado com Vercel (se você já usa)
- ✅ Fácil de configurar
- ✅ Logs integrados
- ✅ Não precisa de serviços externos
- ✅ Gratuito para uso básico

---

## 📝 Notas Importantes

1. **Timezone**: Os cron jobs geralmente usam UTC. Ajuste o horário conforme necessário
2. **Segurança**: Sempre use autenticação (CRON_SECRET) nas rotas de cron
3. **Service Role Key**: Use a service role key do Supabase para bypass RLS nas funções
4. **Falhas**: Configure alertas/notificações para quando o job falhar

---

## 🆘 Troubleshooting

### O job não está executando

1. Verifique os logs no Vercel/Supabase
2. Teste a função manualmente no Supabase
3. Verifique se o CRON_SECRET está correto
4. Verifique se a service role key está configurada

### Erro de permissão

Certifique-se de usar a **service role key** do Supabase, não a anon key.

### Timezone incorreto

Ajuste o horário do cron. Exemplo para meia-noite no horário de Brasília (UTC-3):
- Vercel: `0 3 * * *` (3h UTC = meia-noite BRT)

