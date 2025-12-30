# Especificação: Campos para Redes e Lojas

**Versão:** 1.0  
**Data:** 2025-12-29  
**Status:** Proposta para Implementação

## 📋 Visão Geral

Este documento especifica os campos necessários para cadastro de **Redes** (Networks) e **Lojas** (Stores) no sistema, classificando-os como **obrigatórios** ou **opcionais**, seguindo práticas de mercado para sistemas de gestão comercial/retail.

### Contexto Importante

- **Redes NÃO necessariamente têm CNPJ**: Um proprietário pode ter múltiplas lojas (cada uma com seu próprio CNPJ) sem um CNPJ centralizado para a rede. Por exemplo, uma pessoa física com 2 farmácias, cada uma com CNPJ próprio. Portanto, CNPJ e razão social são **OPCIONAIS** para redes.

- **Lojas SEMPRE têm CNPJ e Razão Social**: Diferentemente das redes, todas as lojas são entidades jurídicas e **devem** ter CNPJ e razão social. Estes campos são **OBRIGATÓRIOS** para lojas.

- **Toda rede deve ter no mínimo 1 loja**: O processo de criação de rede deve incluir a criação de pelo menos uma loja (com CNPJ e razão social obrigatórios).

---

## 🔍 Processo de Verificação Antes da Implementação

**IMPORTANTE**: Antes de implementar qualquer mudança no banco de dados:

1. **Verificar estrutura atual via MCP Supabase**:
   ```sql
   -- Para networks
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'networks'
   ORDER BY ordinal_position;
   
   -- Para stores
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'stores'
   ORDER BY ordinal_position;
   ```

2. **Verificar se campos já existem**: Não criar campos duplicados
3. **Verificar constraints e índices existentes**: Preservar integridade
4. **Verificar políticas RLS**: Garantir que novos campos sejam incluídos nas políticas quando necessário

---

## 📊 REDES (Networks)

### Campos Obrigatórios

Campos mínimos necessários para criar uma rede válida no sistema.

| Campo | Tipo | Descrição | Validação |
|-------|------|-----------|-----------|
| `name` | TEXT | Nome da rede | 2-255 caracteres, único no sistema |
| `primary_email` | TEXT | E-mail principal para comunicação | E-mail válido |
| `primary_phone` | TEXT | Telefone principal para contato | Telefone válido (formato brasileiro) |
| `zip_code` | TEXT | CEP do endereço principal | CEP válido (8 dígitos) |
| `state` | TEXT | Estado (UF) | 2 caracteres, UF válida |
| `city` | TEXT | Cidade | 2-100 caracteres |
| `logo_url` | TEXT | URL do logo da rede | URL válida |
| `street` | TEXT | Logradouro (rua, avenida, etc.) | 1-255 caracteres |
| `street_number` | TEXT | Número do endereço | 1-20 caracteres |
| `neighborhood` | TEXT | Bairro | 1-100 caracteres |

**Total: 10 campos obrigatórios**

### Campos Opcionais

Campos que enriquecem o cadastro mas não são essenciais para criação.

#### Dados Básicos
| Campo | Tipo | Descrição | Observações |
|-------|------|-----------|-------------|
| `trade_name` | TEXT | Nome fantasia | Se diferente do nome |
| `cnpj` | TEXT | CNPJ da rede | **Opcional** - Nem toda rede tem CNPJ próprio (ex: pessoa física com múltiplas lojas) |
| `company_name` | TEXT | Razão social da rede | **Opcional** - Apenas se houver CNPJ da rede |
| `state_registration` | TEXT | Inscrição estadual | Se aplicável |
| `municipal_registration` | TEXT | Inscrição municipal | Se aplicável |
| `website` | TEXT | Site da rede | URL válida |

**Nota Importante**: Redes podem não ter CNPJ quando o proprietário é pessoa física ou quando cada loja tem seu próprio CNPJ. Porém, **todas as lojas devem ter CNPJ e razão social obrigatoriamente**.

#### Endereço Completo
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `address_complement` | TEXT | Complemento (apto, sala, etc.) |

#### Contatos Adicionais
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `secondary_phone` | TEXT | Telefone secundário |
| `secondary_email` | TEXT | E-mail secundário |

#### Métricas Operacionais
| Campo | Tipo | Descrição | Observações |
|-------|------|-----------|-------------|
| `founded_at` | DATE | Data de fundação da rede | Para análises históricas |
| `estimated_store_count` | INTEGER | Quantidade estimada de lojas | Para planejamento |
| `monthly_revenue_target` | BIGINT | Meta de faturamento mensal (em centavos) | Para acompanhamento de metas |
| `avg_employees_per_store` | INTEGER | Média de funcionários por loja | Para planejamento de recursos |
| `market_segment` | TEXT | Segmento de mercado | Enum: 'farmacia', 'supermercado', 'varejo', 'outro' |
| `business_model` | TEXT | Modelo de negócio | Enum: 'franquia', 'propria', 'mista' |

#### Configurações Financeiras
| Campo | Tipo | Descrição | Default |
|-------|------|-----------|---------|
| `currency` | TEXT | Moeda principal | 'BRL' |
| `fiscal_month_end_day` | INTEGER | Dia de fechamento do mês fiscal | 1-31 |
| `primary_bank_code` | TEXT | Código do banco principal | Código FEBRABAN |

#### Integrações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `erp_integration` | BOOLEAN | Se tem integração ERP ativa |
| `erp_type` | TEXT | Tipo de ERP utilizado |

#### Outros
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `internal_notes` | TEXT | Notas internas (não visíveis para a rede) |
| `tags` | TEXT[] | Array de tags para categorização |

### Campos de Sistema (já existem)
- `id` (UUID, PK)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN)
- `deactivated_at` (TIMESTAMPTZ)
- `deactivated_by` (UUID)

---

## 🏪 LOJAS (Stores)

### Campos Obrigatórios

Campos mínimos necessários para criar uma loja válida no sistema.

| Campo | Tipo | Descrição | Validação |
|-------|------|-----------|-----------|
| `name` | TEXT | Nome da loja | 2-255 caracteres |
| `network_id` | UUID | ID da rede à qual pertence | FK para networks(id), NOT NULL |
| `cnpj` | TEXT | CNPJ da loja | CNPJ válido (14 dígitos), único |
| `company_name` | TEXT | Razão social da loja | 2-255 caracteres |
| `zip_code` | TEXT | CEP do endereço | CEP válido (8 dígitos) |
| `state` | TEXT | Estado (UF) | 2 caracteres, UF válida |
| `city` | TEXT | Cidade | 2-100 caracteres |
| `phone` | TEXT | Telefone da loja | Telefone válido |
| `email` | TEXT | E-mail da loja | E-mail válido |

**Total: 12 campos obrigatórios** (incluindo: name, cnpj, company_name, zip_code, state, city, phone, email, street, street_number, neighborhood)

**Nota Importante**: Diferentemente das redes, **todas as lojas devem ter CNPJ e razão social**, pois cada loja é uma entidade jurídica independente (mesmo que pertençam à mesma rede).

### Campos Opcionais

#### Dados Básicos
| Campo | Tipo | Descrição | Observações |
|-------|------|-----------|-------------|
| `logo_url` | TEXT | URL do logo da loja | JÁ EXISTE |
| `internal_code` | TEXT | Código interno (para sistemas legados) | Único por rede |
| `manager_name` | TEXT | Nome do gerente da loja | |
| `trade_name` | TEXT | Nome fantasia da loja | |
| `state_registration` | TEXT | Inscrição estadual | Se aplicável |
| `municipal_registration` | TEXT | Inscrição municipal | Se aplicável |

#### Endereço Completo
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `street` | TEXT | Logradouro | Sim |
| `street_number` | TEXT | Número | Sim |
| `address_complement` | TEXT | Complemento | Não |
| `neighborhood` | TEXT | Bairro | Sim |
| `latitude` | DECIMAL(10,8) | Latitude para mapas |
| `longitude` | DECIMAL(11,8) | Longitude para mapas |

#### Contatos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `secondary_phone` | TEXT | Telefone secundário |
| `secondary_email` | TEXT | E-mail secundário |

