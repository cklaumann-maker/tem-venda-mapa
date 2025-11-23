# 📋 Análise Completa - Aba de Gestão de Equipe

## 🎯 Visão Geral

A aba de **Gestão de Equipe** deve ser um módulo completo para administração de recursos humanos em farmácias, integrado ao sistema TEM VENDA. Deve permitir controle total sobre colaboradores, escalas, horas trabalhadas, processos de admissão/rescisão e compliance trabalhista.

---

## 📊 Módulos Principais

### 1. 👥 **Gestão de Colaboradores**

#### 1.1 Cadastro de Colaboradores
- **Dados Pessoais:**
  - Nome completo
  - CPF (validação)
  - RG
  - Data de nascimento
  - Gênero
  - Estado civil
  - Nacionalidade
  - Foto do colaborador (upload)
  
- **Dados de Contato:**
  - Email pessoal
  - Email corporativo (se houver)
  - Telefone celular (WhatsApp)
  - Telefone residencial
  - Endereço completo (CEP, rua, número, complemento, bairro, cidade, estado)
  
- **Dados Profissionais:**
  - Cargo/Função (Farmacêutico, Balconista, Caixa, Gerente, etc.)
  - Setor/Departamento
  - Data de admissão
  - Status (Ativo, Afastado, Férias, Licença, Desligado)
  - Tipo de contrato (CLT, PJ, Estagiário, Temporário)
  - Salário base
  - Comissão (%)
  - Loja/Unidade vinculada
  - Supervisor/Gerente responsável
  
- **Dados Bancários:**
  - Banco
  - Agência
  - Conta corrente
  - Tipo de conta (Corrente/Poupança)
  - PIX (chave)

- **Dados de Acesso ao Sistema:**
  - Usuário vinculado (se tiver acesso ao sistema)
  - Permissões/Roles
  - Data de última atualização

#### 1.2 Listagem e Filtros
- Lista completa de colaboradores
- Filtros por:
  - Status (Ativo, Afastado, Férias, Desligado)
  - Loja/Unidade
  - Cargo/Função
  - Setor
  - Data de admissão (range)
  - Busca por nome, CPF, email
- Ordenação por nome, cargo, data de admissão
- Exportação para Excel/PDF
- Paginação

#### 1.3 Visualização Detalhada
- Perfil completo do colaborador
- Histórico de alterações
- Documentos anexados
- Escalas atribuídas
- Horas trabalhadas (resumo)
- Avaliações de performance
- Histórico de férias e licenças

---

### 2. 📅 **Gestão de Escalas**

#### 2.1 Criação de Escalas
- **Configuração de Turnos:**
  - Nome do turno (Manhã, Tarde, Noite, Integral)
  - Horário de entrada
  - Horário de saída
  - Intervalo para almoço/jantar
  - Duração total (horas)
  - Dias da semana aplicáveis
  
- **Escala Semanal/Mensal:**
  - Seleção de colaboradores
  - Atribuição de turnos por dia
  - Período da escala (semana/mês)
  - Substituições e folgas
  - Visualização em calendário
  - Visualização em grade (colaborador x dia)
  
- **Regras de Escala:**
  - Horas mínimas/máximas por semana
  - Intervalo mínimo entre turnos
  - Folgas obrigatórias
  - Limite de horas extras
  - Validação automática de conflitos

#### 2.2 Visualização de Escalas
- Calendário mensal com escalas
- Vista semanal detalhada
- Vista por colaborador
- Vista por turno
- Indicadores visuais:
  - Colaboradores presentes
  - Faltas/atrasos
  - Horas extras programadas
  - Folgas

#### 2.3 Controle de Ponto
- **Registro de Ponto:**
  - Entrada
  - Saída para intervalo
  - Retorno do intervalo
  - Saída final
  - Tipo (Presencial, Home Office, Falta, Atraso)
  - Justificativa (se houver)
  - Aprovação do supervisor
  
- **Relatórios de Ponto:**
  - Resumo diário
  - Resumo semanal
  - Resumo mensal
  - Horas trabalhadas vs. horas contratadas
  - Horas extras acumuladas
  - Banco de horas
  - Faltas e atrasos

---

### 3. ⏰ **Gestão de Horas Extras**

#### 3.1 Solicitação de Horas Extras
- Formulário de solicitação
- Data e horário
- Motivo/justificativa
- Aprovação do supervisor/gerente
- Tipo (Hora extra, Banco de horas, Compensação)
- Status (Pendente, Aprovada, Rejeitada)

