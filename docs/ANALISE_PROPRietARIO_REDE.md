# Análise: Sistema de Proprietário de Rede

**Versão:** 1.0  
**Data:** 2025-01-06  
**Status:** Análise para Implementação

## 📋 Objetivo

Implementar um sistema onde **toda rede criada deve ter um proprietário associado**, e esse proprietário deve ter um login com permissões adequadas de proprietário.

---

## 🔍 Situação Atual do Sistema

### Estrutura Existente

#### Tabela `networks`
- ✅ Campos básicos: `id`, `name`, `created_at`, `updated_at`, `logo_url`, `is_active`
- ✅ Campos de endereço e contato: `primary_email`, `primary_phone`, `zip_code`, `state`, `city`, `street`, `street_number`, `neighborhood`
- ✅ Campos opcionais: `cnpj`, `company_name`, `trade_name`, etc.
- ❌ **NÃO possui campo `owner_id` ou similar**

#### Tabela `profiles`
- ✅ Campos: `id` (FK para auth.users), `full_name`, `role`, `network_id`, `org_id`, `default_store_id`
- ✅ Role `'owner'` já existe no enum de roles: `['owner', 'manager', 'finance', 'leader', 'seller', 'viewer', 'admin']`
- ✅ `network_id` pode relacionar usuário com rede
- ✅ `invited_by`, `invited_at` para rastrear convites

#### Tabela `store_members`
- ✅ Relaciona usuários com lojas específicas
- ✅ Roles: `['manager', 'leader', 'seller', 'viewer', 'finance']` (não inclui 'owner')
- ✅ Campo `active` para soft delete

#### Tabela `user_invites`
- ✅ Suporta role `'owner'` no enum
- ✅ Relaciona com `network_id`, `store_id`, `company_id`

### Fluxo Atual de Criação de Rede

1. Usuário admin cria rede via `/api/networks/create`
2. Rede é criada sem proprietário associado
3. Não há criação automática de usuário proprietário
4. Não há vinculação entre rede e proprietário

### Sistema de Permissões Atual

**Roles existentes:**
- `admin`: Acesso total ao sistema
- `owner`: Existe no enum mas não está totalmente implementado
- `manager`: Gerente de rede/loja
- `finance`: Acesso financeiro
- `leader`: Líder de equipe
- `seller`: Vendedor
- `viewer`: Apenas visualização

**Como funciona atualmente:**
- `adminAuth.ts`: Verifica apenas role `'admin'`
- `StoreContext.tsx`: Carrega dados baseado em `network_id` do profile
- RLS Policies: Usam `network_id` do profile para filtrar dados

---

## 🎯 Requisitos e Mudanças Necessárias

### 1. Dados do Proprietário

**Pensando a longo prazo, quais dados seriam úteis para um proprietário?**

#### Campos Obrigatórios (Básicos)
| Campo | Tipo | Descrição | Justificativa |
|-------|------|-----------|---------------|
| `full_name` | TEXT | Nome completo | Identificação pessoal |
| `email` | TEXT | E-mail (único) | Login e comunicação |
| `phone` | TEXT | Telefone | Contato direto |
| `cpf` | TEXT | CPF | Identificação única, necessário para documentos legais |
| `birth_date` | DATE | Data de nascimento | Validação e documentos |

#### Campos Opcionais (Importantes a longo prazo)
| Campo | Tipo | Descrição | Justificativa |
|-------|------|-----------|---------------|
| `document_type` | TEXT | Tipo de documento (CPF, CNPJ) | Se proprietário for pessoa jurídica |
| `document_number` | TEXT | Número do documento alternativo | Para casos onde há CNPJ próprio |
| `address` | JSONB | Endereço completo | Para documentos e comunicação |
| `photo_url` | TEXT | URL da foto | Identificação visual |
| `bio` | TEXT | Biografia/observações | Contexto adicional |
| `metadata` | JSONB | Metadados adicionais | Flexibilidade futura |

**Decisão:** O proprietário será armazenado na tabela `profiles` (já existe estrutura) com role `'owner'`, vinculado à rede via `network_id`. Os dados adicionais podem ser armazenados na própria tabela `profiles` (expandindo campos) ou em uma nova tabela `owner_profiles` se necessário.

### 2. Mudanças no Banco de Dados

