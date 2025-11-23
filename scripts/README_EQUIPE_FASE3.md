# Fase 3 - Módulo de Equipe

## 📋 Visão Geral

A Fase 3 implementa funcionalidades avançadas de gestão de equipe:
- **Processo de Rescisão**: Cálculo automático de verbas rescisórias e checklist completo
- **Avaliações de Performance**: Sistema de avaliação com múltiplos critérios
- **Relatórios Gerenciais**: Dashboards e exportação de dados

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`terminations`** - Processos de rescisão
   - Cálculo automático de verbas rescisórias
   - Checklist de rescisão
   - Status do processo

2. **`performance_reviews`** - Avaliações de desempenho
   - Critérios de avaliação (JSONB)
   - Comentários e feedback
   - Plano de desenvolvimento

3. **`employee_goals`** - Metas individuais
   - Metas de vendas
   - Metas adicionais (JSONB)
   - Acompanhamento de progresso

## 🚀 Instalação

### 1. Executar Script SQL

Execute o script SQL no Supabase SQL Editor:

```sql
-- Execute o arquivo: scripts/create-equipe-phase3-tables.sql
```

O script cria:
- As 3 novas tabelas
- Índices para performance
- Triggers para `updated_at`
- Políticas RLS (Row Level Security)

### 2. Verificar Permissões

Certifique-se de que as políticas RLS estão ativas:

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('terminations', 'performance_reviews', 'employee_goals');
```

## 📦 Componentes Criados

### 1. RescisaoView.tsx
**Localização**: `src/components/equipe/RescisaoView.tsx`

**Funcionalidades**:
- Iniciar processo de rescisão
- Cálculo automático de verbas rescisórias:
  - Saldo de salário
  - Férias proporcionais
  - 13º salário proporcional
  - Aviso prévio
  - FGTS e multa
- Checklist de rescisão interativo
- Acompanhamento de progresso
- Atualização automática do status do colaborador

**Cálculos Implementados**:
```typescript
- Saldo de salário (proporcional aos dias trabalhados)
- Férias proporcionais (baseado em meses trabalhados)
- 13º salário proporcional
- Aviso prévio (30 dias para sem justa causa)
- FGTS (8% do salário acumulado)
- Multa do FGTS (40% quando sem justa causa)
```

### 2. PerformanceView.tsx
**Localização**: `src/components/equipe/PerformanceView.tsx`

**Funcionalidades**:
- Criar avaliações de performance
- 8 critérios de avaliação (0-10):
  - Desempenho em Vendas
  - Atendimento ao Cliente
  - Conhecimento Técnico
  - Pontualidade
  - Trabalho em Equipe
  - Iniciativa
  - Comunicação
  - Resolução de Problemas
- Cálculo automático de média
- Pontos fortes e áreas de melhoria
- Filtros por período
- Resumo estatístico

### 3. RelatoriosView.tsx
**Localização**: `src/components/equipe/RelatoriosView.tsx`

**Funcionalidades**:
- Relatórios gerenciais completos
- Filtros por período:
  - Hoje
  - Esta semana
  - Este mês
  - Personalizado
- Métricas exibidas:
  - Movimentação de pessoal (admissões/rescisões)
  - Horas trabalhadas e extras
  - Férias (pendentes/aprovadas)
  - Solicitações pendentes
  - Performance média
  - Escalas e cobertura
- Exportação para CSV

## 🎯 Como Usar

### Processo de Rescisão

1. Acesse a aba **"Rescisão"** no módulo de Equipe
2. Clique em **"Novo Processo"**
3. Selecione o colaborador e preencha os dados:
   - Data de desligamento
   - Tipo de rescisão
   - Motivo
4. O sistema calcula automaticamente as verbas rescisórias
5. Complete o checklist de rescisão conforme os itens são concluídos
6. O processo é marcado como concluído quando todos os itens são finalizados

### Avaliações de Performance

1. Acesse a aba **"Performance"**
2. Clique em **"Nova Avaliação"**
3. Selecione o colaborador e período
4. Avalie cada critério (0-10)
5. Preencha pontos fortes e áreas de melhoria
6. Adicione comentários gerais
7. Salve a avaliação

### Relatórios Gerenciais

1. Acesse a aba **"Relatórios"**
2. Selecione o período desejado
3. Visualize as métricas em cards e gráficos
4. Clique em **"Exportar CSV"** para baixar os dados

## 🔒 Segurança (RLS)

As políticas RLS garantem que:
- Usuários só veem dados de suas lojas
- Gerentes podem gerenciar processos de suas lojas
- Colaboradores podem ver suas próprias avaliações e metas
- Admins têm acesso completo

## 📊 Estrutura de Dados

### Terminations (Rescisões)

```typescript
{
  id: UUID
  employee_id: UUID
  store_id: UUID
  termination_date: DATE
  termination_type: 'without_cause' | 'with_cause' | 'resignation' | 'contract_end'
  reason: TEXT
  severance_calculation: JSONB // Cálculos automáticos
  checklist: JSONB // Checklist de rescisão
  status: 'in_progress' | 'completed' | 'cancelled'
  created_at: TIMESTAMP
  completed_at: TIMESTAMP
  notes: TEXT
}
```

### Performance Reviews (Avaliações)

```typescript
{
  id: UUID
  employee_id: UUID
  store_id: UUID
  review_period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' | 'custom'
  review_date: DATE
  scores: JSONB // { criterion: score }
  comments: TEXT
  strengths: TEXT
  improvement_areas: TEXT
  development_plan: JSONB
  reviewer_id: UUID
  created_at: TIMESTAMP
}
```

### Employee Goals (Metas)

```typescript
{
  id: UUID
  employee_id: UUID
  store_id: UUID
  goal_period: 'monthly' | 'quarterly' | 'annual'
  period_start: DATE
  period_end: DATE
  sales_target: NUMERIC
  sales_achieved: NUMERIC
  additional_goals: JSONB
  status: 'active' | 'completed' | 'cancelled'
  created_at: TIMESTAMP
}
```

## 🐛 Troubleshooting

### Erro: "Tabela não encontrada"
- Verifique se o script SQL foi executado completamente
- Confirme que as tabelas foram criadas no schema `public`

### Erro: "Permissão negada"
- Verifique as políticas RLS
- Confirme que o usuário tem acesso à loja através de `store_members`

### Cálculos de rescisão incorretos
- Verifique se o colaborador tem `salary_base` e `hire_date` preenchidos
- Confirme que a data de desligamento é válida

## 📝 Próximos Passos

Funcionalidades que podem ser adicionadas:
- Integração com folha de pagamento
- Geração de documentos (TRCT, etc.)
- Notificações automáticas
- Gráficos avançados nos relatórios
- Exportação para PDF
- Histórico completo de processos

## ✅ Checklist de Implementação

- [x] Criar tabelas no Supabase
- [x] Implementar RescisaoView
- [x] Implementar PerformanceView
- [x] Implementar RelatoriosView
- [x] Adicionar tabs no EquipeView
- [x] Configurar RLS policies
- [x] Testar cálculos de rescisão
- [x] Testar avaliações de performance
- [x] Testar exportação de relatórios

## 📚 Referências

- [Documentação Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Cálculo de Verbas Rescisórias - CLT](https://www.gov.br/trabalho-e-emprego/pt-br)
- [Avaliação de Desempenho - Boas Práticas](https://www.gestao.org.br/)

