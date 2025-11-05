# Sistema de Formulários - Aba Equipe

## 📋 Visão Geral

O sistema de formulários da aba "Equipe" permite que gerentes criem formulários personalizados para coleta de dados dos funcionários, com notificações automáticas via WhatsApp através da Z-API.

## 🚀 Funcionalidades Principais

### 1. **Criação de Formulários**
- Interface intuitiva para gerentes criarem formulários
- Múltiplos tipos de perguntas disponíveis
- Validação de campos obrigatórios
- Preview em tempo real

### 2. **Tipos de Perguntas Disponíveis**
- **Texto**: Campo de entrada simples
- **Texto Longo**: Área de texto para respostas extensas
- **Seleção**: Dropdown com opções predefinidas
- **Múltipla Escolha**: Botões de rádio
- **Caixas de Seleção**: Checkboxes múltiplos
- **Imagem**: Upload de imagens
- **Data**: Seletor de data
- **Número**: Campo numérico

### 3. **Sistema de Respostas**
- Interface amigável para funcionários responderem
- Validação automática de campos obrigatórios
- Histórico completo de respostas
- Timestamp de submissão

### 4. **Integração Z-API**
- Notificações automáticas via WhatsApp
- Configuração simples de instância e token
- Teste de conexão integrado
- Mensagens formatadas com dados do formulário

## 🛠️ Como Usar

### Para Gerentes

1. **Acesse a aba "Equipe"**
2. **Clique em "Novo Formulário"**
3. **Configure o formulário:**
   - Título e descrição
   - Adicione perguntas usando os tipos disponíveis
   - Configure campos obrigatórios
   - Visualize o formulário antes de salvar
4. **Salve o formulário**
5. **Configure a Z-API** na aba "Configurações"

### Para Funcionários

1. **Acesse a aba "Equipe"**
2. **Clique em "Responder"** no formulário desejado
3. **Preencha todas as perguntas obrigatórias**
4. **Clique em "Enviar Resposta"**
5. **Confirmação automática via WhatsApp**

## 📱 Configuração Z-API

### Pré-requisitos
- Conta ativa na Z-API
- Instância configurada
- Token de acesso
- Número WhatsApp dos gerentes

### Passos para Configuração

1. **Acesse a aba "Configurações"**
2. **Preencha os campos:**
   - **Instância Z-API**: Sua instância (ex: `3C4F5A6B7C8D9E0F`)
   - **Token Z-API**: Seu token de acesso
   - **Número WhatsApp**: Número dos gerentes (formato: `5511999999999`)
3. **Clique em "Salvar Configurações"**
4. **Teste a conexão** com o botão "Testar Conexão"

### Formato das Mensagens

As mensagens enviadas via WhatsApp seguem este formato:

```
📋 *Nova Resposta de Formulário*

*Formulário:* Nome do Formulário
*Funcionário:* Nome do Funcionário
*Data:* DD/MM/AAAA HH:MM

*Respostas:*
• Pergunta 1: Resposta 1
• Pergunta 2: Resposta 2
• Pergunta 3: Resposta 3
```

## 🔧 Estrutura Técnica

### Componentes Principais

- **`EquipeView.tsx`**: Componente principal da aba
- **`zapi.ts`**: Serviço de integração com Z-API
- **`ZApiConfigComponent`**: Interface de configuração

### Tipos de Dados

```typescript
interface Question {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'image' | 'date' | 'number';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  imageUrl?: string;
  placeholder?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface FormResponse {
  id: string;
  formId: string;
  employeeId: string;
  employeeName: string;
  responses: Record<string, any>;
  submittedAt: string;
}
```

## 📊 Funcionalidades por Aba

### Aba "Formulários"
- Lista de formulários criados
- Criação de novos formulários
- Edição de formulários existentes
- Visualização de formulários

### Aba "Respostas"
- Histórico completo de respostas
- Filtros por formulário
- Detalhes de cada resposta
- Timestamp de submissão

### Aba "Funcionários"
- Lista de funcionários cadastrados
- Informações de contato
- Status de função (Gerente/Funcionário)
- Botão de contato WhatsApp

### Aba "Configurações"
- Configuração da Z-API
- Teste de conexão
- Salvamento de configurações
- Status da configuração

## 🔒 Segurança e Autenticação

- **Autenticação**: Integrado com sistema Supabase existente
- **Autorização**: Gerentes podem criar formulários, funcionários podem responder
- **Dados**: Armazenamento seguro no Supabase
- **API**: Tokens Z-API armazenados localmente (localStorage)

## 🚀 Próximas Melhorias

### Funcionalidades Planejadas
- [ ] Integração com Supabase para persistência
- [ ] Sistema de permissões mais granular
- [ ] Relatórios e análises de respostas
- [ ] Templates de formulários pré-definidos
- [ ] Notificações por email
- [ ] Exportação de dados em Excel/PDF
- [ ] Sistema de agendamento de formulários
- [ ] Integração com calendário

### Melhorias de UX
- [ ] Drag & drop para reordenar perguntas
- [ ] Preview em tempo real
- [ ] Validação avançada de campos
- [ ] Sistema de rascunhos
- [ ] Histórico de versões de formulários

## 📞 Suporte

Para dúvidas ou problemas com o sistema de formulários:

1. **Verifique a configuração Z-API** na aba "Configurações"
2. **Teste a conexão** antes de usar
3. **Verifique os logs** do console do navegador
4. **Entre em contato** com o suporte técnico

---

**Sistema desenvolvido para TEM VENDA**  
*Versão 1.0 - Sistema de Formulários e Gestão de Equipe*