#### 2.1. Tabela `networks`
```sql
-- Adicionar campo owner_id (FK para profiles.id)
ALTER TABLE networks 
ADD COLUMN owner_id UUID REFERENCES profiles(id);

-- Criar índice para melhor performance
CREATE INDEX idx_networks_owner_id ON networks(owner_id);

-- Adicionar constraint: toda rede DEVE ter um proprietário (após migração)
-- NOTA: Inicialmente nullable para permitir migração de dados existentes
-- ALTER TABLE networks ALTER COLUMN owner_id SET NOT NULL;
```

**Justificativa:**
- Relacionamento direto entre rede e proprietário
- Permite queries rápidas para encontrar proprietário de uma rede
- Facilita validações e constraints

#### 2.2. Tabela `profiles`
**Análise atual:**
- Já possui `role` com enum incluindo `'owner'`
- Já possui `network_id` para vincular usuário a rede
- Pode precisar de campos adicionais para dados do proprietário

**Decisão:** Usar campos existentes + adicionar campos opcionais se necessário:
```sql
-- Campos que podem ser adicionados (se não existirem)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Criar índice único para CPF (opcional, apenas se necessário)
-- CREATE UNIQUE INDEX idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL;
```

**Nota:** Avaliar se estes campos devem estar em `profiles` ou em uma tabela separada `owner_profiles`. Para simplificar, vamos usar `profiles` inicialmente.

#### 2.3. RLS Policies
**Mudanças necessárias:**

1. **Tabela `networks`:**
   - Proprietário deve ter acesso total à sua rede
   - Proprietário deve poder atualizar dados da rede (exceto `owner_id`)

2. **Tabela `stores`:**
   - Proprietário deve ter acesso total às lojas da sua rede

3. **Tabela `profiles`:**
   - Proprietário deve poder ver outros usuários da sua rede
   - Proprietário deve poder criar/atualizar usuários da sua rede

4. **Outras tabelas:**
   - Proprietário deve ter permissões similares a `manager` ou `admin` (limitado à sua rede)

**Exemplo de Policy:**
```sql
-- Exemplo: Proprietário pode visualizar sua própria rede
CREATE POLICY "owners_can_view_own_network"
ON networks FOR SELECT
USING (
  id IN (
    SELECT network_id FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'owner'
    AND network_id IS NOT NULL
  )
  OR owner_id = auth.uid()
);
```

### 3. Mudanças na API

#### 3.1. `/api/networks/create`
**Mudanças necessárias:**

1. **Adicionar dados do proprietário no payload:**
   ```typescript
   {
     // ... dados da rede existentes ...
     owner: {
       full_name: string;
       email: string;
       phone: string;
       cpf: string;
       birth_date?: string;
       // ... outros campos opcionais ...
     }
   }
   ```

2. **Processo de criação:**
   - Validar dados do proprietário
   - Criar usuário no `auth.users` (Supabase Auth)
   - Criar/atualizar perfil em `profiles` com role `'owner'`
   - Criar rede em `networks` com `owner_id` = profile.id
   - Vincular perfil à rede: `profiles.network_id` = network.id
   - Criar entradas em `store_members` para todas as lojas da rede (se aplicável)
   - Enviar email de boas-vindas com credenciais de acesso

3. **Transação:**
   - Tudo deve ser feito em transação para garantir consistência
   - Se qualquer etapa falhar, rollback completo

#### 3.2. Nova rota: `/api/networks/[networkId]/owner`
**Para atualizar dados do proprietário**

#### 3.3. Nova função: `requireOwner` ou `requireOwnerOrAdmin`
**Similar a `requireAdmin`, mas verifica se usuário é proprietário da rede**

### 4. Mudanças no Frontend

#### 4.1. Formulário de Criação de Rede (`CriarRedeView.tsx`)
**Adicionar novo passo (Step 0 ou Step 7): "Dados do Proprietário"**

Campos obrigatórios:
- Nome completo
- E-mail
- Telefone
- CPF

Campos opcionais:
- Data de nascimento
- Foto

#### 4.2. Validação
- CPF válido
- E-mail único (não pode estar cadastrado)
- Telefone válido

### 5. Regras de Negócio

#### 5.1. Criação de Rede
1. **Proprietário é obrigatório**: Não é possível criar rede sem proprietário
2. **E-mail único**: O e-mail do proprietário não pode estar em uso
3. **CPF único**: O CPF do proprietário deve ser único (se fornecido)
4. **Login automático**: Após criar rede, proprietário recebe email com credenciais
5. **Primeiro acesso**: Proprietário deve definir senha no primeiro acesso

