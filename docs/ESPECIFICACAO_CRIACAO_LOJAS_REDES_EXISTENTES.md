# Especificação: Criação de Lojas para Redes Existentes

**Versão:** 1.0  
**Data:** 2025-12-29  
**Status:** Proposta para Implementação

## 📋 Visão Geral

Este documento especifica o processo de criação de **Lojas** para **Redes Existentes** no sistema. É complementar ao documento principal `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`, focando especificamente no fluxo de adicionar novas lojas a uma rede que já foi criada.

### Contexto Importante

- **Todas as lojas devem ter CNPJ e Razão Social**: Todas as lojas são entidades jurídicas e **devem** ter CNPJ e razão social obrigatórios, independentemente de terem sido criadas junto com a rede ou posteriormente.

- **Consistência de Campos**: Os campos para lojas criadas após a criação da rede devem ser **exatamente os mesmos** que para lojas criadas junto com a rede. Não deve haver divergências no banco de dados.

- **Seleção de Rede Obrigatória**: Antes de criar uma loja, o usuário deve selecionar a rede à qual a loja pertence. Não é possível criar uma loja sem vincular a uma rede existente.

- **Rede Deve Existir**: A funcionalidade de criação de lojas só estará disponível quando houver pelo menos uma rede ativa no sistema.

---

## 🔍 Processo de Verificação Antes da Implementação

**IMPORTANTE**: Antes de implementar qualquer mudança no banco de dados:

### Análise Realizada via MCP Supabase

**Análise realizada em: 2025-12-29**

#### Tabela `stores` - Campos Existentes Atualmente:
- ✅ `id` (uuid, PK)
- ✅ `org_id` (uuid) - **Compatibilidade**: manter por enquanto
- ✅ `name` (text) - ✅ JÁ EXISTE
- ✅ `network_id` (uuid) - ✅ JÁ EXISTE (FK para networks)
- ✅ `logo_url` (text, nullable) - ✅ JÁ EXISTE
- ✅ `brand_primary_color`, `brand_secondary_color`, `brand_tagline`, `brand_cover_url`, `brand_support_email`, `brand_support_phone` (text, nullable) - ✅ JÁ EXISTEM
- ✅ `is_active` (boolean, default: true) - ✅ JÁ EXISTE
- ✅ `created_at` (timestamp) - ✅ JÁ EXISTE
- ✅ `deactivated_at`, `deactivated_by` (timestamptz, uuid, nullable) - ✅ JÁ EXISTEM

#### Tabela `networks` - Campos Existentes Atualmente:
- ✅ `id` (uuid, PK)
- ✅ `name` (text) - ✅ JÁ EXISTE
- ✅ `logo_url` (text, nullable) - ✅ JÁ EXISTE
- ✅ `is_active` (boolean, default: true) - ✅ JÁ EXISTE
- ✅ `created_at`, `updated_at` (timestamptz) - ✅ JÁ EXISTEM
- ✅ `deactivated_at`, `deactivated_by` (timestamptz, uuid, nullable) - ✅ JÁ EXISTEM

#### Campos que PRECISAM SER CRIADOS (não existem ainda):

**Para `stores`:**
- ❌ `cnpj` (TEXT, obrigatório, UNIQUE) - **FALTANDO**
- ❌ `company_name` (TEXT, obrigatório) - **FALTANDO**
- ❌ `zip_code` (TEXT, obrigatório) - **FALTANDO**
- ❌ `state` (TEXT, obrigatório) - **FALTANDO**
- ❌ `city` (TEXT, obrigatório) - **FALTANDO**
- ❌ `phone` (TEXT, obrigatório) - **FALTANDO**
- ❌ `email` (TEXT, obrigatório) - **FALTANDO**
- ❌ Campos opcionais (internal_code, manager_name, trade_name, state_registration, municipal_registration, street, street_number, address_complement, neighborhood, latitude, longitude, secondary_phone, secondary_email, opened_at, operational_status, area_sqm, employee_count, cash_register_count, business_hours, max_customer_capacity, monthly_revenue_target, estimated_average_ticket, daily_customer_target, pos_code, payment_settings, tags, internal_notes, photos) - **FALTANDO**

