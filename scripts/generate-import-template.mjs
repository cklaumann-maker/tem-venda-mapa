/**
 * ⚠️ AVISO DE SEGURANÇA: xlsx possui vulnerabilidades conhecidas (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
 * Este script APENAS CRIA arquivos Excel (não lê arquivos de usuários), reduzindo o risco.
 * NUNCA use para processar arquivos de fontes não confiáveis.
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar workbook
const workbook = XLSX.utils.book_new();

// ========================================
// ABA 1: REDE
// ========================================
const redeHeaders = [
  // Campos Obrigatórios
  'nome_rede*',
  'email_rede*',
  'telefone_rede*',
  'cep_rede*',
  'estado_rede*',
  'cidade_rede*',
  // Dados Básicos Opcionais
  'cnpj_rede',
  'razao_social_rede',
  'nome_fantasia_rede',
  'inscricao_estadual_rede',
  'inscricao_municipal_rede',
  'site_rede',
  'descricao_rede',
  // Endereço Completo Opcional
  'rua_rede',
  'numero_rede',
  'complemento_rede',
  'bairro_rede',
  // Contatos Adicionais Opcionais
  'telefone_secundario_rede',
  'email_secundario_rede',
  'whatsapp_rede',
  // Métricas Operacionais Opcionais
  'data_fundacao_rede',
  'quantidade_estimada_lojas',
  'meta_faturamento_mensal_rede',
  'media_funcionarios_por_loja',
  'segmento_mercado',
  'modelo_negocio',
  // Configurações Financeiras Opcionais
  'moeda_principal',
  'dia_fechamento_fiscal',
  'codigo_banco_principal',
  // Integrações Opcionais
  'tem_integracao_erp',
  'tipo_erp',
  // Outros Opcionais
  'tags_rede',
  'notas_internas_rede'
];

const redeExample = [
  // Campos Obrigatórios
  'Rede Exemplo',
  'contato@redeexemplo.com.br',
  '11999999999',
  '01310100',
  'SP',
  'São Paulo',
  // Dados Básicos Opcionais
  '12345678000190',
  'Rede Exemplo LTDA',
  'Rede Exemplo',
  '123.456.789.012',
  '123456',
  'https://redeexemplo.com.br',
  'Rede de farmácias com foco em atendimento humanizado',
  // Endereço Completo Opcional
  'Av. Paulista',
  '1000',
  'Sala 101',
  'Bela Vista',
  // Contatos Adicionais Opcionais
  '11988888888',
  'contato2@redeexemplo.com.br',
  '5511999999999',
  // Métricas Operacionais Opcionais
  '2020-01-15',
  '10',
  '500000000',
  '8',
  'farmacia',
  'propria',
  // Configurações Financeiras Opcionais
  'BRL',
  '31',
  '001',
  // Integrações Opcionais
  'true',
  'SAP',
  // Outros Opcionais
  'farmacia,regiao-sul',
  'Rede em expansão na região sul'
];

// Linha de descrição/instrução para cada campo
const redeDescriptions = [
  // Campos Obrigatórios
  'Nome comercial da rede',
  'E-mail válido (ex: email@dominio.com)',
  'Telefone (aceita qualquer formato)',
  'CEP 8 dígitos (ex: 01310100 ou 01310-100)',
  'UF 2 letras (ex: SP, RJ)',
  'Nome da cidade',
  // Dados Básicos Opcionais
  'CNPJ 14 dígitos (opcional)',
  'Razão social (se tiver CNPJ)',
  'Nome fantasia',
  'Inscrição estadual',
  'Inscrição municipal',
  'URL do site (ex: https://site.com)',
  'Descrição da rede',
  // Endereço Completo Opcional
  'Rua/avenida',
  'Número do endereço',
  'Complemento (apto, sala)',
  'Bairro',
  // Contatos Adicionais Opcionais
  'Telefone secundário',
  'E-mail secundário',
  'WhatsApp formato: 5511999999999',
  // Métricas Operacionais Opcionais
  'Data fundação (YYYY-MM-DD)',
  'Número estimado de lojas',
  'Meta mensal em centavos (ex: 500000000 = R$ 5.000.000)',
  'Média de funcionários por loja',
  'Segmento: farmacia/supermercado/varejo/outro',
  'Modelo: franquia/propria/mista',
  // Configurações Financeiras Opcionais
  'Moeda (padrão: BRL)',
  'Dia fechamento fiscal (1-31)',
  'Código banco FEBRABAN (ex: 001)',
  // Integrações Opcionais
  'Tem ERP? (true/false)',
  'Tipo de ERP (ex: SAP, TOTVS)',
  // Outros Opcionais
  'Tags separadas por vírgula',
  'Notas internas'
];

const redeData = [redeHeaders, redeDescriptions, redeExample];
const redeWorksheet = XLSX.utils.aoa_to_sheet(redeData);

// Adicionar largura das colunas
redeWorksheet['!cols'] = [
  { wch: 20 }, // nome_rede*
  { wch: 30 }, // email_rede*
  { wch: 15 }, // telefone_rede*
  { wch: 10 }, // cep_rede*
  { wch: 8 },  // estado_rede*
  { wch: 20 }, // cidade_rede*
  { wch: 18 }, // cnpj_rede
  { wch: 30 }, // razao_social_rede
  { wch: 20 }, // nome_fantasia_rede
  { wch: 18 }, // inscricao_estadual_rede
  { wch: 15 }, // inscricao_municipal_rede
  { wch: 35 }, // site_rede
  { wch: 40 }, // descricao_rede
  { wch: 25 }, // rua_rede
  { wch: 10 }, // numero_rede
  { wch: 15 }, // complemento_rede
  { wch: 15 }, // bairro_rede
  { wch: 20 }, // telefone_secundario_rede
  { wch: 30 }, // email_secundario_rede
  { wch: 15 }, // whatsapp_rede
  { wch: 12 }, // data_fundacao_rede
  { wch: 12 }, // quantidade_estimada_lojas
  { wch: 18 }, // meta_faturamento_mensal_rede
  { wch: 12 }, // media_funcionarios_por_loja
  { wch: 15 }, // segmento_mercado
  { wch: 15 }, // modelo_negocio
  { wch: 8 },  // moeda_principal
  { wch: 8 },  // dia_fechamento_fiscal
  { wch: 8 },  // codigo_banco_principal
  { wch: 8 },  // tem_integracao_erp
  { wch: 15 }, // tipo_erp
  { wch: 25 }, // tags_rede
  { wch: 40 }  // notas_internas_rede
];

XLSX.utils.book_append_sheet(workbook, redeWorksheet, 'Rede');

// ========================================
// ABA 2: LOJAS
// ========================================
const lojasHeaders = [
  // Campos Obrigatórios
  'nome_loja*',
  'cnpj_loja*',
  'razao_social_loja*',
  'cep_loja*',
  'estado_loja*',
  'cidade_loja*',
  'telefone_loja*',
  'email_loja*',
  // Dados Básicos Opcionais
  'codigo_interno_loja',
  'nome_gerente_loja',
  'inscricao_estadual_loja',
  'descricao_loja',
  // Endereço Completo Opcional
  'rua_loja',
  'numero_loja',
  'complemento_loja',
  'bairro_loja',
  'latitude_loja',
  'longitude_loja',
  // Contatos Opcionais
  'telefone_secundario_loja',
  'whatsapp_loja',
  'email_secundario_loja',
  // Operacionais Opcionais
  'data_abertura_loja',
  'status_operacional',
  'area_m2',
  'quantidade_funcionarios',
  'quantidade_caixas',
  'horario_funcionamento',
  'capacidade_maxima_clientes',
  // Métricas de Performance Opcionais
  'meta_faturamento_mensal_loja',
  'ticket_medio_estimado',
  'meta_clientes_diarios',
  // Financeiro Opcional
  'codigo_pdv',
  'configuracoes_pagamento',
  // Branding Opcional
  'cor_primaria_branding',
  'cor_secundaria_branding',
  'tagline_slogan',
  'email_suporte',
  'telefone_suporte',
  // Outros Opcionais
  'tags_loja',
  'notas_internas_loja',
  'fotos_loja'
];

const lojasExamples = [
  [
    // Campos Obrigatórios
    'Loja Centro',
    '98765432000111',
    'Loja Centro LTDA',
    '01310100',
    'SP',
    'São Paulo',
    '11988888888',
    'centro@redeexemplo.com.br',
    // Dados Básicos Opcionais
    'CENTRO-001',
    'João Silva',
    '123.456.789.012',
    'Loja localizada no centro da cidade',
    // Endereço Completo Opcional
    'Av. Paulista',
    '1000',
    'Sala 101',
    'Bela Vista',
    '-23.550520',
    '-46.633308',
    // Contatos Opcionais
    '11977777777',
    '5511988888888',
    'contato2@lojacentro.com.br',
    // Operacionais Opcionais
    '2021-03-15',
    'ativa',
    '150.50',
    '12',
    '4',
    '{"segunda":{"abre":"08:00","fecha":"20:00"},"terca":{"abre":"08:00","fecha":"20:00"}}',
    '50',
    // Métricas de Performance Opcionais
    '200000000',
    '500000',
    '200',
    // Financeiro Opcional
    'PDV-001',
    '{"credito":true,"debito":true,"pix":true}',
    // Branding Opcional
    '#0066CC',
    '#FF6600',
    'Sua saúde em primeiro lugar',
    'suporte@lojacentro.com.br',
    '11988888888',
    // Outros Opcionais
    'centro,24h',
    'Loja com estacionamento próprio',
    'https://exemplo.com/foto1.jpg,https://exemplo.com/foto2.jpg'
  ],
  [
    // Campos Obrigatórios
    'Loja Shopping',
    '98765432000122',
    'Loja Shopping LTDA',
    '04547000',
    'SP',
    'São Paulo',
    '11977777777',
    'shopping@redeexemplo.com.br',
    // Dados Básicos Opcionais
    'SHOP-001',
    'Maria Santos',
    '123.456.789.013',
    'Loja localizada no shopping center',
    // Endereço Completo Opcional
    'Av. Brigadeiro Faria Lima',
    '2000',
    '',
    'Pinheiros',
    '-23.567500',
    '-46.691200',
    // Contatos Opcionais
    '11966666666',
    '5511977777777',
    '',
    // Operacionais Opcionais
    '2022-06-01',
    'ativa',
    '200.00',
    '15',
    '6',
    '{"segunda":{"abre":"10:00","fecha":"22:00"}}',
    '80',
    // Métricas de Performance Opcionais
    '300000000',
    '600000',
    '300',
    // Financeiro Opcional
    'PDV-002',
    '',
    // Branding Opcional
    '',
    '',
    '',
    '',
    '',
    // Outros Opcionais
    'shopping,centro',
    '',
    ''
  ],
  [
    // Campos Obrigatórios
    'Loja Sul',
    '98765432000133',
    'Loja Sul LTDA',
    '04038001',
    'SP',
    'São Paulo',
    '11966666666',
    'sul@redeexemplo.com.br',
    // Dados Básicos Opcionais
    'SUL-001',
    'Pedro Costa',
    '',
    '',
    // Endereço Completo Opcional
    'Av. dos Bandeirantes',
    '3000',
    '',
    'Vila Olímpia',
    '',
    '',
    // Contatos Opcionais
    '11955555555',
    '5511966666666',
    '',
    // Operacionais Opcionais
    '',
    'ativa',
    '',
    '',
    '',
    '',
    '',
    // Métricas de Performance Opcionais
    '',
    '',
    '',
    // Financeiro Opcional
    '',
    '',
    // Branding Opcional
    '',
    '',
    '',
    '',
    '',
    // Outros Opcionais
    'sul',
    '',
    ''
  ]
];

// Linha de descrição/instrução para cada campo
const lojasDescriptions = [
  // Campos Obrigatórios
  'Nome da loja',
  'CNPJ 14 dígitos (obrigatório)',
  'Razão social (obrigatório)',
  'CEP 8 dígitos (ex: 01310100)',
  'UF 2 letras (ex: SP)',
  'Nome da cidade',
  'Telefone (qualquer formato)',
  'E-mail válido',
  // Dados Básicos Opcionais
  'Código interno único',
  'Nome do gerente',
  'Inscrição estadual',
  'Descrição da loja',
  // Endereço Completo Opcional
  'Rua/avenida',
  'Número',
  'Complemento',
  'Bairro',
  'Latitude (ex: -23.550520)',
  'Longitude (ex: -46.633308)',
  // Contatos Opcionais
  'Telefone secundário',
  'WhatsApp: 5511999999999',
  'E-mail secundário',
  // Operacionais Opcionais
  'Data abertura (YYYY-MM-DD)',
  'Status: ativa/em_construcao/em_reforma/temporariamente_fechada',
  'Área em m² (ex: 150.50)',
  'Quantidade de funcionários',
  'Quantidade de caixas',
  'Horários JSON (ver exemplo)',
  'Capacidade máxima clientes',
  // Métricas de Performance Opcionais
  'Meta mensal em centavos',
  'Ticket médio em centavos',
  'Meta clientes por dia',
  // Financeiro Opcional
  'Código do PDV',
  'Configurações JSON (ver exemplo)',
  // Branding Opcional
  'Cor primária hex (ex: #0066CC)',
  'Cor secundária hex (ex: #FF6600)',
  'Slogan/tagline',
  'E-mail de suporte',
  'Telefone de suporte',
  // Outros Opcionais
  'Tags separadas por vírgula',
  'Notas internas',
  'URLs de fotos separadas por vírgula'
];

const lojasData = [lojasHeaders, lojasDescriptions, ...lojasExamples];
const lojasWorksheet = XLSX.utils.aoa_to_sheet(lojasData);

// Adicionar largura das colunas
lojasWorksheet['!cols'] = [
  { wch: 20 }, // nome_loja*
  { wch: 18 }, // cnpj_loja*
  { wch: 30 }, // razao_social_loja*
  { wch: 10 }, // cep_loja*
  { wch: 8 },  // estado_loja*
  { wch: 20 }, // cidade_loja*
  { wch: 15 }, // telefone_loja*
  { wch: 30 }, // email_loja*
  { wch: 15 }, // codigo_interno_loja
  { wch: 20 }, // nome_gerente_loja
  { wch: 18 }, // inscricao_estadual_loja
  { wch: 40 }, // descricao_loja
  { wch: 25 }, // rua_loja
  { wch: 10 }, // numero_loja
  { wch: 15 }, // complemento_loja
  { wch: 15 }, // bairro_loja
  { wch: 12 }, // latitude_loja
  { wch: 12 }, // longitude_loja
  { wch: 20 }, // telefone_secundario_loja
  { wch: 15 }, // whatsapp_loja
  { wch: 30 }, // email_secundario_loja
  { wch: 12 }, // data_abertura_loja
  { wch: 15 }, // status_operacional
  { wch: 10 }, // area_m2
  { wch: 8 },  // quantidade_funcionarios
  { wch: 8 },  // quantidade_caixas
  { wch: 40 }, // horario_funcionamento
  { wch: 8 },  // capacidade_maxima_clientes
  { wch: 18 }, // meta_faturamento_mensal_loja
  { wch: 15 }, // ticket_medio_estimado
  { wch: 8 },  // meta_clientes_diarios
  { wch: 12 }, // codigo_pdv
  { wch: 40 }, // configuracoes_pagamento
  { wch: 12 }, // cor_primaria_branding
  { wch: 12 }, // cor_secundaria_branding
  { wch: 30 }, // tagline_slogan
  { wch: 30 }, // email_suporte
  { wch: 15 }, // telefone_suporte
  { wch: 25 }, // tags_loja
  { wch: 40 }, // notas_internas_loja
  { wch: 50 }  // fotos_loja
];

XLSX.utils.book_append_sheet(workbook, lojasWorksheet, 'Lojas');

// ========================================
// SALVAR ARQUIVO
// ========================================
// Validações de segurança
const templateDir = path.join(__dirname, '..', 'docs', 'templates');

// Garantir que o diretório está dentro do projeto (prevenir path traversal)
const projectRoot = path.resolve(__dirname, '..');
const resolvedTemplateDir = path.resolve(templateDir);
if (!resolvedTemplateDir.startsWith(projectRoot)) {
  throw new Error('❌ ERRO DE SEGURANÇA: Caminho de saída inválido');
}

// Criar diretório se não existir
if (!fs.existsSync(templateDir)) {
  fs.mkdirSync(templateDir, { recursive: true });
}

// Validar nome do arquivo (apenas alfanuméricos, hífens e underscores)
const outputFilename = 'template-importacao-rede-lojas.xlsx';
if (!/^[a-zA-Z0-9._-]+\.xlsx$/.test(outputFilename)) {
  throw new Error('❌ ERRO DE SEGURANÇA: Nome de arquivo inválido');
}

const outputPath = path.join(templateDir, outputFilename);

// Validar que não está sobrescrevendo arquivos críticos do sistema
const criticalPaths = [
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'next.config.ts'),
  path.join(projectRoot, 'tsconfig.json')
];
if (criticalPaths.includes(outputPath)) {
  throw new Error('❌ ERRO DE SEGURANÇA: Tentativa de sobrescrever arquivo crítico');
}

// Salvar arquivo
XLSX.writeFile(workbook, outputPath);

console.log('✅ Template XLSX criado com sucesso!');
console.log(`📁 Localização: ${outputPath}`);
console.log('\n📋 Estrutura:');
console.log('  - Aba "Rede": Dados da rede (1 linha de exemplo)');
console.log('  - Aba "Lojas": Dados das lojas (3 linhas de exemplo)');
console.log('\n💡 Campos marcados com * são obrigatórios');

