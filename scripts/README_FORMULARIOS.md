# Módulo de Formulários - Sistema TEM VENDA

## 📋 Visão Geral

O módulo de Formulários permite que gerentes criem formulários personalizados para coleta de dados dos colaboradores, com notificações automáticas via WhatsApp através da Z-API.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`forms`** - Formulários criados
   - Estrutura de perguntas (JSONB)
   - Configurações de notificação Z-API
   - Categorias e status

2. **`form_responses`** - Respostas dos formulários
   - Respostas (JSONB)
   - Status de notificação
   - Metadados de submissão

## 🚀 Instalação

### 1. Executar Script SQL

Execute o script SQL no Supabase SQL Editor:

```sql
-- Execute o arquivo: scripts/create-formularios-tables.sql
```

O script cria:
- As 2 novas tabelas
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
AND tablename IN ('forms', 'form_responses');
```

## 📦 Componentes Criados

### 1. FormulariosView.tsx
**Localização**: `src/components/formularios/FormulariosView.tsx`

**Funcionalidades**:
- Dashboard com estatísticas
- Navegação entre tabs (Listar, Criar, Respostas)
- Métricas em tempo real

### 2. CriarFormularioView.tsx
**Localização**: `src/components/formularios/CriarFormularioView.tsx`

**Funcionalidades**:
- Criação de formulários
- Tipos de perguntas:
  - Texto
  - Texto Longo
  - Número
  - Data
  - Seleção (Dropdown)
  - Seleção Única (Radio)
  - Múltipla Escolha (Checkbox)
- Configuração de notificações Z-API
- Template de mensagem personalizável

### 3. ListarFormulariosView.tsx
**Localização**: `src/components/formularios/ListarFormulariosView.tsx`

**Funcionalidades**:
- Lista de formulários criados
- Filtros (categoria, status)
- Busca por texto
- Ações: editar, duplicar, ativar/desativar, excluir

### 4. ResponderFormularioView.tsx
**Localização**: `src/components/formularios/ResponderFormularioView.tsx`

**Funcionalidades**:
- Interface para responder formulários
- Validação de campos obrigatórios
- Suporte a todos os tipos de perguntas
- Envio automático de notificação Z-API

### 5. RespostasView.tsx
**Localização**: `src/components/formularios/RespostasView.tsx`

**Funcionalidades**:
- Visualização de todas as respostas
- Filtros por formulário
- Busca por texto
- Exportação para CSV
- Detalhes de cada resposta

## 🎯 Como Usar

### Criar um Formulário

1. Acesse a aba **"Formulários"** no dashboard
2. Clique em **"Criar Formulário"**
3. Preencha as informações básicas:
   - Título
   - Descrição
   - Categoria
4. Adicione perguntas:
   - Clique em **"Adicionar Pergunta"**
   - Selecione o tipo de pergunta
   - Configure se é obrigatória
5. Configure notificações Z-API:
   - Ative/desative notificações
   - Adicione destinatários (números WhatsApp)
   - Personalize o template da mensagem
6. Salve o formulário

### Responder um Formulário

1. Acesse a aba **"Formulários"**
2. Clique em **"Responder"** no formulário desejado
3. Preencha todas as perguntas obrigatórias
4. Clique em **"Enviar Resposta"**
5. A notificação será enviada automaticamente via Z-API

### Visualizar Respostas

1. Acesse a aba **"Formulários"**
2. Clique na tab **"Respostas"**
3. Use os filtros para encontrar respostas específicas
4. Clique em **"Ver Detalhes"** para ver uma resposta completa
5. Exporte para CSV se necessário

## 📱 Integração Z-API

### Configuração

As notificações Z-API usam a configuração já existente no sistema:
- Busca automaticamente a configuração do banco de dados
- Usa variáveis de ambiente como fallback
- Suporta múltiplos destinatários por formulário

### Template de Mensagem

O template suporta as seguintes variáveis:
- `{formulario}` - Nome do formulário
- `{colaborador}` - Nome do colaborador
- `{loja}` - Nome da loja
- `{data}` - Data/hora da resposta
- `{respostas}` - Respostas formatadas

### Exemplo de Mensagem

```
📋 *Nova Resposta de Formulário*

*Formulário:* Avaliação de Desempenho
*Colaborador:* João Silva
*Loja:* Farmácia Central
*Data:* 15/01/2024 14:30

*Respostas:*
• Como você avalia seu desempenho?: Excelente
• Quais são seus pontos fortes?: Comunicação, Proatividade
• Áreas de melhoria: Organização
```

## 🔒 Segurança (RLS)

As políticas RLS garantem que:
- Usuários só veem formulários de suas lojas
- Gerentes podem criar/editar formulários de suas lojas
- Colaboradores podem responder formulários
- Admins têm acesso completo

## 📊 Estrutura de Dados

### Forms (Formulários)

```typescript
{
  id: UUID
  store_id: UUID
  title: TEXT
  description: TEXT
  category: TEXT // admission, evaluation, checklist, survey, other
  is_active: BOOLEAN
  allow_multiple_responses: BOOLEAN
  requires_authentication: BOOLEAN
  notify_on_response: BOOLEAN
  notification_recipients: JSONB // Array de números
  notification_template: TEXT
  questions: JSONB // Array de Question
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Form Responses (Respostas)

```typescript
{
  id: UUID
  form_id: UUID
  store_id: UUID
  employee_id: UUID
  responses: JSONB // { question_id: resposta }
  notification_sent: BOOLEAN
  notification_sent_at: TIMESTAMP
  notification_error: TEXT
  submitted_at: TIMESTAMP
  submitted_by: UUID
}
```

## 🐛 Troubleshooting

### Erro: "Tabela não encontrada"
- Verifique se o script SQL foi executado completamente
- Confirme que as tabelas foram criadas no schema `public`

### Erro: "Permissão negada"
- Verifique as políticas RLS
- Confirme que o usuário tem acesso à loja através de `store_members`

### Notificação Z-API não enviada
- Verifique se a configuração Z-API está correta
- Confirme que o formulário tem `notify_on_response = true`
- Verifique os logs do console para erros
- O erro será salvo em `notification_error` na resposta

## 📝 Próximos Passos

Funcionalidades que podem ser adicionadas:
- Edição de formulários existentes
- Lógica condicional (mostrar/ocultar perguntas)
- Upload de arquivos/imagens
- Agendamento de formulários
- Lembretes automáticos
- Relatórios avançados
- Gráficos e visualizações

## ✅ Checklist de Implementação

- [x] Criar tabelas no Supabase
- [x] Implementar FormulariosView
- [x] Implementar CriarFormularioView
- [x] Implementar ListarFormulariosView
- [x] Implementar ResponderFormularioView
- [x] Implementar RespostasView
- [x] Integrar notificação Z-API
- [x] Adicionar aba no dashboard principal
- [x] Configurar RLS policies
- [x] Testar criação de formulários
- [x] Testar respostas e notificações

## 📚 Referências

- [Documentação Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Z-API Documentation](https://developer.z-api.io/)
- [Sistema de Formulários - Documentação Original](SISTEMA_FORMULARIOS.md)

