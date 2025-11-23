# 📋 Instruções - Configuração Fase 2 do Módulo de Equipe

## 🗄️ Criar Tabelas Adicionais no Supabase

### Passo 1: Executar Script SQL da Fase 2
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Abra o arquivo `scripts/create-equipe-phase2-tables.sql`
5. Copie todo o conteúdo e cole no editor
6. Clique em **Run**

### Passo 2: Verificar Tabelas Criadas
Verifique se as seguintes tabelas foram criadas:
- ✅ `admissions` (Processos de Admissão)
- ✅ `employee_documents` (Documentos)
- ✅ `vacations` (Férias)
- ✅ `leaves` (Licenças/Afastamentos)

---

## 📦 Configurar Storage para Documentos

### Passo 1: Criar Bucket
1. No Supabase Dashboard, vá em **Storage**
2. Clique em **New bucket**
3. Configure:
   - **Name**: `employee-documents`
   - **Public bucket**: ✅ **DESMARCADO** (privado)
   - **File size limit**: 10 MB (ou o valor desejado)
   - **Allowed MIME types**: `application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Passo 2: Configurar Políticas de Storage
1. Vá em **Storage** > **Policies**
2. Selecione o bucket `employee-documents`
3. Crie as seguintes políticas:

#### Política 1: Usuários podem visualizar documentos da sua loja
```sql
CREATE POLICY "Users can view documents from their stores"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM employees
    WHERE store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  )
);
```

#### Política 2: Gerentes podem fazer upload
```sql
CREATE POLICY "Managers can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM employees
    WHERE store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  )
);
```

#### Política 3: Gerentes podem deletar documentos
```sql
CREATE POLICY "Managers can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM employees
    WHERE store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  )
);
```

---

## ✅ Funcionalidades da Fase 2

### 1. ⏰ Horas Extras
- ✅ Solicitação de horas extras
- ✅ Aprovação/Rejeição por gerentes
- ✅ Cálculo automático de horas
- ✅ Histórico completo
- ✅ Resumo de métricas

### 2. ➕ Processo de Admissão
- ✅ Checklist completo de admissão
- ✅ Acompanhamento de progresso
- ✅ Status visual (em andamento, concluído)
- ✅ Observações e notas

### 3. 📄 Gestão de Documentos
- ✅ Upload de documentos
- ✅ Categorização por tipo
- ✅ Controle de validade
- ✅ Alertas de vencimento
- ✅ Download de documentos
- ✅ Filtros avançados

### 4. 🏖️ Gestão de Férias
- ✅ Solicitação de férias
- ✅ Aprovação/Rejeição
- ✅ Cálculo automático de dias
- ✅ Calendário de férias
- ✅ Status de férias em andamento
- ✅ Resumo de métricas

---

## 🧪 Testes Recomendados

### Teste 1: Horas Extras
1. Vá em **Equipe** > **Horas Extras**
2. Clique em **Nova Solicitação**
3. Preencha os dados e envie
4. Como gerente, aprove ou rejeite a solicitação
5. Verifique se aparece no histórico

### Teste 2: Admissão
1. Vá em **Equipe** > **Admissão**
2. Clique em **Novo Processo**
3. Selecione um colaborador
4. Marque os itens do checklist
5. Verifique o progresso atualizar

### Teste 3: Documentos
1. Vá em **Equipe** > **Documentos**
2. Clique em **Novo Documento**
3. Faça upload de um arquivo
4. Defina data de vencimento
5. Verifique se aparece na lista
6. Teste o filtro "Vencendo em 30 dias"

### Teste 4: Férias
1. Vá em **Equipe** > **Férias**
2. Clique em **Nova Solicitação**
3. Preencha período de férias
4. Envie a solicitação
5. Como gerente, aprove ou rejeite
6. Verifique se aparece no calendário

---

## 🔧 Troubleshooting

### Erro: "Bucket not found"
- **Causa**: Bucket de storage não foi criado
- **Solução**: Crie o bucket `employee-documents` conforme instruções acima

### Erro: "Permission denied" no upload
- **Causa**: Políticas de storage não configuradas
- **Solução**: Configure as políticas RLS do storage conforme acima

### Erro: "Invalid file type"
- **Causa**: Tipo de arquivo não permitido
- **Solução**: Verifique os MIME types permitidos no bucket

### Documentos não aparecem
- **Causa**: Políticas RLS muito restritivas
- **Solução**: Verifique as políticas de `employee_documents` e storage

---

## 📊 Estrutura de Dados

### `admissions`
- Processos de admissão com checklist JSONB
- Status: in_progress, completed, cancelled

### `employee_documents`
- Documentos com URL do storage
- Controle de validade
- Categorização por tipo

### `vacations`
- Solicitações de férias
- Aprovação/Rejeição
- Status: requested, approved, rejected, taken, cancelled

### `leaves`
- Licenças e afastamentos
- Tipos: medical, maternity, paternity, etc.
- Controle de período

---

## 🎯 Próximos Passos (Fase 3)

- [ ] Processo de rescisão completo
- [ ] Cálculo automático de verbas rescisórias
- [ ] Avaliações de performance
- [ ] Relatórios gerenciais avançados
- [ ] Integração com folha de pagamento
- [ ] Notificações automáticas via WhatsApp