**NOTA IMPORTANTE sobre campos de endereço:**
- ✅ `street` (Logradouro) - **OBRIGATÓRIO** (já existe no banco)
- ✅ `street_number` (Número) - **OBRIGATÓRIO** (já existe no banco)
- ✅ `neighborhood` (Bairro) - **OBRIGATÓRIO** (já existe no banco)
- ✅ `address_complement` (Complemento) - **OPCIONAL** (já existe no banco)
- ✅ `trade_name` (Nome Fantasia) - **CRIADO VIA MIGRATION**
- ✅ `municipal_registration` (Inscrição Municipal) - **CRIADO VIA MIGRATION**

**Para `networks` (se necessário para herança de dados):**
- ❌ Campos opcionais da rede (primary_email, primary_phone, zip_code, state, city, trade_name, cnpj, company_name, etc.) - **FALTANDO** - Consultar `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` para lista completa

**Nota Importante**: A criação destes campos deve ser feita através de migrations SQL, seguindo o checklist do documento principal `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`. Este documento assume que os campos serão criados seguindo a especificação do documento principal.

### Checklist de Verificação:

1. ✅ **Análise via MCP Supabase**: Realizada (ver acima)
2. **Consultar documento principal**: `docs/ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` para garantir consistência
3. **Criar migrations para campos faltantes**: Ver seção "CHECKLIST DE IMPLEMENTAÇÃO → Fase 1" neste documento
4. **Verificar constraints e índices existentes**: Preservar integridade, adicionar novos conforme necessário
5. **Verificar políticas RLS**: Garantir que novos campos sejam incluídos nas políticas quando necessário

---

## 🗂️ Estrutura de Navegação

### Menu "Gestão de Empresas"

A criação de lojas será acessível através do menu **"Gestão de Empresas"** (em `/configuracoes/empresas`), que englobará as seguintes opções:

1. **Criar Nova Rede** - Fluxo completo de criação de rede com primeira loja (conforme `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`)
2. **Criar Nova Loja** - Fluxo de criação de loja para rede existente (este documento)

### Restrições de Acesso

- **Criar Loja**: Apenas usuários com permissão para criar lojas (admin, manager, owner) podem acessar
- **Rede Deve Existir**: O botão "Criar Nova Loja" só deve estar habilitado se houver pelo menos uma rede ativa no sistema
- **Seleção de Rede**: O usuário deve selecionar uma rede antes de iniciar o processo de criação

---

## 📊 CAMPOS PARA LOJAS (REUTILIZADOS DO DOCUMENTO PRINCIPAL)

Os campos para lojas criadas em redes existentes são **exatamente os mesmos** definidos em `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`. Esta seção referencia esses campos para facilitar a consulta.

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

**Nota Importante**: Diferentemente das redes, **todas as lojas devem ter CNPJ e razão social**, pois cada loja é uma entidade jurídica independente (mesmo que pertençam à mesma rede). Além disso, os campos de endereço (logradouro, número e bairro) são obrigatórios, exceto o complemento.

### Campos Opcionais

Para consulta completa dos campos opcionais, referir-se a `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` seção "## 📊 LOJAS → Campos Opcionais". Os campos opcionais incluem:

- **Dados Básicos**: `logo_url`, `internal_code`, `manager_name`, `trade_name`, `state_registration`, `municipal_registration`
- **Endereço Completo**: `street`, `street_number`, `address_complement`, `neighborhood`, `latitude`, `longitude`
- **Contatos**: `secondary_phone`, `secondary_email`
- **Operacionais**: `opened_at`, `operational_status`, `area_sqm`, `employee_count`, `cash_register_count`, `business_hours`, `max_customer_capacity`
- **Métricas de Performance**: `monthly_revenue_target`, `estimated_average_ticket`, `daily_customer_target`
- **Financeiro**: `pos_code`, `payment_settings`
- **Branding**: `brand_primary_color`, `brand_secondary_color`, `brand_tagline`, `brand_cover_url`, `brand_support_email`, `brand_support_phone`
- **Outros**: `tags`, `internal_notes`, `photos`

---

## 💡 TOOLTIPS E MOTIVAÇÃO PARA PREENCHIMENTO

Os tooltips e mensagens de motivação para campos opcionais de lojas são os **mesmos** definidos em `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` seção "## 💡 TOOLTIPS E MOTIVAÇÃO PARA PREENCHIMENTO → LOJAS - Campos Opcionais".