#### Operacionais
| Campo | Tipo | Descrição | Observações |
|-------|------|-----------|-------------|
| `opened_at` | DATE | Data de abertura da loja | Para análises temporais |
| `operational_status` | TEXT | Status operacional | Enum: 'ativa', 'em_construcao', 'em_reforma', 'temporariamente_fechada' |
| `area_sqm` | DECIMAL(10,2) | Área em metros quadrados | Para análises de eficiência |
| `employee_count` | INTEGER | Quantidade de funcionários | Métrica atual |
| `cash_register_count` | INTEGER | Quantidade de caixas | Para planejamento |
| `business_hours` | JSONB | Horário de funcionamento | Estrutura: `{"monday": {"open": "08:00", "close": "18:00"}, ...}` |
| `max_customer_capacity` | INTEGER | Capacidade máxima de clientes | Para análises de ocupação |

#### Métricas de Performance
| Campo | Tipo | Descrição | Observações |
|-------|------|-----------|-------------|
| `monthly_revenue_target` | BIGINT | Meta de faturamento mensal (em centavos) | Para acompanhamento |
| `estimated_average_ticket` | BIGINT | Ticket médio estimado (em centavos) | Para análises |
| `daily_customer_target` | INTEGER | Meta de clientes diários | Para acompanhamento |

#### Financeiro
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pos_code` | TEXT | Código do ponto de venda (PDV) |
| `payment_settings` | JSONB | Configurações de pagamento | Métodos aceitos, taxas, etc. |

#### Branding (já existem parcialmente)
| Campo | Tipo | Descrição | Status |
|-------|------|-----------|--------|
| `brand_primary_color` | TEXT | Cor primária do branding | JÁ EXISTE |
| `brand_secondary_color` | TEXT | Cor secundária do branding | JÁ EXISTE |
| `brand_tagline` | TEXT | Tagline/slogan | JÁ EXISTE |
| `brand_cover_url` | TEXT | URL da imagem de capa | JÁ EXISTE |
| `brand_support_email` | TEXT | E-mail de suporte | JÁ EXISTE |
| `brand_support_phone` | TEXT | Telefone de suporte | JÁ EXISTE |

#### Outros
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tags` | TEXT[] | Array de tags |
| `internal_notes` | TEXT | Notas internas |
| `photos` | TEXT[] | Array de URLs de fotos da loja |

### Campos de Sistema (já existem)
- `id` (UUID, PK)
- `org_id` (UUID) - **Compatibilidade**: manter por enquanto
- `network_id` (UUID, FK) - JÁ EXISTE
- `created_at` (TIMESTAMP)
- `is_active` (BOOLEAN)
- `deactivated_at` (TIMESTAMPTZ)
- `deactivated_by` (UUID)

---

## 💡 TOOLTIPS E MOTIVAÇÃO PARA PREENCHIMENTO

Esta seção descreve os tooltips e mensagens de motivação que devem aparecer em cada campo opcional, focando no **valor para o negócio** do proprietário, não na utilidade técnica da ferramenta.

### Como Usar Esta Seção

Cada campo opcional possui:
- **Tooltip**: Texto curto que aparece ao passar o mouse ou clicar no ícone de informação (?) ao lado do campo
- **Motivação**: Texto mais detalhado explicando o **valor de negócio** de preencher o campo

**Diretrizes de Implementação:**
1. **Todos os campos opcionais devem ter um ícone de informação (?) ao lado do label**
2. **Ao passar o mouse ou clicar no ícone, mostrar o tooltip**
3. **Focar sempre no valor para o negócio**: O dono da loja/rede quer saber "o que eu ganho preenchendo isso?", não "para que a ferramenta usa isso?"
4. **Usar linguagem simples e direta**: Evitar jargão técnico, focar em benefícios práticos
5. **Exemplos concretos quando possível**: "Compare com outras lojas da região", "Acompanhe se está batendo a meta", etc.

### Estrutura dos Tooltips

Cada entrada segue este formato:
- **Nome do Campo (label)**: Título do campo como aparece no formulário
- **Tooltip**: Texto curto para o tooltip (máximo 2 linhas)
- **Motivação**: Explicação do valor de negócio (texto mais completo, pode ser usado em ajuda expandida se necessário)

### REDES - Campos Opcionais

#### Dados Básicos

**`trade_name` (Nome Fantasia)**
- **Tooltip**: "Nome comercial diferente da razão social. Ajuda a identificar sua marca nas análises e relatórios."
- **Motivação**: "Use se seu negócio usa um nome comercial conhecido pelos clientes."

**`cnpj` (CNPJ da Rede)**
- **Tooltip**: "CNPJ da rede, se você tiver um CNPJ centralizado. Deixe em branco se cada loja tiver seu próprio CNPJ."
- **Motivação**: "Preencha apenas se sua rede possui CNPJ próprio. Caso contrário, cada loja terá seu CNPJ individual."

**`company_name` (Razão Social da Rede)**
- **Tooltip**: "Razão social registrada no CNPJ da rede."
- **Motivação**: "Necessário apenas se você informou um CNPJ para a rede."

**`state_registration` (Inscrição Estadual)**
- **Tooltip**: "Inscrição estadual da rede. Facilita a emissão de relatórios fiscais e documentos."
- **Motivação**: "Preencha para facilitar a emissão de relatórios fiscais e documentos oficiais."

**`municipal_registration` (Inscrição Municipal)**
- **Tooltip**: "Inscrição municipal da rede. Necessária para algumas operações e relatórios municipais."
- **Motivação**: "Preencha se sua rede possui inscrição municipal, facilitando relatórios e operações locais."

**`website` (Site)**
- **Tooltip**: "Site da sua rede. Pode ser usado em relatórios e comunicações com clientes."
- **Motivação**: "Adicione para que clientes e parceiros possam encontrar mais informações sobre sua rede."

#### Endereço Completo

**`address_complement` (Complemento)**
- **Tooltip**: "Complemento do endereço (sala, andar, etc.). Facilita a localização."
- **Motivação**: "Adicione se houver complemento para facilitar a localização."

#### Contatos Adicionais

**`secondary_phone` (Telefone Secundário)**
- **Tooltip**: "Telefone alternativo de contato. Garante que você seja encontrado mesmo se o telefone principal estiver ocupado."
- **Motivação**: "Adicione um telefone alternativo para garantir que sua rede seja sempre localizável."

**`secondary_email` (E-mail Secundário)**
- **Tooltip**: "E-mail alternativo. Útil para receber relatórios importantes e notificações críticas."
- **Motivação**: "Configure um e-mail alternativo para receber relatórios e alertas importantes."

#### Métricas Operacionais

**`founded_at` (Data de Fundação)**
- **Tooltip**: "Data de fundação da rede. Permite análises de crescimento e comparação com outras redes."
- **Motivação**: "Preencha para acompanhar o histórico de crescimento da sua rede e fazer análises temporais."

**`estimated_store_count` (Quantidade Estimada de Lojas)**
- **Tooltip**: "Número estimado de lojas. Ajuda no planejamento de expansão e alocação de recursos."
- **Motivação**: "Informe para planejar melhor a expansão e distribuição de recursos entre suas lojas."

**`monthly_revenue_target` (Meta de Faturamento Mensal)**
- **Tooltip**: "Meta de faturamento mensal da rede. Permite acompanhar performance e identificar oportunidades de crescimento."
- **Motivação**: "Defina sua meta mensal para acompanhar se sua rede está batendo os objetivos e identificar onde focar esforços."

**`avg_employees_per_store` (Média de Funcionários por Loja)**
- **Tooltip**: "Média de funcionários por loja. Ajuda no planejamento de recursos humanos e análises de produtividade."
- **Motivação**: "Informe para planejar melhor a contratação e distribuição de equipes entre suas lojas."

**`market_segment` (Segmento de Mercado)**
- **Tooltip**: "Segmento de atuação da rede. Permite comparações com outras redes do mesmo segmento."
- **Motivação**: "Selecione para comparar o desempenho da sua rede com outras do mesmo segmento."

