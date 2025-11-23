# 📋 Instruções - Configuração do Módulo de Equipe

## 🗄️ Criar Tabelas no Supabase

### Passo 1: Acessar o Supabase Dashboard
1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto **TEM VENDA**

### Passo 2: Executar o Script SQL
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Abra o arquivo `scripts/create-equipe-tables.sql`
4. Copie todo o conteúdo do arquivo
5. Cole no editor SQL do Supabase
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Passo 3: Verificar Criação das Tabelas
1. No menu lateral, clique em **Table Editor**
2. Verifique se as seguintes tabelas foram criadas:
   - ✅ `employees` (Colaboradores)
   - ✅ `employee_shifts` (Escalas)
   - ✅ `time_records` (Registros de Ponto)
   - ✅ `overtime_requests` (Solicitações de Horas Extras)

### Passo 4: Verificar Políticas RLS
1. No menu lateral, clique em **Authentication** > **Policies**
2. Verifique se as políticas RLS foram criadas para cada tabela
3. As políticas garantem que:
   - Admins podem ver/gerenciar tudo
   - Gerentes podem gerenciar dados da sua loja
   - Colaboradores podem ver seus próprios dados

---

## ✅ Verificação de Funcionamento

### Teste 1: Cadastrar Colaborador
1. Acesse a aplicação: `http://localhost:3000`
2. Vá para a aba **Equipe** > **Colaboradores**
3. Clique em **Novo Colaborador**
4. Preencha os dados e salve
5. Verifique se o colaborador aparece na lista

### Teste 2: Criar Escala
1. Vá para a aba **Equipe** > **Escalas**
2. Clique em **Nova Escala**
3. Selecione um colaborador e preencha os dados
4. Salve a escala
5. Verifique se aparece no calendário

### Teste 3: Registrar Ponto
1. Vá para a aba **Equipe** > **Ponto**
2. Selecione um colaborador e a data
3. Clique em **Registrar Entrada**
4. Depois clique em **Registrar Saída**
5. Verifique se o registro aparece na lista

---

## 🔧 Troubleshooting

### Erro: "relation does not exist"
- **Causa**: Tabelas não foram criadas
- **Solução**: Execute o script SQL novamente

### Erro: "permission denied"
- **Causa**: Políticas RLS não foram criadas ou estão incorretas
- **Solução**: Verifique as políticas no Supabase Dashboard

### Erro: "foreign key constraint"
- **Causa**: Tentando criar registro sem loja válida
- **Solução**: Certifique-se de ter uma loja cadastrada e selecionada

### Dados não aparecem
- **Causa**: Filtro de loja não está funcionando
- **Solução**: Verifique se a loja está selecionada no sistema

---

## 📊 Estrutura das Tabelas

### `employees`
- Armazena dados dos colaboradores
- Relacionado com `stores` e `auth.users`
- Campos principais: nome, CPF, cargo, status

### `employee_shifts`
- Armazena escalas de trabalho
- Relacionado com `employees` e `stores`
- Campos principais: data, turno, horários

### `time_records`
- Armazena registros de ponto
- Relacionado com `employees` e `stores`
- Campos principais: entrada, saída, horas trabalhadas

### `overtime_requests`
- Armazena solicitações de horas extras
- Relacionado com `employees` e `stores`
- Campos principais: data, horas, status de aprovação

---

## 🚀 Próximos Passos

Após configurar as tabelas, você pode:
1. ✅ Cadastrar colaboradores
2. ✅ Criar escalas mensais
3. ✅ Registrar ponto diário
4. ⏳ Implementar horas extras (Fase 2)
5. ⏳ Processo de admissão (Fase 2)
6. ⏳ Gestão de documentos (Fase 2)

---

## 📝 Notas Importantes

- As tabelas usam **Row Level Security (RLS)** para segurança
- Apenas usuários autenticados podem acessar os dados
- Cada loja só vê seus próprios dados
- Admins podem ver dados de todas as lojas