#### 5.2. Permissões do Proprietário
1. **Acesso total à sua rede**: Pode ver/editar todas as lojas da rede
2. **Gerenciar usuários**: Pode criar/editar/deletar usuários da sua rede
3. **Gerenciar lojas**: Pode criar/editar/deletar lojas da sua rede
4. **Acesso a relatórios**: Acesso completo a relatórios e análises da rede
5. **Configurações**: Pode alterar configurações da rede (exceto `owner_id`)

#### 5.3. Transferência de Propriedade
1. **Apenas admin pode transferir**: Apenas admin do sistema pode transferir propriedade
2. **Novo proprietário deve existir**: Deve ser um usuário existente com role adequado
3. **Auditoria**: Registrar transferência em tabela de histórico

#### 5.4. Desativação de Rede
1. **Notificar proprietário**: Proprietário deve ser notificado
2. **Opção de transferência**: Oferecer opção de transferir propriedade antes de desativar

### 6. Integração com Sistema Existente

#### 6.1. Compatibilidade com Redes Existentes
**Problema:** Redes já criadas não têm proprietário.

**Solução:**
1. **Migração de dados:**
   - Identificar redes sem proprietário
   - Para cada rede, criar proprietário padrão baseado em `primary_email`
   - Ou permitir que admin defina proprietário manualmente

2. **Validação gradual:**
   - Inicialmente, `owner_id` pode ser nullable
   - Adicionar constraint NOT NULL após migração

#### 6.2. Compatibilidade com Roles Existentes
- `owner` já existe no enum, mas precisa ser implementado nas policies
- Verificar se há usuários com role `owner` sem rede associada
- Migrar/ajustar conforme necessário

---

## 📊 Resumo de Mudanças por Componente

### Banco de Dados
- ✅ Adicionar `owner_id` em `networks`
- ✅ Expandir `profiles` com campos do proprietário (se necessário)
- ✅ Criar/atualizar RLS Policies para `owner`
- ✅ Criar índices para performance
- ✅ Criar constraints de integridade

### Backend (API)
- ✅ Modificar `/api/networks/create` para incluir criação de proprietário
- ✅ Criar função `requireOwner` ou `requireOwnerOrAdmin`
- ✅ Criar endpoint para atualizar dados do proprietário
- ✅ Implementar lógica de criação de usuário + perfil + rede em transação
- ✅ Enviar email de boas-vindas ao proprietário

### Frontend
- ✅ Adicionar formulário de dados do proprietário em `CriarRedeView.tsx`
- ✅ Validação de CPF, e-mail único, etc.
- ✅ Integrar criação de proprietário no fluxo de criação de rede
- ✅ Atualizar UI para mostrar informações do proprietário

### Documentação
- ✅ Atualizar `ESPECIFICACAO_CAMPOS_REDES_LOJAS.md`
- ✅ Criar documentação de permissões do proprietário
- ✅ Documentar processo de migração para redes existentes

---

## ⚠️ Considerações Importantes

### Segurança
1. **Validação de CPF**: Deve validar dígitos verificadores
2. **E-mail único**: Verificar antes de criar usuário
3. **Permissões RLS**: Proprietário não deve poder alterar `owner_id`
4. **Auditoria**: Registrar todas as ações do proprietário

### Performance
1. **Índices**: Criar índices em `owner_id` e `network_id`
2. **Queries**: Otimizar queries que buscam proprietário por rede

### Escalabilidade
1. **Múltiplos proprietários**: Considerar se no futuro uma rede pode ter múltiplos proprietários (co-proprietários)
2. **Hierarquia**: Considerar se proprietário pode delegar permissões

### Migração
1. **Dados existentes**: Planejar migração de redes sem proprietário
2. **Rollback**: Ter plano de rollback se algo der errado

---

## 🚀 Próximos Passos

1. **Revisar esta análise** com o time
2. **Definir campos finais** do proprietário
3. **Criar migrations** do banco de dados
4. **Implementar mudanças na API**
5. **Atualizar frontend**
6. **Atualizar RLS Policies**
7. **Testar fluxo completo**
8. **Migrar dados existentes**
9. **Documentar mudanças**

---

## 📝 Notas Adicionais

- **CPF vs CNPJ**: Proprietário pode ser pessoa física (CPF) ou jurídica (CNPJ). Avaliar se precisa suportar ambos.
- **Múltiplas redes**: Um proprietário pode ser dono de múltiplas redes? Se sim, `owner_id` em `networks` é suficiente. Se não, pode adicionar constraint.
- **Deleção**: O que acontece se o proprietário for deletado? Deve ter processo de transferência ou desativação da rede.