**`business_model` (Modelo de Negócio)**
- **Tooltip**: "Modelo de negócio da rede. Ajuda a entender a estrutura operacional e fazer análises comparativas."
- **Motivação**: "Informe para análises mais precisas e comparações com redes que usam o mesmo modelo."

#### Configurações Financeiras

**`currency` (Moeda)**
- **Tooltip**: "Moeda principal de operação. Garante que valores sejam exibidos no formato correto."
- **Motivação**: "Configure para que todos os valores monetários sejam exibidos corretamente nos relatórios."

**`fiscal_month_end_day` (Dia de Fechamento Fiscal)**
- **Tooltip**: "Dia de fechamento do mês fiscal. Ajuda a organizar relatórios e análises mensais."
- **Motivação**: "Configure para que relatórios e análises mensais sejam gerados no período fiscal correto."

**`primary_bank_code` (Código do Banco Principal)**
- **Tooltip**: "Código do banco principal. Facilita integrações financeiras futuras."
- **Motivação**: "Informe para facilitar futuras integrações com sistemas bancários e financeiros."

#### Integrações

**`erp_integration` (Integração ERP)**
- **Tooltip**: "Indica se a rede possui integração com sistema ERP. Permite automatizar processos e sincronizar dados."
- **Motivação**: "Marque se você usa um sistema ERP para facilitar a sincronização de dados e automatizar processos."

**`erp_type` (Tipo de ERP)**
- **Tooltip**: "Tipo de sistema ERP utilizado. Ajuda a identificar oportunidades de integração e automação."
- **Motivação**: "Informe o sistema ERP que você usa para que possamos facilitar futuras integrações."

#### Outros

**`internal_notes` (Notas Internas)**
- **Tooltip**: "Notas internas sobre a rede. Visível apenas para administradores, útil para informações importantes."
- **Motivação**: "Adicione informações relevantes que só você e sua equipe administrativa precisam ver."

**`tags` (Tags)**
- **Tooltip**: "Tags para categorizar sua rede. Facilita a busca e organização quando você gerencia múltiplas redes."
- **Motivação**: "Use tags para organizar e encontrar rapidamente suas redes (ex: 'farmácia', 'região-sul', 'franquia')."

---

### LOJAS - Campos Opcionais

#### Dados Básicos

**`internal_code` (Código Interno)**
- **Tooltip**: "Código interno da loja. Útil se você já usa códigos para identificar suas lojas em outros sistemas."
- **Motivação**: "Adicione se você já possui um código para esta loja em outros sistemas, facilitando a integração."

**`manager_name` (Nome do Gerente)**
- **Tooltip**: "Nome do gerente da loja. Facilita a identificação de responsáveis e comunicação direta."
- **Motivação**: "Informe para facilitar a comunicação direta e identificação de responsáveis pela loja."

**`trade_name` (Nome Fantasia)**
- **Tooltip**: "Nome comercial diferente da razão social. Ajuda a identificar sua loja nas análises e relatórios."
- **Motivação**: "Use se sua loja usa um nome comercial conhecido pelos clientes, diferente da razão social."

**`state_registration` (Inscrição Estadual)**
- **Tooltip**: "Inscrição estadual da loja. Necessária para relatórios fiscais e documentos oficiais."
- **Motivação**: "Preencha para facilitar a emissão de relatórios fiscais e documentos oficiais desta loja."

**`municipal_registration` (Inscrição Municipal)**
- **Tooltip**: "Inscrição municipal da loja. Necessária para algumas operações e relatórios municipais."
- **Motivação**: "Preencha se sua loja possui inscrição municipal, facilitando relatórios e operações locais."

#### Endereço Completo

**`street` (Logradouro)**
- **Tooltip**: "Rua ou avenida da loja. Completa o endereço para entregas, documentos e análises de localização."
- **Motivação**: "Complete para facilitar entregas, localização de clientes e documentos oficiais."

**`street_number` (Número)**
- **Tooltip**: "Número do endereço. Essencial para localização precisa e documentos oficiais."
- **Motivação**: "Adicione para localização precisa e documentos oficiais."

**`address_complement` (Complemento)**
- **Tooltip**: "Complemento do endereço (sala, loja, etc.). Facilita a localização exata da loja."
- **Motivação**: "Adicione se houver complemento para facilitar a localização exata da loja."

**`neighborhood` (Bairro)**
- **Tooltip**: "Bairro da loja. Permite análises de performance por região e comparações com concorrentes locais."
- **Motivação**: "Preencha para comparar o desempenho desta loja com outras da mesma região e identificar oportunidades locais."

**`latitude` / `longitude` (Coordenadas)**
- **Tooltip**: "Coordenadas geográficas da loja. Permite visualização em mapas, análise de alcance e planejamento de entregas."
- **Motivação**: "Adicione para visualizar sua loja em mapas, analisar alcance de entrega e planejar rotas eficientes."

#### Contatos

**`secondary_phone` (Telefone Secundário)**
- **Tooltip**: "Telefone alternativo da loja. Garante que clientes sempre consigam entrar em contato."
- **Motivação**: "Adicione um telefone alternativo para garantir que clientes sempre consigam falar com a loja."

**`secondary_email` (E-mail Secundário)**
- **Tooltip**: "E-mail alternativo da loja. Útil para receber notificações importantes e relatórios."
- **Motivação**: "Configure um e-mail alternativo para garantir que relatórios e alertas importantes sejam recebidos."

#### Operacionais

**`opened_at` (Data de Abertura)**
- **Tooltip**: "Data de abertura da loja. Permite acompanhar performance ao longo do tempo e comparar lojas novas com antigas."
- **Motivação**: "Informe para acompanhar o crescimento da loja desde a abertura e comparar com outras unidades."

**`operational_status` (Status Operacional)**
- **Tooltip**: "Status atual da loja. Ajuda a entender por que uma loja pode estar com performance diferente."
- **Motivação**: "Informe o status atual para que análises considerem se a loja está em funcionamento normal, reforma, etc."

**`area_sqm` (Área em m²)**
- **Tooltip**: "Área da loja em metros quadrados. Permite calcular eficiência (faturamento por m²) e comparar com outras lojas."
- **Motivação**: "Informe para comparar a eficiência desta loja com outras (quanto fatura por metro quadrado)."

**`employee_count` (Quantidade de Funcionários)**
- **Tooltip**: "Número atual de funcionários. Ajuda a analisar produtividade (faturamento por funcionário) e planejar equipe."
- **Motivação**: "Informe para analisar a produtividade da equipe e planejar se precisa contratar mais pessoas."

**`cash_register_count` (Quantidade de Caixas)**
- **Tooltip**: "Número de caixas da loja. Ajuda a planejar capacidade de atendimento e identificar gargalos."
- **Motivação**: "Informe para planejar melhor a capacidade de atendimento e identificar se precisa de mais caixas."

**`business_hours` (Horário de Funcionamento)**
- **Tooltip**: "Horários de funcionamento da loja. Permite análises de performance por horário e planejamento de equipe."
- **Motivação**: "Configure para analisar em quais horários a loja vende mais e planejar melhor a equipe."

**`max_customer_capacity` (Capacidade Máxima)**
- **Tooltip**: "Capacidade máxima de clientes simultâneos. Ajuda a analisar ocupação e planejar melhorias."
- **Motivação**: "Informe para entender se a loja está operando abaixo ou acima da capacidade ideal."

#### Métricas de Performance

**`monthly_revenue_target` (Meta de Faturamento Mensal)**
- **Tooltip**: "Meta de faturamento mensal desta loja. Permite acompanhar se a loja está batendo as metas estabelecidas."
- **Motivação**: "Defina sua meta mensal para acompanhar o desempenho e identificar quando a loja precisa de atenção extra."

**`estimated_average_ticket` (Ticket Médio Estimado)**
- **Tooltip**: "Ticket médio estimado da loja. Ajuda a entender o comportamento de compra dos clientes e planejar estratégias."
- **Motivação**: "Informe para entender quanto cada cliente gasta em média e planejar estratégias para aumentar o ticket médio."

