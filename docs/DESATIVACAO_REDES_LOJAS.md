# Sistema de Gerenciamento de Desativação de Redes e Lojas

## 📋 Visão Geral

Foi implementado um sistema completo de gerenciamento de desativação de redes e lojas seguindo boas práticas de bigtechs, incluindo:

- ✅ **Soft Delete**: Dados nunca são deletados, apenas marcados como inativos
- ✅ **Auditoria Completa**: Todas as ações são registradas com histórico detalhado
- ✅ **Migração Automática**: Usuários são migrados automaticamente quando possível
- ✅ **Preservação de Dados**: Dados históricos são preservados para relatórios e análises
- ✅ **Rastreamento de Impacto**: Cada usuário afetado é rastreado individualmente

## 🗄️ Estrutura do Banco de Dados

### Novas Tabelas Criadas

1. **`deactivation_audit`**: Registra todas as desativações/reativações
   - Tipo de entidade (network/store)
   - ID e nome da entidade
   - Ação realizada (deactivated/reactivated)
   - Número de usuários afetados
   - Estratégia de migração aplicada
   - Detalhes da migração em JSON
   - Quem realizou a ação e quando

2. **`user_deactivation_impact`**: Rastreia impacto individual em cada usuário
   - Usuário afetado
   - Entidade desativada
   - Ação tomada (migrated/deactivated/no_action/manual_review)
   - Valores anteriores e novos
   - Status de resolução

### Campos Adicionados

**Tabela `networks`**:
- `is_active` (BOOLEAN): Indica se a rede está ativa
- `deactivated_at` (TIMESTAMPTZ): Data da desativação
- `deactivated_by` (UUID): Usuário que desativou

**Tabela `stores`**:
- `deactivated_at` (TIMESTAMPTZ): Data da desativação
- `deactivated_by` (UUID): Usuário que desativou
- (Já tinha `is_active`)

## 🔧 Funções do Banco de Dados

### Funções de Desativação

1. **`deactivate_network(p_network_id, p_performed_by, p_migration_strategy, p_notes)`**
   - Desativa uma rede e todas suas lojas
   - Aplica estratégia de migração aos usuários
   - Registra auditoria completa

2. **`deactivate_store(p_store_id, p_performed_by, p_migration_strategy, p_notes)`**
   - Desativa uma loja específica
   - Tenta migrar usuários para outra loja da mesma rede (se disponível)
   - Registra auditoria completa

### Funções de Reativação

3. **`reactivate_network(p_network_id, p_performed_by, p_notes)`**
   - Reativa uma rede previamente desativada

4. **`reactivate_store(p_store_id, p_performed_by, p_notes)`**
   - Reativa uma loja previamente desativada

### Funções de Consulta

5. **`count_users_affected_by_network_deactivation(p_network_id)`**
   - Retorna número de usuários afetados pela desativação de uma rede

6. **`count_users_affected_by_store_deactivation(p_store_id)`**
   - Retorna número de usuários afetados pela desativação de uma loja

7. **`get_users_affected_by_network_deactivation(p_network_id)`**
   - Retorna lista detalhada de usuários afetados

8. **`get_users_affected_by_store_deactivation(p_store_id)`**
   - Retorna lista detalhada de usuários afetados

## 🎯 Estratégias de Migração

### `auto_migrate` (Padrão)
- **Para Redes**: Desativa usuários (não há outra rede para migrar)
- **Para Lojas**: 
  - Tenta encontrar outra loja ativa na mesma rede
  - Se encontrar, migra usuários automaticamente
  - Se não encontrar, desativa usuários

### `deactivate_users`
- Desativa todos os usuários associados imediatamente

### `manual_review`
- Marca usuários para revisão manual posterior
- Não aplica nenhuma ação automática

## 🔌 API Routes Criadas

### Desativação
- `POST /api/networks/deactivate` - Desativa uma rede
- `POST /api/stores/deactivate` - Desativa uma loja

### Consulta de Usuários Afetados
- `GET /api/networks/affected-users?networkId={id}` - Lista usuários afetados por rede
- `GET /api/stores/affected-users?storeId={id}` - Lista usuários afetados por loja

### Parâmetros das APIs de Desativação

```json
{
  "networkId": "uuid", // ou "storeId" para lojas
  "migrationStrategy": "auto_migrate", // opcional, padrão: "auto_migrate"
  "notes": "Notas adicionais" // opcional
}
```

## 📝 O Que Você Precisa Fazer

### 1. Executar os Scripts SQL

Execute os scripts SQL na seguinte ordem no Supabase SQL Editor:

1. **Primeiro**: `sql/gerenciar_desativacao_redes_lojas.sql`
   - Cria tabelas de auditoria
   - Adiciona campos nas tabelas existentes
   - Cria funções de consulta
   - Configura RLS

2. **Segundo**: `sql/funcoes_desativacao_redes_lojas.sql`
   - Cria funções de desativação/reativação
   - Implementa lógica de migração

### 2. Testar a Funcionalidade

1. Acesse a página de "Configurações · Empresas"
2. Selecione uma loja para desativar
3. O sistema mostrará quantos usuários serão afetados
4. Confirme a desativação
5. Verifique se os usuários foram tratados corretamente

### 3. Verificar Auditoria

Você pode consultar o histórico de desativações executando:

```sql
SELECT * FROM deactivation_audit 
ORDER BY performed_at DESC 
LIMIT 10;
```

E verificar usuários afetados:

```sql
SELECT * FROM user_deactivation_impact 
WHERE resolved_at IS NULL;
```

## 🔒 Segurança

- ✅ Todas as APIs requerem autenticação de administrador
- ✅ Rate limiting aplicado em todas as rotas
- ✅ RLS habilitado nas novas tabelas
- ✅ Logs seguros (sem exposição de dados sensíveis)
- ✅ Validação de entrada em todas as funções

## 📊 Benefícios

1. **Rastreabilidade Completa**: Você sabe exatamente o que aconteceu, quando e quem fez
2. **Preservação de Dados**: Dados históricos são mantidos para relatórios
3. **Migração Inteligente**: Usuários são migrados automaticamente quando possível
4. **Auditoria**: Histórico completo para compliance e troubleshooting
5. **Flexibilidade**: Diferentes estratégias de migração conforme necessário

## 🚀 Próximos Passos (Opcional)

1. **Notificações por Email**: Enviar email aos usuários afetados
2. **Dashboard de Auditoria**: Interface para visualizar histórico de desativações
3. **Reativação em Lote**: Ferramenta para reativar múltiplas entidades
4. **Relatórios**: Gerar relatórios de impacto de desativações
5. **Migração Avançada**: Permitir escolher loja de destino manualmente

## ⚠️ Importante

- **Backup**: Sempre faça backup antes de executar scripts SQL em produção
- **Teste**: Teste primeiro em ambiente de desenvolvimento
- **Monitoramento**: Monitore a tabela `user_deactivation_impact` para usuários pendentes de resolução
- **Comunicação**: Informe usuários afetados sobre mudanças quando aplicável