#### 3.2 Controle e Aprovação
- Lista de solicitações pendentes
- Filtros por colaborador, período, status
- Aprovação em lote
- Histórico de aprovações
- Notificações (WhatsApp/Email)

#### 3.3 Cálculo e Pagamento
- Cálculo automático:
  - Hora extra 50% (até 2h/dia)
  - Hora extra 100% (após 2h/dia ou domingos/feriados)
  - Banco de horas (crédito)
  - Compensação (folga)
- Integração com folha de pagamento
- Relatórios de horas extras por período
- Exportação para contabilidade

---

### 4. ➕ **Processo de Admissão**

#### 4.1 Checklist de Admissão
- **Documentos Obrigatórios:**
  - Carteira de Trabalho (digitalizada)
  - RG e CPF
  - Comprovante de residência
  - Título de eleitor
  - Certificado de reservista (se aplicável)
  - Certidão de casamento (se aplicável)
  - PIS/PASEP
  - Comprovante bancário
  - Atestado médico (ASO)
  - Exames admissionais
  - Certificados profissionais (CRF para farmacêuticos)
  
- **Etapas do Processo:**
  - ✅ Cadastro inicial
  - ✅ Coleta de documentos
  - ✅ Exames médicos
  - ✅ Treinamento inicial
  - ✅ Acesso ao sistema
  - ✅ Uniforme/EPIs
  - ✅ Admissão concluída

#### 4.2 Workflow de Admissão
- Status do processo (Em andamento, Concluído, Pendente)
- Responsáveis por cada etapa
- Prazos e alertas
- Notificações automáticas
- Histórico completo

#### 4.3 Templates e Documentos
- Contrato de trabalho (template)
- Termo de confidencialidade
- Política da empresa
- Ficha de cadastro
- Geração automática de documentos

---

### 5. ➖ **Processo de Rescisão**

#### 5.1 Checklist de Rescisão
- **Documentos e Procedimentos:**
  - Aviso prévio (trabalhado ou indenizado)
  - Data de desligamento
  - Motivo da rescisão
  - Tipo (Sem justa causa, Com justa causa, Pedido de demissão, Término de contrato)
  - Cálculo de verbas rescisórias
  - Entrega de documentos
  - Devolução de uniformes/EPIs
  - Desligamento de acessos (sistema, email, etc.)
  - Saída médica (se aplicável)
  
- **Cálculo de Verbas:**
  - Saldo de salário
  - Férias proporcionais
  - 13º salário proporcional
  - Aviso prévio
  - FGTS
  - Multa do FGTS (40%)
  - Horas extras pendentes
  - Adicional noturno
  - Comissões pendentes
  - Descontos (adiantamentos, empréstimos)

#### 5.2 Workflow de Rescisão
- Status do processo
- Aprovações necessárias
- Prazos legais
- Geração de documentos (TRCT, etc.)
- Integração com contabilidade
- Histórico completo

---

### 6. 📄 **Gestão de Documentos**

#### 6.1 Armazenamento
- Upload de documentos por colaborador
- Categorização (Admissão, Férias, Licenças, Rescisão, etc.)
- Validação de tipos de arquivo
- Limite de tamanho
- Versionamento

#### 6.2 Controle de Validade
- Alertas de documentos vencendo:
  - Certidões
  - Certificados profissionais (CRF)
  - Exames médicos (ASO)
  - Treinamentos
  - Licenças
- Notificações automáticas
- Renovação programada

#### 6.3 Compliance Trabalhista
- Checklist de conformidade
- Auditoria de documentos
- Relatórios de compliance
- Alertas de não conformidade

---

### 7. 🏥 **Férias e Licenças**

#### 7.1 Gestão de Férias
- **Solicitação:**
  - Período desejado
  - Colaborador
  - Aprovação do supervisor
  - Status (Pendente, Aprovada, Rejeitada)
  
- **Controle:**
  - Saldo de férias
  - Período aquisitivo
  - Férias vencidas
  - Férias programadas
  - Calendário de férias
  - Substituições durante férias

#### 7.2 Licenças e Afastamentos
- **Tipos:**
  - Licença médica
  - Licença maternidade/paternidade
  - Licença sem vencimento
  - Atestado médico
  - Abono
  - Falta justificada
  
- **Controle:**
  - Período de afastamento
  - Documentos necessários
  - Aprovação
  - Impacto no salário
  - Retorno programado