**`daily_customer_target` (Meta de Clientes Diários)**
- **Tooltip**: "Meta de clientes atendidos por dia. Permite acompanhar tráfego e planejar ações para aumentar a visitação."
- **Motivação**: "Defina sua meta diária de clientes para acompanhar se a loja está atraindo visitantes suficientes."

#### Financeiro

**`pos_code` (Código do PDV)**
- **Tooltip**: "Código do ponto de venda. Facilita a integração com sistemas de PDV e identificação em relatórios."
- **Motivação**: "Adicione se você usa sistema de PDV para facilitar a identificação desta loja nos relatórios."

**`payment_settings` (Configurações de Pagamento)**
- **Tooltip**: "Métodos de pagamento aceitos pela loja. Permite análises de preferência de pagamento dos clientes."
- **Motivação**: "Configure para entender como seus clientes preferem pagar e otimizar as formas de pagamento aceitas."

#### Outros

**`tags` (Tags)**
- **Tooltip**: "Tags para categorizar a loja. Facilita a busca e organização quando você gerencia muitas lojas."
- **Motivação**: "Use tags para organizar suas lojas (ex: 'centro', 'shopping', 'drive-thru', '24h')."

**`internal_notes` (Notas Internas)**
- **Tooltip**: "Notas internas sobre a loja. Visível apenas para gestores, útil para informações importantes."
- **Motivação**: "Adicione informações relevantes que só você e sua equipe de gestão precisam ver (ex: 'loja em reforma em janeiro')."

**`photos` (Fotos)**
- **Tooltip**: "Fotos da loja. Ajuda na identificação visual e pode ser usada em relatórios e apresentações."
- **Motivação**: "Adicione fotos da loja para facilitar a identificação visual e usar em relatórios para investidores ou parceiros."

---

## 💾 GESTÃO DE ESTADO E PERSISTÊNCIA DE DADOS

### Contexto e Cenários de Uso

Durante o processo de criação de rede + loja, o usuário pode interromper o fluxo por vários motivos:
- **Fechamento acidental do navegador** (fecha aba/navegador)
- **Perda de conexão** (internet caiu, wifi desconectou)
- **Reinicialização forçada** (luz caiu, computador desligou)
- **Navegação acidental** (clicou em voltar, atualizou a página)
- **Sessão longa** (deixou página aberta por horas)
- **Timeout de sessão** (sessão expirou no meio do processo)

### Estratégia de Persistência Multi-Camada

Para garantir que o usuário não perca dados, implementar uma estratégia de persistência em **3 níveis**:

#### Nível 1: Persistência Local (localStorage) - Rápido e Imediato

**Implementação:**
- Salvar automaticamente dados do formulário a cada 2-3 segundos após mudança
- Usar `localStorage` com chave específica: `network_creation_draft` e `store_creation_draft`
- Dados armazenados localmente no navegador do usuário

**Vantagens:**
- Funciona mesmo offline
- Muito rápido (sem latência de rede)
- Persiste entre atualizações de página
- Não sobrecarrega o servidor

**Limitações:**
- Dados são específicos do navegador/dispositivo
- Pode ser limpo pelo usuário
- Não sincroniza entre dispositivos

**Estrutura de Dados:**
```typescript
interface NetworkCreationDraft {
  networkId?: string; // Se já foi criada a rede parcialmente
  step: number; // Etapa atual do formulário (1-6)
  networkData: Partial<NetworkData>; // Dados da rede preenchidos
  storeData: Partial<StoreData>; // Dados da loja preenchidos
  lastSaved: string; // Timestamp ISO da última alteração
  expiresAt: string; // Timestamp ISO de expiração (7 dias)
}
```

#### Nível 2: Rascunho no Backend - Backup Seguro

**Implementação:**
- Criar tabela `network_creation_drafts` no banco de dados
- Salvar rascunho no backend a cada 10-15 segundos (debounce)
- Associar rascunho ao usuário logado
- Limpar rascunho após criação bem-sucedida

**Vantagens:**
- Persiste mesmo se localStorage for limpo
- Acessível de qualquer dispositivo (se usuário logar)
- Backup seguro dos dados
- Pode ser usado para análise (se usuário abandona frequentemente em certa etapa)

**Limitações:**
- Requer conexão com internet
- Latência de rede
- Precisa de gestão de limpeza (dados expirados)

**Estrutura da Tabela:**
```sql
CREATE TABLE network_creation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_data JSONB NOT NULL,
  store_data JSONB NOT NULL,
  current_step INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_network_drafts_user ON network_creation_drafts(user_id);
CREATE INDEX idx_network_drafts_expires ON network_creation_drafts(expires_at);
```

#### Nível 3: Persistência de Estado da Rede (Se Parcialmente Criada)

**Implementação:**
- Se a rede já foi criada no backend mas a loja não, manter referência do `network_id`
- Permite retomar do ponto onde parou (criar loja para rede existente)
- Evitar criar redes duplicadas

**Validação:**
- Ao retomar, verificar se rede existe mas não tem lojas ativas
- Se rede existe e tem lojas, oferecer opção de adicionar nova loja

---

### Fluxo de Recuperação de Dados

#### Ao Iniciar o Fluxo de Criação

1. **Verificar localStorage** primeiro (mais rápido)
   - Se existe rascunho recente (< 7 dias), perguntar ao usuário:
     ```
     "Você tinha um cadastro em andamento. Deseja continuar de onde parou?"
     [Continuar] [Começar do Zero]
     ```
   - Mostrar resumo: "Rede: [nome], Etapa: [X de 6], Última alteração: [data/hora]"

2. **Verificar backend** (se localStorage vazio ou usuário escolheu "buscar do servidor")
   - Buscar rascunho mais recente do usuário
   - Se existe, mostrar opção de recuperar
   - Se não existe, iniciar fluxo limpo

3. **Verificar rede parcialmente criada**
   - Se usuário já criou rede mas não criou loja, oferecer:
     ```
     "Você já criou a rede '[nome]' mas não finalizou o cadastro da primeira loja. 
     Deseja continuar?"
     [Continuar] [Criar Nova Rede]
     ```

#### Durante o Preenchimento

1. **Auto-save local** a cada 2-3 segundos (sem indicador visual para não poluir UI)
2. **Auto-save backend** a cada 10-15 segundos (com debounce)
3. **Indicador discreto**: Badge pequeno "Salvando..." / "Salvo" no canto superior
4. **Prevenir navegação acidental**: Se usuário tentar sair com dados não salvos, mostrar confirmação:
   ```
   "Você tem alterações não salvas. Deseja realmente sair?"
   [Cancelar] [Sair sem Salvar] [Salvar e Sair]
   ```

#### Expiração e Limpeza

1. **LocalStorage**: Expirar após 7 dias (verificar `expiresAt`)
2. **Backend**: Job automático para limpar rascunhos com mais de 7 dias
3. **Notificação**: Se rascunho está próximo de expirar (1 dia), avisar usuário

---

### Segurança e Privacidade

1. **Dados Sensíveis**: 
   - Não armazenar senhas ou tokens em rascunhos
   - Logs não devem conter dados completos de CNPJ/senhas

2. **Isolamento por Usuário**:
   - Rascunhos sempre associados ao `user_id`
   - RLS policy: usuário só vê seus próprios rascunhos

3. **Criptografia** (se necessário):
   - Se dados muito sensíveis, considerar criptografia antes de salvar em localStorage
   - Backend já tem proteção via RLS

4. **Limpeza Automática**:
   - Limpar rascunhos após criação bem-sucedida
   - Limpar rascunhos expirados automaticamente

---

### Experiência do Usuário (UX)

#### Indicadores Visuais

1. **Indicador de Progresso**: Barra mostrando etapa atual (ex: "Etapa 3 de 6")
2. **Badge de Status**: 
   - "Salvando..." (durante salvamento)
   - "Salvo" (salvo com sucesso)
   - "Não salvo" (se houve erro ou está offline)
3. **Timer de Inatividade**: Se usuário fica mais de 30min inativo, mostrar aviso:
   ```
   "Você está inativo há 30 minutos. Seus dados foram salvos automaticamente."
   ```

#### Mensagens ao Usuário

