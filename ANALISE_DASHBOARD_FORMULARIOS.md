# Análise: Dashboard de Formulários

## 📊 Objetivo
Criar um dashboard analítico que permita aos gestores:
1. **Monitorar engajamento**: Verificar se os formulários estão sendo respondidos
2. **Identificar padrões**: Descobrir quais respostas são mais frequentes
3. **Tomar ações**: Cobrar colaboradores que não responderam e entender tendências

## 🎯 Estrutura do Dashboard

### 1. **Visão Geral (Topo)**
- **Total de Formulários Ativos**: Contador simples
- **Taxa Média de Resposta**: Média geral de todos os formulários ativos
- **Total de Respostas Recebidas**: Soma de todas as respostas
- **Última Resposta**: Quando foi a última resposta recebida

### 2. **Análise Individual por Formulário** (Principal)

Para cada formulário ativo, mostrar:

#### A. **Card de Status do Formulário**
- Título do formulário
- Status visual (verde/amarelo/vermelho) baseado na taxa de resposta:
  - 🟢 Verde: ≥ 80% de resposta
  - 🟡 Amarelo: 50-79% de resposta
  - 🔴 Vermelho: < 50% de resposta
- Métricas rápidas:
  - Total de respostas recebidas
  - Total de colaboradores que deveriam responder
  - Taxa de resposta (%)
  - Última resposta recebida

#### B. **Gráfico de Taxa de Resposta**
- Barra horizontal mostrando:
  - Total de colaboradores (barra cinza)
  - Quantos responderam (barra verde)
  - Quantos não responderam (barra vermelha)

#### C. **Análise de Respostas por Pergunta**
Para cada pergunta do formulário, mostrar:

1. **Perguntas de Seleção Única (radio, select)**:
   - Gráfico de barras ou pizza mostrando:
     - Cada opção disponível
     - Quantas vezes cada opção foi selecionada
     - Percentual de cada opção

2. **Perguntas de Múltipla Escolha (checkbox)**:
   - Gráfico de barras mostrando:
     - Cada opção disponível
     - Quantas vezes cada opção foi marcada
     - Percentual de cada opção

3. **Perguntas de Texto/Texto Longo**:
   - Contador de respostas
   - Palavras mais frequentes (word cloud ou lista)
   - Exemplos de respostas (primeiras 3-5)

4. **Perguntas Numéricas**:
   - Estatísticas:
     - Média
     - Mediana
     - Mínimo
     - Máximo
   - Gráfico de distribuição (histograma)

5. **Perguntas de Data**:
   - Distribuição por período
   - Gráfico de linha temporal

#### D. **Timeline de Respostas**
- Gráfico de linha mostrando:
  - Quantas respostas foram recebidas por dia/semana
  - Tendência de engajamento ao longo do tempo

#### E. **Lista de Colaboradores que Não Responderam**
- Tabela com:
  - Nome do colaborador
  - Data de última resposta (se houver em outros formulários)
  - Ação: Botão para enviar lembrete (futuro)

## 📈 Métricas Calculadas

### Taxa de Resposta
```
Taxa = (Número de respostas únicas / Total de colaboradores ativos) × 100
```

**Nota**: Se `allow_multiple_responses = true`, considerar todas as respostas. Caso contrário, contar apenas colaboradores únicos que responderam.

### Colaboradores que Devem Responder
- Se `requires_authentication = true`: Contar colaboradores ativos da loja
- Se `requires_authentication = false`: Usar número total de respostas como referência

## 🎨 Visualizações Sugeridas

1. **Gráficos de Barras**: Para comparação de opções
2. **Gráficos de Pizza**: Para distribuição percentual
3. **Gráficos de Linha**: Para tendências temporais
4. **Indicadores de Status**: Cores para taxa de resposta
5. **Tabelas**: Para listas detalhadas

## 🔍 Filtros e Períodos

- **Filtro por Formulário**: Dropdown para selecionar formulário específico
- **Filtro por Período**: 
  - Últimos 7 dias
  - Últimos 30 dias
  - Últimos 90 dias
  - Personalizado (date picker)
- **Filtro por Status**: Apenas ativos, apenas inativos, todos

## 📱 Responsividade

- Cards em grid responsivo (1 coluna mobile, 2-3 colunas desktop)
- Gráficos adaptáveis ao tamanho da tela
- Tabelas com scroll horizontal em mobile

## 🚀 Funcionalidades Futuras

1. **Exportação**: CSV/PDF do dashboard
2. **Alertas**: Notificações quando taxa de resposta cai abaixo de X%
3. **Comparação**: Comparar formulários entre si
4. **Lembretes Automáticos**: Enviar WhatsApp para quem não respondeu
5. **Relatórios Agendados**: Enviar dashboard por email periodicamente

## 💡 Exemplo de Uso

**Cenário**: Gestor quer saber se o formulário "Avaliação de Desempenho" está sendo respondido.

1. Acessa a aba "Dashboards"
2. Vê que há 5 formulários ativos
3. Seleciona "Avaliação de Desempenho"
4. Vê que a taxa de resposta é 60% (amarelo)
5. Analisa que a pergunta "Como você avalia seu desempenho?" tem:
   - 40% respondeu "Bom"
   - 30% respondeu "Muito Bom"
   - 20% respondeu "Regular"
   - 10% respondeu "Excelente"
6. Vê que 8 colaboradores ainda não responderam
7. Pode cobrar esses colaboradores especificamente