**Diretrizes de Implementação:**
1. **Todos os campos opcionais devem ter um ícone de informação (?) ao lado do label**
2. **Ao passar o mouse ou clicar no ícone, mostrar o tooltip**
3. **Focar sempre no valor para o negócio**: O dono da loja quer saber "o que eu ganho preenchendo isso?", não "para que a ferramenta usa isso?"
4. **Usar linguagem simples e direta**: Evitar jargão técnico, focar em benefícios práticos
5. **Exemplos concretos quando possível**: "Compare com outras lojas da região", "Acompanhe se está batendo a meta", etc.

Para consultar os tooltips específicos de cada campo, referir-se ao documento principal.

---

## 🔄 FLUXO DE CRIAÇÃO PROPOSTO

### Processo de Criação de Loja para Rede Existente

#### Etapa 0: Seleção da Rede

**Antes de iniciar o formulário de criação:**
- Usuário acessa "Gestão de Empresas" → "Criar Nova Loja"
- Sistema verifica se há redes ativas disponíveis
- Se não houver redes: Mostrar mensagem "Você precisa criar uma rede antes de criar uma loja" com link para "Criar Nova Rede"
- Se houver redes: Mostrar seletor de rede (dropdown ou lista)
- Usuário seleciona a rede à qual a loja pertencerá
- Campo `network_id` é definido e não pode ser alterado durante o processo (ou pode ser alterado com confirmação)

#### Etapa 1: Dados Básicos da Loja (Obrigatórios)

- **Nome da Loja** ✅ (obrigatório)
- **CNPJ** ✅ (obrigatório, único, validar formato e dígitos verificadores)
- **Razão Social** ✅ (obrigatório)
- **E-mail** ✅ (obrigatório, validar formato)
- **Telefone** ✅ (obrigatório, validar formato brasileiro)

#### Etapa 2: Endereço da Loja (Obrigatórios)

- **CEP** ✅ (obrigatório, validar formato, buscar endereço via ViaCEP se disponível)
- **Estado (UF)** ✅ (obrigatório, 2 caracteres)
- **Cidade** ✅ (obrigatório, com autocomplete e normalização - ver seção de normalização)
- Opcional: Logradouro, número, complemento, bairro, coordenadas (latitude/longitude)

#### Etapa 3: Dados Opcionais da Loja

- **Dados Básicos**: Logo, descrição, código interno, gerente, inscrição estadual
- **Endereço Completo**: Logradouro, número, complemento, bairro, coordenadas
- **Contatos**: Telefone secundário, e-mail secundário
- **Operacionais**: Data de abertura, status operacional, área, funcionários, caixas, horários, capacidade
- **Métricas**: Meta de faturamento, ticket médio, meta de clientes
- **Financeiro**: Código PDV, configurações de pagamento
- **Branding**: Cores, tagline, imagem de capa, contatos de suporte
- **Outros**: Tags, notas internas, fotos

#### Etapa 4: Preview e Confirmação

- Resumo visual dos dados preenchidos
- Validação completa antes de criar
- Lista de avisos (campos opcionais não preenchidos) e erros (se houver)
- Contagem de campos preenchidos vs. opcionais
- Botões: [Voltar e Editar] [Confirmar e Criar]

#### Validação Final

- Garantir que todos os campos obrigatórios estão preenchidos
- Validar CNPJ (formato, dígitos verificadores, único no sistema)
- Validar razão social (não vazia, mínimo de caracteres)
- Validar e-mails (formato válido)
- Validar telefones (formato brasileiro)
- Validar CEP (formato válido, 8 dígitos)
- Validar estado (UF válida)
- Validar cidade (normalizada, ver seção de normalização)
- Garantir que `network_id` aponta para rede existente e ativa

---

## 💾 GESTÃO DE ESTADO E PERSISTÊNCIA DE DADOS

### Contexto e Cenários de Uso

Durante o processo de criação de loja, o usuário pode interromper o fluxo por vários motivos (mesmos cenários da criação de rede):
- **Fechamento acidental do navegador**
- **Perda de conexão**
- **Reinicialização forçada**
- **Navegação acidental**
- **Sessão longa**
- **Timeout de sessão**

### Estratégia de Persistência Multi-Camada

A estratégia de persistência é similar à da criação de rede, mas adaptada para criação de loja única:

#### Nível 1: Persistência Local (localStorage) - Rápido e Imediato