1. **Ao retomar rascunho**:
   ```
   "Bem-vindo de volta! Você tinha um cadastro em andamento de [data/hora]. 
   Deseja continuar de onde parou?"
   ```

2. **Ao tentar sair com dados não salvos**:
   ```
   "Atenção: Você tem alterações não salvas. 
   
   Suas informações estão sendo salvas automaticamente, mas para garantir 
   que nada seja perdido, recomendamos finalizar o cadastro agora."
   
   [Continuar Editando] [Salvar Rascunho e Sair]
   ```

3. **Ao salvar com sucesso**:
   ```
   "Rascunho salvo com sucesso! Você pode continuar de onde parou a qualquer momento."
   ```

4. **Se houver erro ao salvar**:
   ```
   "Não foi possível salvar automaticamente. Verifique sua conexão. 
   Seus dados estão salvos localmente e serão enviados quando a conexão voltar."
   ```

#### Comportamento Offline

1. **Detectar offline**: Usar `navigator.onLine` e eventos online/offline
2. **Salvar localmente**: Continuar salvando em localStorage mesmo offline
3. **Sincronizar quando voltar**: Ao detectar conexão, sincronizar localStorage → backend
4. **Avisar usuário**: Mostrar badge "Modo Offline" quando desconectado

---

### Implementação Técnica

#### Frontend (React/Next.js)

```typescript
// Hook para gerenciar rascunho
const useNetworkCreationDraft = () => {
  const [draft, setDraft] = useState<NetworkCreationDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Carregar rascunho ao montar
  useEffect(() => {
    loadDraft();
  }, []);
  
  // Auto-save local (rápido)
  useEffect(() => {
    if (draft) {
      const timer = setTimeout(() => {
        saveToLocalStorage(draft);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [draft]);
  
  // Auto-save backend (com debounce)
  const debouncedSave = useDebouncedCallback((data: NetworkCreationDraft) => {
    saveToBackend(data);
  }, 10000);
  
  useEffect(() => {
    if (draft) {
      debouncedSave(draft);
    }
  }, [draft]);
  
  return { draft, setDraft, isSaving };
};
```

#### Backend (API Routes)

```typescript
// Endpoint: POST /api/networks/draft
// Salva rascunho no backend

// Endpoint: GET /api/networks/draft
// Recupera rascunho do usuário

// Endpoint: DELETE /api/networks/draft
// Limpa rascunho após criação bem-sucedida
```

#### Limpeza Automática (Cron Job)

```sql
-- Job para limpar rascunhos expirados (executar diariamente)
DELETE FROM network_creation_drafts
WHERE expires_at < now();
```

---

### Checklist de Implementação

- [ ] Criar hook `useNetworkCreationDraft` para gerenciar estado
- [ ] Implementar salvamento em localStorage com debounce (2-3s)
- [ ] Criar tabela `network_creation_drafts` no banco de dados
- [ ] Criar API endpoint `POST /api/networks/draft` para salvar rascunho
- [ ] Criar API endpoint `GET /api/networks/draft` para recuperar rascunho
- [ ] Criar API endpoint `DELETE /api/networks/draft` para limpar rascunho
- [ ] Implementar RLS policy para `network_creation_drafts` (usuário só vê seus rascunhos)
- [ ] Implementar indicadores visuais (badge "Salvando..." / "Salvo")
- [ ] Implementar detecção de tentativa de saída com dados não salvos
- [ ] Implementar modal de confirmação ao retomar rascunho
- [ ] Implementar detecção de offline/online
- [ ] Implementar sincronização localStorage → backend quando voltar online
- [ ] Criar job de limpeza automática de rascunhos expirados
- [ ] Testar cenários: fechar navegador, atualizar página, perder conexão
- [ ] Testar recuperação de rascunho após login em outro dispositivo
- [ ] Testar expiração de rascunhos

---

## ⚡ OTIMIZAÇÕES DE UX PARA CRIAÇÃO RÁPIDA

### Visão Geral

O processo de criação de rede com múltiplas lojas pode ser demorado se cada loja precisar ser preenchida individualmente. Esta seção propõe melhorias de UX baseadas em boas práticas de grandes empresas de tecnologia (Google Workspace, Microsoft 365, Salesforce, etc.) para acelerar o preenchimento e reduzir erros.

### Princípios de Design (Baseado em Big Techs)

1. **Herança Inteligente**: Campos comuns podem ser herdados da rede para todas as lojas
2. **Bulk Operations**: Operações em massa para múltiplas lojas selecionadas
3. **Smart Suggestions**: Sugestões baseadas em dados anteriores e padrões comuns
4. **Templates e Snippets**: Reutilizar dados de cadastros anteriores
5. **Progressive Disclosure**: Mostrar apenas o necessário, expandir opções conforme necessário
6. **Inline Editing**: Editar múltiplos registros sem sair da visualização
7. **Keyboard Shortcuts**: Atalhos para ações frequentes

### 1. Herança de Dados da Rede para Lojas

**Problema**: Muitos dados são repetitivos entre lojas da mesma rede (estado, cidade, segmento, modelo de negócio, etc.)

**Solução**: Checkbox "Aplicar para todas as lojas" em campos da rede

**Campos Herdáveis da Rede:**
- ✅ Estado (UF) - quase sempre o mesmo
- ✅ Cidade - pode variar, mas muitas vezes é a mesma
- ✅ Segmento de mercado
- ✅ Modelo de negócio
- ✅ Moeda
- ✅ Dia de fechamento fiscal
- ✅ Configurações financeiras (quando aplicável)

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ DADOS DA REDE                                           │
├─────────────────────────────────────────────────────────┤
│ Estado: [SP ▼] [☑ Aplicar para todas as lojas]         │
│ Cidade: [São Paulo______] [☑ Aplicar para todas]       │
│ Segmento: [Farmácia ▼] [☑ Aplicar para todas]          │
└─────────────────────────────────────────────────────────┘

Ao criar lojas, esses campos já vêm preenchidos automaticamente,
mas podem ser editados individualmente.
```

**Benefícios:**
- ✅ Reduz tempo de preenchimento em 60-80% para campos comuns
- ✅ Reduz erros de digitação
- ✅ Mantém consistência entre lojas da mesma rede

### 2. Operações em Massa para Múltiplas Lojas

**Problema**: Após criar várias lojas, usuário precisa editar o mesmo campo em múltiplas lojas

**Solução**: Seleção múltipla + edição em massa

**Funcionalidades:**
1. **Checkbox de Seleção**: Cada loja tem checkbox para seleção
2. **Barra de Ações**: Ao selecionar múltiplas lojas, aparece barra com ações:
   - "Editar selecionadas"
   - "Copiar dados de..."
   - "Aplicar valor a todas"
   - "Limpar campo"
   - "Excluir selecionadas"

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ LOJAS DA REDE                    [✓ Selecionar Todas]   │
├─────────────────────────────────────────────────────────┤
│ [✓] Loja Centro | São Paulo - SP | (11) 99999-9999     │
│ [ ] Loja Shopping | São Paulo - SP | (11) 88888-8888   │
│ [✓] Loja Sul | São Paulo - SP | (11) 77777-7777        │
│ [✓] Loja Norte | São Paulo - SP | (11) 66666-6666      │
├─────────────────────────────────────────────────────────┤
│ [2 lojas selecionadas]                                  │
│ [Editar Selecionadas] [Aplicar Valor] [Copiar Dados]   │
│ [Limpar Campo] [Excluir]                                │
└─────────────────────────────────────────────────────────┘
```