---

### 8. 📊 **Performance e Avaliações**

#### 8.1 Avaliações de Desempenho
- Período de avaliação (trimestral, semestral, anual)
- Critérios de avaliação:
  - Metas de vendas
  - Atendimento ao cliente
  - Conhecimento técnico
  - Pontualidade
  - Trabalho em equipe
  - Iniciativa
- Notas e comentários
- Plano de desenvolvimento
- Histórico de avaliações

#### 8.2 Metas Individuais
- Metas de vendas por colaborador
- Acompanhamento em tempo real
- Comparativo com equipe
- Ranking de desempenho
- Bonificações por meta

---

### 9. 💰 **Folha de Pagamento (Integração)**

#### 9.1 Dados para Folha
- Horas trabalhadas
- Horas extras
- Faltas e atrasos
- Comissões
- Adiantamentos
- Descontos
- Benefícios

#### 9.2 Relatórios
- Resumo mensal por colaborador
- Exportação para sistema de folha
- Comparativo mensal
- Gráficos de custo de mão de obra

---

### 10. 🔔 **Notificações e Comunicações**

#### 10.1 Integração Z-API (WhatsApp)
- Notificações automáticas:
  - Confirmação de escala
  - Lembrete de ponto
  - Aprovação de horas extras
  - Documentos vencendo
  - Férias aprovadas
  - Avisos importantes
  
#### 10.2 Email
- Comunicados gerais
- Relatórios periódicos
- Alertas de compliance

---

## 🗄️ Estrutura de Dados Sugerida (Supabase)

### Tabelas Principais

#### `employees` (Colaboradores)
```sql
- id (uuid, PK)
- store_id (uuid, FK -> stores)
- user_id (uuid, FK -> auth.users, nullable)
- name (text)
- cpf (text, unique)
- rg (text)
- birth_date (date)
- email (text)
- phone (text)
- address (jsonb)
- position (text) -- Cargo
- department (text)
- hire_date (date)
- status (text) -- active, on_leave, terminated
- contract_type (text) -- CLT, PJ, intern
- salary_base (numeric)
- commission_rate (numeric)
- bank_account (jsonb)
- photo_url (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `employee_shifts` (Escalas)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- store_id (uuid, FK -> stores)
- shift_date (date)
- shift_type (text) -- morning, afternoon, night, full
- start_time (time)
- end_time (time)
- break_duration (integer) -- minutos
- status (text) -- scheduled, confirmed, completed, absent
- created_at (timestamp)
```

#### `time_records` (Registro de Ponto)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- record_date (date)
- entry_time (timestamp)
- exit_break_time (timestamp, nullable)
- return_break_time (timestamp, nullable)
- exit_time (timestamp, nullable)
- total_hours (numeric)
- overtime_hours (numeric)
- status (text) -- present, absent, late, justified
- justification (text, nullable)
- approved_by (uuid, FK -> employees, nullable)
- created_at (timestamp)
```

#### `overtime_requests` (Solicitações de Horas Extras)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- request_date (date)
- start_time (timestamp)
- end_time (timestamp)
- hours (numeric)
- reason (text)
- status (text) -- pending, approved, rejected
- approved_by (uuid, FK -> employees, nullable)
- approved_at (timestamp, nullable)
- created_at (timestamp)
```

#### `employee_documents` (Documentos)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- document_type (text) -- admission, license, certificate, etc.
- document_name (text)
- file_url (text)
- expiry_date (date, nullable)
- is_valid (boolean)
- uploaded_at (timestamp)
- uploaded_by (uuid, FK -> employees)
```

#### `admissions` (Processos de Admissão)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- store_id (uuid, FK -> stores)
- status (text) -- in_progress, completed, cancelled
- checklist (jsonb) -- etapas concluídas
- started_at (timestamp)
- completed_at (timestamp, nullable)
- created_by (uuid, FK -> employees)
```

#### `terminations` (Processos de Rescisão)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- termination_date (date)
- termination_type (text) -- without_cause, with_cause, resignation, contract_end
- reason (text)
- severance_calculation (jsonb)
- status (text) -- in_progress, completed
- completed_at (timestamp, nullable)
- created_by (uuid, FK -> employees)
```

#### `vacations` (Férias)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- start_date (date)
- end_date (date)
- days (integer)
- status (text) -- requested, approved, rejected, taken
- approved_by (uuid, FK -> employees, nullable)
- requested_at (timestamp)
```