**Implementação:**
- Salvar automaticamente dados do formulário a cada 2-3 segundos após mudança
- Usar `localStorage` com chave específica: `store_creation_draft_{network_id}`
- Dados armazenados localmente no navegador do usuário

**Estrutura de Dados:**
```typescript
interface StoreCreationDraft {
  networkId: string; // Rede selecionada (não pode ser alterada sem confirmação)
  step: number; // Etapa atual do formulário (1-4)
  storeData: Partial<StoreData>; // Dados da loja preenchidos
  lastSaved: string; // Timestamp ISO da última alteração
  expiresAt: string; // Timestamp ISO de expiração (7 dias)
}
```

#### Nível 2: Rascunho no Backend - Backup Seguro

**Implementação:**
- Criar tabela `store_creation_drafts` no banco de dados (similar a `network_creation_drafts`)
- Salvar rascunho no backend a cada 10-15 segundos (debounce)
- Associar rascunho ao usuário logado e à rede selecionada
- Limpar rascunho após criação bem-sucedida

**Estrutura da Tabela:**
```sql
CREATE TABLE store_creation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  store_data JSONB NOT NULL,
  current_step INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_store_drafts_user ON store_creation_drafts(user_id);
CREATE INDEX idx_store_drafts_network ON store_creation_drafts(network_id);
CREATE INDEX idx_store_drafts_expires ON store_creation_drafts(expires_at);

-- RLS Policy: usuário só vê seus próprios rascunhos
ALTER TABLE store_creation_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own store drafts"
ON store_creation_drafts
FOR ALL
USING (user_id = (SELECT auth.uid()));
```

#### Nível 3: Validação de Rede Existente

**Implementação:**
- Validar que a rede selecionada existe e está ativa
- Se rede foi desativada durante o processo, avisar usuário e permitir selecionar outra

### Fluxo de Recuperação de Dados

#### Ao Iniciar o Fluxo de Criação

1. **Verificar localStorage** primeiro (mais rápido)
   - Buscar rascunho específico da rede selecionada: `store_creation_draft_{network_id}`
   - Se existe rascunho recente (< 7 dias), perguntar ao usuário:
     ```
     "Você tinha um cadastro de loja em andamento para esta rede. Deseja continuar de onde parou?"
     [Continuar] [Começar do Zero]
     ```
   - Mostrar resumo: "Loja: [nome se preenchido], Etapa: [X de 4], Última alteração: [data/hora]"

2. **Verificar backend** (se localStorage vazio ou usuário escolheu "buscar do servidor")
   - Buscar rascunho mais recente do usuário para a rede selecionada
   - Se existe, mostrar opção de recuperar
   - Se não existe, iniciar fluxo limpo

#### Durante o Preenchimento

1. **Auto-save local** a cada 2-3 segundos (sem indicador visual para não poluir UI)
2. **Auto-save backend** a cada 10-15 segundos (com debounce)
3. **Indicador discreto**: Badge pequeno "Salvando..." / "Salvo" no canto superior
4. **Prevenir navegação acidental**: Se usuário tentar sair com dados não salvos, mostrar confirmação

#### Expiração e Limpeza

1. **LocalStorage**: Expirar após 7 dias (verificar `expiresAt`)
2. **Backend**: Job automático para limpar rascunhos com mais de 7 dias
3. **Notificação**: Se rascunho está próximo de expirar (1 dia), avisar usuário

### Experiência do Usuário (UX)

#### Indicadores Visuais

1. **Indicador de Progresso**: Barra mostrando etapa atual (ex: "Etapa 2 de 4")
2. **Badge de Status**: 
   - "Salvando..." (durante salvamento)
   - "Salvo" (salvo com sucesso)
   - "Não salvo" (se houve erro ou está offline)
3. **Rede Selecionada**: Badge fixo mostrando qual rede foi selecionada (não pode ser alterada facilmente)

#### Mensagens ao Usuário