**Modal de Edição em Massa:**
```
┌─────────────────────────────────────────────────────────┐
│ Editar 2 Lojas Selecionadas                            │
├─────────────────────────────────────────────────────────┤
│ Campo: [Segmento de Mercado ▼]                         │
│ Valor: [Farmácia        ]                               │
│                                                        │
│ ⚠️ Este valor será aplicado a TODAS as lojas          │
│ selecionadas, substituindo valores existentes.         │
│                                                        │
│ [Cancelar] [Aplicar a Todas (2 lojas)]                 │
└─────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Reduz tempo de edição em massa em 90%
- ✅ Operações atômicas (aplicar/limpar para múltiplas lojas)
- ✅ Consistência garantida

### 3. Sugestões Inteligentes (Smart Suggestions)

**Problema**: Usuário precisa digitar dados que já foram preenchidos anteriormente ou seguem padrões

**Solução**: Autocomplete e sugestões baseadas em:
- Dados preenchidos anteriormente (mesma sessão)
- Dados de outras lojas da mesma rede
- Padrões comuns (ex: sequência de nomes)

**Campos com Sugestões:**
- **Nome da Loja**: Sugerir "Loja [Cidade]", "Loja [Bairro]", "Loja [Número]"
- **CNPJ**: Se houver padrão (ex: mesmo grupo), sugerir próximo na sequência
- **E-mail**: Sugerir padrão baseado em rede (ex: `loja-centro@rede.com.br`)
- **Telefone**: Sugerir telefones da mesma cidade/região
- **Endereço**: Autocomplete via API de CEP (ViaCEP)
- **Gerente**: Listar gerentes de outras lojas como sugestão

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ Nome da Loja: [Loja Centro________]                    │
│ 💡 Sugestões baseadas em outras lojas:                 │
│    • Loja Shopping                                      │
│    • Loja Sul                                           │
│    • Loja Norte                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CEP: [01310___]                                        │
│ 💡 Encontrado: Av. Paulista, Bela Vista, São Paulo - SP│
│    [Usar este endereço]                                 │
└─────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Reduz tempo de digitação
- ✅ Reduz erros de digitação
- ✅ Mantém padrões consistentes
- ✅ Melhora experiência do usuário

### 4. Templates e Dados Predefinidos

**Problema**: Usuário cria várias redes similares com dados parecidos

**Solução**: Salvar como template ou copiar dados de rede existente

**Funcionalidades:**
1. **"Copiar dados de rede existente"**: Ao criar nova rede, opção de copiar dados de outra
2. **Templates Salvos**: Salvar configurações comuns como templates
3. **Duplicar Loja**: Botão "Duplicar" em cada loja existente

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ Criar Nova Rede                                         │
├─────────────────────────────────────────────────────────┤
│ [Novo Cadastro] [Copiar de Rede Existente ▼]          │
│                                                        │
│ Ou:                                                     │
│ [Usar Template ▼] [Criar Novo Template]                │
│   • Template: Farmácia Padrão                          │
│   • Template: Supermercado                             │
└─────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Acelera criação de redes similares
- ✅ Padroniza configurações
- ✅ Reduz necessidade de repetir dados

### 5. Edição Inline e Tabela Editável

**Problema**: Usuário precisa abrir modal/formulário para editar cada loja

**Solução**: Tabela editável (similar ao Excel/Google Sheets)

**Funcionalidades:**
1. **Clicar para Editar**: Clicar em célula para editar inline
2. **Editar Múltiplas Células**: Tab/Enter para navegar
3. **Validação em Tempo Real**: Feedback imediato ao sair da célula
4. **Salvamento Automático**: Salvar ao sair da célula ou ao pressionar Enter

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ Lojas da Rede                                           │
├──────┬──────────────┬─────────────┬────────────────────┤
│ Nome │ CNPJ         │ Cidade      │ Telefone           │
├──────┼──────────────┼─────────────┼────────────────────┤
│ Loja │ 98.765.432/  │ São Paulo   │ (11) 99999-9999   │
│      │ [EDITANDO]   │             │                    │
└──────┴──────────────┴─────────────┴────────────────────┘
```

**Benefícios:**
- ✅ Edição mais rápida (não precisa abrir modal)
- ✅ Visualização e edição no mesmo lugar
- ✅ Familiar para usuários de planilhas

### 6. Validação e Feedback em Tempo Real

**Problema**: Usuário preenche tudo e só descobre erros ao final

**Solução**: Validação enquanto digita + mensagens claras

**Funcionalidades:**
- ✅ Validação de CNPJ enquanto digita (formato e dígitos verificadores)
- ✅ Validação de CEP com busca automática de endereço
- ✅ Validação de e-mail com preview de formato
- ✅ Indicadores visuais: ✓ válido, ⚠️ aviso, ✗ erro
- ✅ Mensagens de erro específicas e acionáveis

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ CNPJ: [98.765.432/0001-11] ✓ Válido                   │
│                                                        │
│ CEP: [01310-100] ✓ Endereço encontrado                │
│      Av. Paulista, Bela Vista, São Paulo - SP         │
│      [Usar este endereço]                              │
│                                                        │
│ E-mail: [email-invalido] ✗ Formato inválido           │
│         Formato esperado: nome@dominio.com            │
└─────────────────────────────────────────────────────────┘
```

### 7. Atalhos de Teclado

**Problema**: Usuário precisa usar mouse para todas as ações

**Solução**: Atalhos de teclado para ações frequentes

**Atalhos Sugeridos:**
- `Ctrl/Cmd + S`: Salvar rascunho
- `Ctrl/Cmd + Enter`: Criar/Salvar rede
- `Ctrl/Cmd + D`: Duplicar loja selecionada
- `Ctrl/Cmd + A`: Selecionar todas as lojas
- `Tab`: Próximo campo
- `Shift + Tab`: Campo anterior
- `Enter`: Salvar e criar nova loja
- `Delete/Backspace`: Excluir loja selecionada

### 8. Preview e Validação Antes de Criar

**Problema**: Usuário cria rede e só vê problemas depois

**Solução**: Tela de preview com validação completa antes de criar

**Funcionalidades:**
- ✅ Resumo visual de todas as lojas que serão criadas
- ✅ Validação completa antes de criar
- ✅ Lista de avisos e erros (se houver)
- ✅ Contagem de campos preenchidos vs. opcionais

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 RESUMO ANTES DE CRIAR                                │
├─────────────────────────────────────────────────────────┤
│ Rede: Rede Exemplo                                      │
│ Lojas: 3 lojas serão criadas                            │
│                                                        │
│ ✅ Todos os campos obrigatórios preenchidos            │
│ ⚠️ 2 lojas sem telefone secundário (opcional)          │
│                                                        │
│ [Voltar e Editar] [Confirmar e Criar]                  │
└─────────────────────────────────────────────────────────┘
```

### 9. Normalização de Cidades (Ainda Relevante para Criação Manual)

**Nota**: A normalização de cidades ainda é relevante mesmo sem importação, pois usuários podem digitar cidades com variações.

#### Problema Identificado

Durante o preenchimento manual, nomes de cidades podem variar:
- **Variações de formatação**: "sao paulo" vs "São Paulo" vs "SAO PAULO"
- **Variações de acentuação**: "sao paulo" vs "são paulo"
- **Erros de digitação**: "sao paulo" vs "saopaulo" vs "são pauo"
- **Variações regionais**: "Brasília" vs "Brasilia"

#### Estratégia de Normalização em 3 Etapas

**Etapa 1: Normalização Textual (Pré-processamento)**

Antes de buscar no banco, normalizar o texto:
1. Converter para minúsculas
2. Remover acentos (á → a, ã → a, ç → c)
3. Remover espaços extras e trim
4. Remover caracteres especiais (mantém apenas letras, números e espaços)

**Exemplo:**
```
Entrada: "  São Paulo  " → Normalizado: "sao paulo"
Entrada: "SÃO PAULO" → Normalizado: "sao paulo"
Entrada: "sao paulo" → Normalizado: "sao paulo"
```

**Implementação:**
```typescript
function normalizeCityName(cityName: string): string {
  return cityName
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
    .trim()
    .replace(/\s+/g, ' '); // Normaliza espaços múltiplos
}
```

**Etapa 2: Busca por Correspondência Exata (Normalizada)**

Buscar no banco de dados de cidades usando o nome normalizado:
- Se encontrar correspondência exata (normalizada): ✅ Usar cidade do banco
- Se não encontrar: Ir para Etapa 3

**Estrutura da Tabela de Cidades (Recomendada):**
```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- Nome oficial: "São Paulo"
  normalized_name VARCHAR(100) NOT NULL, -- Nome normalizado: "sao paulo"
  state_code CHAR(2) NOT NULL, -- UF: "SP"
  ibge_code VARCHAR(10), -- Código IBGE (opcional, mas recomendado)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(normalized_name, state_code)
);

CREATE INDEX idx_cities_normalized ON cities(normalized_name, state_code);
```