#### `leaves` (Licenças/Afastamentos)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- leave_type (text) -- medical, maternity, unpaid, etc.
- start_date (date)
- end_date (date)
- reason (text)
- document_url (text, nullable)
- status (text) -- pending, approved, active, completed)
- approved_by (uuid, FK -> employees, nullable)
```

#### `performance_reviews` (Avaliações)
```sql
- id (uuid, PK)
- employee_id (uuid, FK -> employees)
- review_period (text) -- Q1, Q2, Q3, Q4, annual
- review_date (date)
- scores (jsonb) -- critérios e notas
- comments (text)
- reviewer_id (uuid, FK -> employees)
- created_at (timestamp)
```

---

## 🎨 Interface do Usuário

### Layout Principal
- **Sidebar de Navegação:**
  - 👥 Colaboradores
  - 📅 Escalas
  - ⏰ Ponto/Horas Extras
  - ➕ Admissões
  - ➖ Rescisões
  - 📄 Documentos
  - 🏥 Férias e Licenças
  - 📊 Performance
  - ⚙️ Configurações

### Dashboard da Aba
- Cards com métricas:
  - Total de colaboradores ativos
  - Colaboradores em férias
  - Processos de admissão pendentes
  - Horas extras do mês
  - Taxa de absenteísmo
  - Próximos vencimentos de documentos

---

## 🔐 Permissões e Roles

### Admin
- Acesso total a todas as funcionalidades
- Pode criar, editar e excluir qualquer registro
- Acesso a relatórios gerenciais

### Gerente
- Visualizar colaboradores da sua loja
- Criar e aprovar escalas
- Aprovar horas extras
- Visualizar ponto
- Gerenciar férias e licenças

### RH
- Cadastro completo de colaboradores
- Processos de admissão e rescisão
- Gestão de documentos
- Relatórios de compliance

### Colaborador
- Visualizar própria escala
- Registrar próprio ponto
- Solicitar horas extras
- Solicitar férias
- Visualizar próprios documentos

---

## 🔄 Integrações Necessárias

1. **Supabase** (já integrado)
   - Banco de dados
   - Autenticação
   - Storage para documentos

2. **Z-API** (já integrado)
   - Notificações WhatsApp

3. **Sistema de Folha** (futuro)
   - Exportação de dados
   - API de integração

4. **Sistema de Vendas** (já existe)
   - Metas individuais
   - Comissões

---

## 📈 Priorização de Implementação

### Fase 1 - MVP (Mínimo Viável)
1. ✅ Cadastro básico de colaboradores
2. ✅ Listagem e filtros
3. ✅ Criação de escalas simples
4. ✅ Registro de ponto básico
5. ✅ Visualização de horas trabalhadas

### Fase 2 - Funcionalidades Essenciais
1. ✅ Gestão de horas extras
2. ✅ Processo de admissão (checklist)
3. ✅ Upload de documentos
4. ✅ Gestão de férias
5. ✅ Notificações via WhatsApp

### Fase 3 - Funcionalidades Avançadas
1. ✅ Processo de rescisão completo
2. ✅ Avaliações de performance
3. ✅ Relatórios gerenciais
4. ✅ Compliance e alertas
5. ✅ Integração com folha

---

## ✅ Checklist de Requisitos

- [ ] Cadastro completo de colaboradores
- [ ] Gestão de escalas (semanal/mensal)
- [ ] Registro e controle de ponto
- [ ] Gestão de horas extras
- [ ] Processo de admissão com checklist
- [ ] Processo de rescisão com cálculos
- [ ] Upload e gestão de documentos
- [ ] Controle de validade de documentos
- [ ] Gestão de férias
- [ ] Gestão de licenças e afastamentos
- [ ] Avaliações de desempenho
- [ ] Metas individuais
- [ ] Notificações via WhatsApp
- [ ] Relatórios e exportações
- [ ] Dashboard com métricas
- [ ] Permissões por role
- [ ] Integração com sistema existente

---

## 🎯 Conclusão

A aba de Gestão de Equipe deve ser um módulo completo e robusto, integrado ao sistema TEM VENDA, que permita controle total sobre os recursos humanos da farmácia. A implementação deve ser feita em fases, priorizando as funcionalidades mais críticas primeiro (MVP) e depois expandindo para funcionalidades avançadas.

A integração com o sistema existente (autenticação, lojas, Z-API) é fundamental para manter a consistência e aproveitar a infraestrutura já estabelecida.