1. **Ao retomar rascunho**:
   ```
   "Bem-vindo de volta! Você tinha um cadastro de loja em andamento para a rede [Nome da Rede] 
   de [data/hora]. Deseja continuar de onde parou?"
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

---

## ⚡ OTIMIZAÇÕES DE UX PARA CRIAÇÃO RÁPIDA

### Visão Geral

O processo de criação de loja para rede existente pode ser acelerado através de otimizações de UX baseadas em boas práticas de grandes empresas de tecnologia. Como estamos criando uma loja única (não múltiplas lojas), algumas otimizações são adaptadas do documento principal.

### Princípios de Design (Baseado em Big Techs)

1. **Herança Inteligente da Rede**: Campos comuns podem ser herdados da rede selecionada
2. **Smart Suggestions**: Sugestões baseadas em dados anteriores e padrões comuns
3. **Templates e Dados Predefinidos**: Reutilizar dados de lojas existentes da mesma rede
4. **Validação e Feedback em Tempo Real**: Feedback imediato ao preencher campos
5. **Preview Antes de Criar**: Visualizar resumo antes de confirmar criação

### 1. Herança de Dados da Rede para a Loja

**Problema**: Muitos dados são repetitivos entre a rede e suas lojas (estado, cidade, segmento, modelo de negócio, etc.)

**Solução**: Preencher automaticamente campos da loja com dados da rede selecionada (com opção de editar)

**Campos Herdáveis da Rede:**
- ✅ Estado (UF) - quase sempre o mesmo (mas pode variar se rede tem lojas em múltiplos estados)
- ✅ Cidade - pode variar, mas sugerir cidades da rede
- ✅ Segmento de mercado - geralmente o mesmo
- ✅ Modelo de negócio - geralmente o mesmo
- ✅ Moeda - sempre o mesmo
- ✅ Dia de fechamento fiscal - geralmente o mesmo

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ REDE SELECIONADA: Rede Exemplo                         │
├─────────────────────────────────────────────────────────┤
│ Estado: [SP ▼] (herdado da rede) [Editar]             │
│ Cidade: [São Paulo______] (sugestão da rede) [Editar] │
│ Segmento: [Farmácia ▼] (herdado da rede) [Editar]     │
└─────────────────────────────────────────────────────────┘

Campos herdados aparecem pré-preenchidos, mas podem ser editados.
Indicador visual mostra que foi herdado da rede.
```

**Benefícios:**
- ✅ Reduz tempo de preenchimento em 40-60% para campos comuns
- ✅ Reduz erros de digitação
- ✅ Mantém consistência entre lojas da mesma rede

### 2. Sugestões Inteligentes (Smart Suggestions)

**Problema**: Usuário precisa digitar dados que já foram preenchidos anteriormente ou seguem padrões

**Solução**: Autocomplete e sugestões baseadas em:
- Dados de outras lojas da mesma rede
- Padrões comuns (ex: sequência de nomes)
- Dados preenchidos anteriormente (mesma sessão)

**Campos com Sugestões:**
- **Nome da Loja**: Sugerir "Loja [Cidade]", "Loja [Bairro]", "Loja [Número]" baseado em outras lojas da rede
- **CNPJ**: Se houver padrão (ex: mesmo grupo), sugerir próximo na sequência (com cuidado, não gerar CNPJ inválido)
- **E-mail**: Sugerir padrão baseado em rede (ex: `loja-centro@rede.com.br`)
- **Telefone**: Sugerir telefones da mesma cidade/região (primeiros dígitos)
- **Endereço**: Autocomplete via API de CEP (ViaCEP)
- **Gerente**: Listar gerentes de outras lojas da rede como sugestão

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ Nome da Loja: [Loja Centro________]                    │
│ 💡 Sugestões baseadas em outras lojas da rede:         │
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

### 3. Duplicar Loja Existente

**Problema**: Usuário quer criar loja similar a uma existente

**Solução**: Botão "Duplicar Loja" que copia dados de uma loja existente (da mesma rede ou outra rede) como base

**Funcionalidades:**
1. **Listar lojas existentes** (da mesma rede preferencialmente)
2. **Botão "Duplicar"** ao lado de cada loja
3. **Copiar dados** da loja selecionada para o formulário
4. **Limpar campos únicos**: CNPJ, nome, razão social (não duplicar)
5. **Manter campos comuns**: Endereço, contatos, configurações operacionais

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ Criar Nova Loja                                         │
├─────────────────────────────────────────────────────────┤
│ [Novo Cadastro] [Duplicar de Loja Existente ▼]        │
│                                                        │
│ Selecione uma loja para duplicar:                      │
│   • Loja Centro | São Paulo - SP [Duplicar]            │
│   • Loja Shopping | São Paulo - SP [Duplicar]          │
│   • Loja Sul | Campinas - SP [Duplicar]                │
└─────────────────────────────────────────────────────────┘
```

**Avisos ao Duplicar:**
```
⚠️ ATENÇÃO: Os seguintes campos serão limpos (devem ser únicos):
   - Nome da Loja
   - CNPJ
   - Razão Social
   - E-mail