**Fonte de Dados:**
- **IBGE**: API ou CSV oficial do IBGE com todas as cidades brasileiras
- **Popular tabela**: Via script de migração uma vez (ou sincronizar periodicamente)

**Etapa 3: Busca por Similaridade (Fuzzy Matching)**

Se não encontrar correspondência exata, usar algoritmo de similaridade:
1. **Levenshtein Distance**: Calcular distância entre strings
2. **Threshold**: Se similaridade > 85%, sugerir cidade como match provável
3. **Apresentar ao usuário**: Na tela de preview, mostrar aviso:

```
⚠️ AVISO: Cidade "sao paulo" não encontrada exatamente. 
   Sugestão: "São Paulo - SP" (similaridade: 98%)
   [Aceitar Sugestão] [Manter Como Está] [Corrigir Manualmente]
```

**Implementação (Fuzzy Matching):**
```typescript
function findSimilarCity(cityName: string, stateCode: string): CityMatch[] {
  const normalized = normalizeCityName(cityName);
  
  // Buscar cidades do estado
  const cities = getCitiesByState(stateCode);
  
  // Calcular similaridade para cada cidade
  const matches = cities.map(city => ({
    city,
    similarity: calculateLevenshteinSimilarity(normalized, city.normalized_name)
  }))
  .filter(m => m.similarity > 0.85) // Threshold de 85%
  .sort((a, b) => b.similarity - a.similarity); // Ordenar por similaridade
  
  return matches;
}

function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength); // Retorna valor entre 0 e 1
}
```

#### Fluxo de Processamento Durante Preenchimento

1. **Processamento Inicial:**
   - Normalizar nome da cidade (Etapa 1)
   - Buscar correspondência exata no banco (Etapa 2)
   - Se encontrou: ✅ Usar cidade do banco, preencher automaticamente

2. **Se Não Encontrou Correspondência Exata:**
   - Buscar cidades similares (Etapa 3)
   - Se encontrou similar (similaridade > 85%):
     - ⚠️ Mostrar sugestão em dropdown/autocomplete
     - Permitir que usuário aceite a sugestão ou continue digitando
   - Se não encontrou similar:
     - ⚠️ Mostrar aviso discreto (campo opcional para criar nova cidade)
     - Usuário pode continuar ou corrigir manualmente

3. **No Campo de Cidade:**
   - Autocomplete com sugestões conforme usuário digita
   - Mostrar status visual: ✅ Válido, ⚠️ Sugestão, ⚠️ Não encontrado
   - Permitir criar nova cidade se não encontrada

#### Considerações Importantes

1. **Criar Nova Cidade**: 
   - Se usuário insiste em manter cidade não encontrada, permitir criação (com aviso)
   - Salvar nome exato informado pelo usuário
   - Associar ao estado informado

2. **Performance**:
   - Busca exata é rápida (índice)
   - Fuzzy matching é mais lento, fazer apenas se não encontrou correspondência exata
   - Considerar cache de cidades por estado

3. **Base de Dados de Cidades**:
   - **Recomendação**: Popular tabela `cities` com dados do IBGE
   - **Fonte**: API IBGE ou CSV oficial
   - **Atualização**: Dados mudam raramente, atualização manual/semestral é suficiente

4. **Experiência do Usuário**:
   - Na tela de preview, permitir correção em massa (se várias lojas têm mesmo erro)
   - Permitir "Aceitar todas as sugestões" se confiança for alta
   - Mostrar código IBGE na sugestão (se disponível) para maior confiança

#### Checklist de Implementação - Normalização de Cidades

- [ ] Criar tabela `cities` no banco de dados
- [ ] Popular tabela `cities` com dados do IBGE (script de migração)
- [ ] Implementar função `normalizeCityName()` no backend
- [ ] Implementar busca exata por nome normalizado
- [ ] Implementar função de similaridade (Levenshtein)
- [ ] Implementar busca por similaridade (threshold 85%)
- [ ] Implementar autocomplete de cidade com busca em tempo real
- [ ] Implementar sugestões de cidade ao digitar (similaridade)
- [ ] Implementar criação de nova cidade se não encontrada
- [ ] Permitir criação de cidade não encontrada (com aviso)
- [ ] Testar com variações comuns (sao paulo, SÃO PAULO, são paulo, etc.)
- [ ] Testar com erros de digitação comuns
- [ ] Documentar código IBGE como fonte de dados

### Checklist de Implementação - Otimizações de UX

**Prioridade Alta (Implementar Primeiro):**
- [ ] Implementar checkbox "Aplicar para todas as lojas" em campos da rede (estado, cidade, segmento)
- [ ] Implementar herança automática de campos da rede para novas lojas
- [ ] Implementar seleção múltipla de lojas (checkbox)
- [ ] Implementar barra de ações para lojas selecionadas
- [ ] Implementar modal de edição em massa (aplicar valor a múltiplas lojas)
- [ ] Implementar autocomplete de CEP com ViaCEP
- [ ] Implementar validação em tempo real (CNPJ, e-mail, CEP)
- [ ] Implementar tela de preview antes de criar

**Prioridade Média:**
- [ ] Implementar sugestões de nomes baseadas em outras lojas
- [ ] Implementar autocomplete de e-mail baseado em padrão da rede
- [ ] Implementar função "Copiar dados de rede existente"
- [ ] Implementar função "Duplicar loja"
- [ ] Implementar tabela editável inline para lojas
- [ ] Implementar salvamento automático ao editar inline

**Prioridade Baixa (Nice to Have):**
- [ ] Implementar sistema de templates salvos
- [ ] Implementar atalhos de teclado
- [ ] Implementar histórico de sugestões (baseado em dados anteriores)
- [ ] Implementar função "Copiar de loja existente"

---

## 🔄 FLUXO DE CRIAÇÃO PROPOSTO

### Processo de Criação de Rede com Primeira Loja

**Etapa 1: Dados Básicos da Rede**
- Campos obrigatórios da rede (nome, e-mail, telefone)

**Etapa 2: Endereço da Rede**
- CEP, Estado, Cidade
- Opcional: Logradouro, número, complemento, bairro

**Etapa 3: Contatos da Rede**
- E-mail principal ✅ (obrigatório)
- Telefone principal ✅ (obrigatório)
- Opcional: e-mail secundário, telefone secundário

**Etapa 4: Dados Opcionais da Rede**
- CNPJ, Razão Social (se houver)
- Segmento, modelo de negócio
- Métricas estimadas

**Etapa 5: Dados da Primeira Loja (OBRIGATÓRIA)**
- Nome da loja ✅
- CNPJ da loja ✅ (OBRIGATÓRIO)
- Razão social da loja ✅ (OBRIGATÓRIO)
- CEP ✅
- Estado ✅
- Cidade ✅
- Telefone ✅
- E-mail ✅
- Opcional: Logradouro, número, inscrições, etc.

**Etapa 6: Dados Opcionais da Loja**
- Métricas, horários, capacidade, etc.

**Validação Final:**
- Garantir que pelo menos 1 loja foi criada
- Validar CNPJ da loja (obrigatório e único no sistema)
- Validar razão social da loja (obrigatório)
- Validar e-mails únicos (se aplicável)
- Validar CNPJ da rede apenas se fornecido (não obrigatório)

---

## 📈 BENEFÍCIOS PARA ANÁLISES FUTURAS

Com estes campos implementados, será possível realizar análises como:

1. **Performance por Região**
   - Análise por Estado, Cidade, Bairro
   - Densidade de lojas por região
   - Performance vs. densidade populacional

2. **Análise Temporal**
   - Performance de lojas por tempo de operação
   - Sazonalidade por região
   - Crescimento da rede ao longo do tempo

3. **Análise de Recursos**
   - Eficiência por área (faturamento/m²)
   - Produtividade por funcionário
   - Utilização de caixas

4. **Análise Geográfica**
   - Mapas de calor por coordenadas
   - Análise de alcance territorial
   - Planejamento de novas unidades