Campos copiados (você pode editar):
   - Endereço (rua, número, bairro, etc.)
   - Telefone secundário
   - Configurações operacionais
   - Métricas e metas
```

**Benefícios:**
- ✅ Acelera criação de lojas similares
- ✅ Padroniza configurações
- ✅ Reduz necessidade de repetir dados

### 4. Validação e Feedback em Tempo Real

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

**Benefícios:**
- ✅ Feedback imediato ao usuário
- ✅ Reduz tentativas de criação com erros
- ✅ Melhora experiência do usuário

### 5. Normalização de Cidades

**Nota**: A normalização de cidades é relevante para criação manual, pois usuários podem digitar cidades com variações.

Para detalhes completos da estratégia de normalização (normalização textual, busca exata, fuzzy matching), referir-se a `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` seção "### 9. Normalização de Cidades (Ainda Relevante para Criação Manual)".

**Resumo:**
1. **Normalização Textual**: Converter para minúsculas, remover acentos, normalizar espaços
2. **Busca Exata**: Buscar no banco de dados usando nome normalizado
3. **Fuzzy Matching**: Se não encontrar exato, buscar cidades similares (threshold 85%)

**Implementação no Campo de Cidade:**
- Autocomplete com sugestões conforme usuário digita
- Mostrar status visual: ✅ Válido, ⚠️ Sugestão, ⚠️ Não encontrado
- Permitir criar nova cidade se não encontrada (com aviso)

### 6. Preview e Validação Antes de Criar

**Problema**: Usuário cria loja e só vê problemas depois

**Solução**: Tela de preview com validação completa antes de criar

**Funcionalidades:**
- ✅ Resumo visual de todos os dados da loja que será criada
- ✅ Validação completa antes de criar
- ✅ Lista de avisos e erros (se houver)
- ✅ Contagem de campos preenchidos vs. opcionais
- ✅ Indicador de campos herdados da rede

**Implementação:**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 RESUMO ANTES DE CRIAR                               │
├─────────────────────────────────────────────────────────┤
│ Rede: Rede Exemplo                                     │
│ Loja: Loja Centro                                      │
│                                                        │
│ ✅ Todos os campos obrigatórios preenchidos            │
│ ⚠️ Campos opcionais não preenchidos:                   │
│    - Telefone secundário                               │
│    - Horário de funcionamento                          │
│                                                        │
│ 🔗 Campos herdados da rede:                            │
│    - Estado: SP                                        │
│    - Segmento: Farmácia                                │
│                                                        │
│ [Voltar e Editar] [Confirmar e Criar]                  │
└─────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Usuário vê tudo antes de criar
- ✅ Reduz criação de lojas com dados incompletos
- ✅ Permite última revisão antes de confirmar

---

## 🔐 CONSIDERAÇÕES DE SEGURANÇA

1. **Dados Sensíveis**:
   - CNPJ e dados fiscais devem ter RLS apropriado
   - E-mails e telefones devem ter políticas de acesso adequadas
   - **CNPJ de lojas é obrigatório e deve ser único no sistema**

2. **Validação**:
   - **Validar CNPJ obrigatoriamente** (formato correto, 14 dígitos, único)
   - Validar razão social (não vazia, mínimo de caracteres)
   - Validar CEP consultando API ou usando regex
   - Validar telefones no formato brasileiro
   - Validar e-mails com regex robusto
   - Validar que `network_id` aponta para rede existente e ativa

3. **Integridade**:
   - Garantir que `network_id` em `stores` sempre aponte para rede válida e ativa
   - Considerar UNIQUE constraints onde fizer sentido (CNPJ, códigos internos)
   - Garantir que usuário tem permissão para criar lojas na rede selecionada

4. **RLS (Row Level Security)**:
   - Usuário só pode criar lojas em redes às quais tem acesso
   - Admin pode criar lojas em qualquer rede
   - Manager/owner/leader pode criar lojas apenas em suas redes
   - Verificar políticas RLS existentes e garantir que novas lojas seguem as mesmas regras

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [ ] Ler e entender `docs/ESPECIFICACAO_CAMPOS_REDES_LOJAS.md` completamente
- [ ] Verificar estrutura atual da tabela `stores` via MCP Supabase
- [ ] Verificar estrutura atual da tabela `networks` via MCP Supabase
- [ ] Identificar campos já existentes para não duplicar
- [ ] Verificar constraints e índices existentes
- [ ] Verificar políticas RLS atuais para `stores` e `networks`
- [ ] Verificar que campos de lojas no documento principal estão implementados

### Fase 1: Migração de Banco de Dados (se necessário)
- [ ] Verificar se todos os campos obrigatórios de `stores` já existem (cnpj, company_name, zip_code, state, city, phone, email)
- [ ] Se faltarem campos, criar migrations para adicionar (consultar documento principal)
- [ ] Garantir que constraint UNIQUE para `stores.cnpj` existe
- [ ] Garantir que constraint FOREIGN KEY para `stores.network_id` existe
- [ ] Adicionar índices para campos de busca frequente (se necessário)
- [ ] **Criar tabela `store_creation_drafts` para rascunhos**
- [ ] **Criar índices para `store_creation_drafts`**
- [ ] **Implementar RLS policy para `store_creation_drafts` (usuário só vê seus rascunhos)**
- [ ] Testar migrations em ambiente de desenvolvimento

### Fase 2: API e Backend
- [ ] Verificar/atualizar schema de validação (Zod) para criação de loja
- [ ] Criar/modificar API `/api/stores/create` para aceitar novos campos
- [ ] Adicionar validações de campos obrigatórios
- [ ] Adicionar validações de formato (CNPJ, CEP, telefone, e-mail)
- [ ] **Validar que `network_id` aponta para rede existente e ativa**
- [ ] **Validar permissões: usuário pode criar lojas na rede selecionada?**
- [ ] **Criar API endpoint `POST /api/stores/draft` para salvar rascunho**
- [ ] **Criar API endpoint `GET /api/stores/draft` para recuperar rascunho (por network_id)**
- [ ] **Criar API endpoint `DELETE /api/stores/draft` para limpar rascunho**
- [ ] **Criar job/cron para limpeza automática de rascunhos expirados (> 7 dias)**
- [ ] Implementar herança de dados da rede para a loja (endpoint para buscar dados da rede)
- [ ] Implementar sugestões inteligentes (endpoint para buscar outras lojas da rede)

### Fase 3: Frontend - Navegação e Seleção de Rede
- [ ] Adicionar opção "Criar Nova Loja" no menu "Gestão de Empresas" (`/configuracoes/empresas`)
- [ ] Criar página/componente `CriarLojaView` ou similar
- [ ] Implementar seletor de rede (dropdown ou lista)
- [ ] Validar que há pelo menos uma rede ativa antes de permitir criação
- [ ] Mostrar mensagem apropriada se não houver redes
- [ ] Indicador visual da rede selecionada (não pode ser alterada facilmente)

### Fase 4: Frontend - Formulário de Criação
- [ ] Criar componente de formulário multi-etapas para criação de loja
- [ ] Implementar Etapa 1: Dados Básicos (obrigatórios)
- [ ] Implementar Etapa 2: Endereço (obrigatórios + opcionais)
- [ ] Implementar Etapa 3: Dados Opcionais (organizados por seções)
- [ ] Implementar Etapa 4: Preview e Confirmação
- [ ] Adicionar validações de formulário no frontend
- [ ] Adicionar máscaras de input (CNPJ, CEP, telefone)
- [ ] **Implementar componente de Tooltip consistente para todos os campos opcionais**
- [ ] **Adicionar tooltips em todos os campos opcionais usando textos do documento principal**
- [ ] **Implementar herança automática de dados da rede (preencher campos automaticamente)**
- [ ] **Implementar indicadores visuais para campos herdados da rede**
- [ ] **Implementar sugestões inteligentes (autocomplete de nome, e-mail, etc.)**
- [ ] **Implementar função "Duplicar Loja" (copiar dados de loja existente)**
- [ ] **Implementar autocomplete de CEP com ViaCEP**
- [ ] **Implementar validação em tempo real (CNPJ, e-mail, CEP)**
- [ ] **Implementar normalização de cidades (busca exata + fuzzy matching)**
- [ ] **Implementar tela de preview antes de criar**

### Fase 5: Frontend - Persistência de Rascunhos
- [ ] **Criar hook `useStoreCreationDraft` para gerenciar rascunhos**
- [ ] **Implementar auto-save em localStorage (2-3 segundos, chave específica por network_id)**
- [ ] **Implementar auto-save no backend (10-15 segundos com debounce)**
- [ ] **Implementar indicadores visuais (badge "Salvando..." / "Salvo")**
- [ ] **Implementar detecção de tentativa de saída com dados não salvos**
- [ ] **Implementar modal de confirmação ao retomar rascunho**
- [ ] **Implementar detecção de offline/online**
- [ ] **Implementar sincronização localStorage → backend quando voltar online**
- [ ] **Garantir que rascunhos são específicos por network_id**

### Fase 6: Testes
- [ ] Testar criação de loja com todos os campos obrigatórios
- [ ] Testar criação de loja com campos opcionais
- [ ] Testar validações de campos
- [ ] Testar políticas RLS (admin, manager, owner podem criar?)
- [ ] Testar que loja não pode ser criada sem rede selecionada
- [ ] Testar que loja não pode ser criada com network_id inválido
- [ ] Testar que CNPJ deve ser único
- [ ] Testar herança de dados da rede
- [ ] Testar sugestões inteligentes
- [ ] Testar função "Duplicar Loja"
- [ ] Testar autocomplete de CEP
- [ ] Testar normalização de cidades
- [ ] **Testar persistência de rascunhos: fechar navegador e retomar**
- [ ] **Testar persistência de rascunhos: atualizar página no meio do processo**
- [ ] **Testar persistência de rascunhos: perder conexão e voltar**
- [ ] **Testar recuperação de rascunho após login em outro dispositivo**
- [ ] **Testar expiração de rascunhos (após 7 dias)**
- [ ] **Testar limpeza automática de rascunhos após criação bem-sucedida**
- [ ] **Testar comportamento offline (salvar localmente, sincronizar ao voltar)**
- [ ] **Testar que rascunhos são específicos por network_id (não misturar rascunhos de redes diferentes)**
- [ ] **Testar detecção de tentativa de saída com dados não salvos**

### Fase 7: Documentação
- [ ] Atualizar documentação da API
- [ ] Documentar novos endpoints no código (JSDoc)
- [ ] Atualizar README se necessário
- [ ] Documentar fluxo de criação de loja para desenvolvedores

---

## 🔄 PRÓXIMOS PASSOS

1. Revisar este documento e aprovar a proposta
2. Verificar que todos os campos de lojas do documento principal estão implementados
3. Executar verificação inicial via MCP Supabase
4. Criar migrations seguindo o checklist (se necessário)
5. Implementar APIs e frontend
6. Testar completamente
7. Documentar mudanças

---

## 📝 NOTAS IMPORTANTES

### Consistência com Documento Principal

Este documento é complementar a `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`. Todas as definições de campos, validações, tooltips e otimizações de UX referenciadas neste documento devem estar alinhadas com o documento principal.

### Diferenças entre Criação de Loja com Rede vs. Loja em Rede Existente

**Similaridades:**
- ✅ Mesmos campos obrigatórios e opcionais
- ✅ Mesmas validações
- ✅ Mesmos tooltips e motivações
- ✅ Mesmas estratégias de persistência (adaptadas)

**Diferenças:**
- ❌ **Criação com Rede**: Loja é criada como parte do fluxo de criação de rede (etapa do processo maior)
- ✅ **Criação em Rede Existente**: Loja é criada de forma independente, mas requer rede pré-existente
- ❌ **Criação com Rede**: `network_id` é definido durante a criação da rede
- ✅ **Criação em Rede Existente**: `network_id` é selecionado antes de iniciar o formulário
- ❌ **Criação com Rede**: Herança de dados é natural (rede e loja criadas juntas)
- ✅ **Criação em Rede Existente**: Herança de dados requer busca dos dados da rede selecionada

### Garantia de Consistência no Banco de Dados

**IMPORTANTE**: Não deve haver nenhuma diferença entre lojas criadas junto com a rede e lojas criadas posteriormente. Ambos os processos devem:
- Usar a mesma tabela `stores`
- Ter os mesmos campos obrigatórios e opcionais
- Seguir as mesmas validações
- Ter as mesmas constraints e índices
- Seguir as mesmas políticas RLS

---

**Última atualização**: 2025-12-29  
**Versão do documento**: 1.0  
**Documento relacionado**: `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`