5. **Análise de Performance vs. Meta**
   - Acompanhamento de faturamento vs. meta
   - Análise de ticket médio
   - Acompanhamento de clientes diários

6. **Análise por Segmento**
   - Comparação entre diferentes segmentos de mercado
   - Benchmarks por modelo de negócio

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [ ] Verificar estrutura atual da tabela `networks` via MCP Supabase
- [ ] Verificar estrutura atual da tabela `stores` via MCP Supabase
- [ ] Identificar campos já existentes para não duplicar
- [ ] Verificar constraints e índices existentes
- [ ] Verificar políticas RLS atuais

### Fase 1: Migração de Banco de Dados
- [ ] Criar migration para adicionar campos obrigatórios de `networks` (primary_email, primary_phone, zip_code, state, city)
- [ ] Criar migration para adicionar campos opcionais de `networks` (cnpj, company_name, trade_name, etc.)
- [ ] Criar migration para adicionar campos obrigatórios de `stores` (cnpj, company_name, zip_code, state, city, phone, email)
- [ ] Criar migration para adicionar campos opcionais de `stores`
- [ ] Adicionar constraint UNIQUE para `stores.cnpj` (CNPJ deve ser único no sistema)
- [ ] Adicionar constraint UNIQUE para `networks.cnpj` apenas se fornecido (pode ser NULL)
- [ ] Adicionar índices para campos de busca frequente (cnpj, zip_code, state, city)
- [ ] Atualizar políticas RLS se necessário
- [ ] Testar migrations em ambiente de desenvolvimento

### Fase 2: API e Backend
- [ ] Atualizar schema de validação (Zod) para criação de rede
- [ ] Atualizar schema de validação para criação de loja
- [ ] Modificar API `/api/networks/create` para aceitar novos campos
- [ ] Criar/modificar API para criação de loja
- [ ] Implementar criação de primeira loja junto com rede
- [ ] Adicionar validações de campos obrigatórios
- [ ] Adicionar validações de formato (CNPJ, CEP, telefone, e-mail)
- [ ] **Criar tabela `network_creation_drafts` para rascunhos**
- [ ] **Implementar RLS policy para `network_creation_drafts` (usuário só vê seus rascunhos)**
- [ ] **Criar API endpoint `POST /api/networks/draft` para salvar rascunho**
- [ ] **Criar API endpoint `GET /api/networks/draft` para recuperar rascunho**
- [ ] **Criar API endpoint `DELETE /api/networks/draft` para limpar rascunho**
- [ ] **Criar job/cron para limpeza automática de rascunhos expirados (> 7 dias)**

### Fase 3: Frontend
- [ ] Atualizar componente `CriarRedeView` com novos campos
- [ ] Criar componente para criação de primeira loja (integrar no fluxo)
- [ ] Adicionar validações de formulário no frontend
- [ ] Adicionar máscaras de input (CNPJ, CEP, telefone)
- [ ] Implementar fluxo multi-etapas para criação de rede+loja
- [ ] **Implementar componente de Tooltip consistente para todos os campos opcionais**
- [ ] **Adicionar tooltips em todos os campos opcionais usando textos da seção "TOOLTIPS E MOTIVAÇÃO"**
- [ ] Garantir que tooltips mostrem o valor de negócio, não apenas a descrição técnica
- [ ] **Implementar sistema de persistência de rascunhos (ver seção "GESTÃO DE ESTADO E PERSISTÊNCIA DE DADOS")**
- [ ] Criar hook `useNetworkCreationDraft` para gerenciar rascunhos
- [ ] Implementar auto-save em localStorage (2-3 segundos)
- [ ] Implementar auto-save no backend (10-15 segundos com debounce)
- [ ] Implementar indicadores visuais (badge "Salvando..." / "Salvo")
- [ ] Implementar detecção de tentativa de saída com dados não salvos
- [ ] Implementar modal de confirmação ao retomar rascunho
- [ ] Implementar detecção de offline/online
- [ ] Implementar sincronização localStorage → backend quando voltar online
- [ ] Adicionar tratamento de erros

### Fase 4: Testes
- [ ] Testar criação de rede com todos os campos obrigatórios
- [ ] Testar criação de rede com campos opcionais
- [ ] Testar criação de rede + primeira loja
- [ ] Testar validações de campos
- [ ] Testar políticas RLS com novos campos
- [ ] Testar em diferentes roles (admin, manager)
- [ ] **Testar persistência de rascunhos: fechar navegador e retomar**
- [ ] **Testar persistência de rascunhos: atualizar página no meio do processo**
- [ ] **Testar persistência de rascunhos: perder conexão e voltar**
- [ ] **Testar recuperação de rascunho após login em outro dispositivo**
- [ ] **Testar expiração de rascunhos (após 7 dias)**
- [ ] **Testar limpeza automática de rascunhos após criação bem-sucedida**
- [ ] **Testar comportamento offline (salvar localmente, sincronizar ao voltar)**
- [ ] **Testar detecção de tentativa de saída com dados não salvos**

### Fase 5: Documentação
- [ ] Atualizar documentação da API
- [ ] Documentar novos campos no código (JSDoc)
- [ ] Atualizar README se necessário

---

## 🔐 CONSIDERAÇÕES DE SEGURANÇA

1. **Dados Sensíveis**:
   - CNPJ e dados fiscais devem ter RLS apropriado
   - E-mails e telefones devem ter políticas de acesso adequadas
   - **CNPJ de lojas é obrigatório e deve ser único no sistema**
   - CNPJ de redes é opcional (pode ser NULL)

2. **Validação**:
   - **Validar CNPJ de lojas obrigatoriamente** (formato correto, 14 dígitos, único)
   - Validar CNPJ de redes apenas se fornecido (formato correto, pode ser NULL)
   - Validar CEP consultando API ou usando regex
   - Validar telefones no formato brasileiro
   - Validar e-mails com regex robusto

3. **Integridade**:
   - Garantir que `network_id` em `stores` sempre aponte para rede válida
   - Considerar UNIQUE constraints onde fizer sentido (CNPJ, códigos internos)
   - Garantir que ao menos uma loja exista para cada rede ativa

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Enum Types para PostgreSQL

Alguns campos sugerem enums. Considere criar tipos ENUM:

```sql
-- Para networks.market_segment
CREATE TYPE market_segment_type AS ENUM ('farmacia', 'supermercado', 'varejo', 'outro');

-- Para networks.business_model
CREATE TYPE business_model_type AS ENUM ('franquia', 'propria', 'mista');

-- Para stores.operational_status
CREATE TYPE operational_status_type AS ENUM ('ativa', 'em_construcao', 'em_reforma', 'temporariamente_fechada');
```

### Campos JSONB

Campos como `business_hours` e `payment_settings` devem usar JSONB para flexibilidade:

```json
// Exemplo business_hours
{
  "monday": {"open": "08:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "08:00", "close": "18:00", "closed": false},
  ...
}
```

### Validações Recomendadas

- **CNPJ (Lojas - OBRIGATÓRIO)**: 
  - Deve ser válido (14 dígitos, dígitos verificadores corretos)
  - Deve ser único no sistema (UNIQUE constraint)
  - Usar biblioteca de validação ou algoritmo de validação de CNPJ
- **CNPJ (Redes - OPCIONAL)**:
  - Validar apenas se fornecido
  - Se fornecido, deve ser válido e único
- **Razão Social (Lojas - OBRIGATÓRIO)**: 2-255 caracteres
- **CEP**: 8 dígitos numéricos
- **Telefone**: Aceitar formatos: (11) 99999-9999, 11999999999, +5511999999999
- **E-mail**: Validação padrão de e-mail
- **UF/State**: 2 letras maiúsculas, valores válidos (AC, AL, ..., SP, TO)

---

## 🔄 PRÓXIMOS PASSOS

1. Revisar este documento e aprovar a proposta
2. Executar verificação inicial via MCP Supabase
3. Criar migrations seguindo o checklist
4. Implementar APIs e frontend
5. Testar completamente
6. Documentar mudanças

---

**Última atualização**: 2025-12-29  
**Versão do documento**: 1.0

