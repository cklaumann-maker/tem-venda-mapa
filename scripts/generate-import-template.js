// Usar CommonJS para compatibilidade
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
  'nome_rede*',
  'email_rede*',
  'telefone_rede*',
  'cep_rede*',
  'estado_rede*',
  'cidade_rede*',
  'cnpj_rede',
  'razao_social_rede',
  'telefone_secundario_rede',
  'whatsapp_rede',
  'site_rede'
];

const redeExample = [
  'Rede Exemplo',
  'contato@redeexemplo.com.br',
  '11999999999',
  '01310100',
  'SP',
  'São Paulo',
  '12345678000190',
  'Rede Exemplo LTDA',
  '11988888888',
  '5511999999999',
  'https://redeexemplo.com.br'
];

const redeData = [redeHeaders, redeExample];
const redeWorksheet = XLSX.utils.aoa_to_sheet(redeData);

// Adicionar largura das colunas
redeWorksheet['!cols'] = [
  { wch: 20 }, // nome_rede
  { wch: 30 }, // email_rede
  { wch: 15 }, // telefone_rede
  { wch: 10 }, // cep_rede
  { wch: 8 },  // estado_rede
  { wch: 20 }, // cidade_rede
  { wch: 18 }, // cnpj_rede
  { wch: 30 }, // razao_social_rede
  { wch: 20 }, // telefone_secundario_rede
  { wch: 15 }, // whatsapp_rede
  { wch: 35 }  // site_rede
];

XLSX.utils.book_append_sheet(workbook, redeWorksheet, 'Rede');

// ========================================
// ABA 2: LOJAS
// ========================================
const lojasHeaders = [
  'nome_loja*',
  'cnpj_loja*',
  'razao_social_loja*',
  'cep_loja*',
  'estado_loja*',
  'cidade_loja*',
  'telefone_loja*',
  'email_loja*',
  'rua_loja',
  'numero_loja',
  'complemento_loja',
  'bairro_loja',
  'telefone_secundario_loja',
  'whatsapp_loja',
  'gerente_loja'
];

const lojasExamples = [
  [
    'Loja Centro',
    '98765432000111',
    'Loja Centro LTDA',
    '01310100',
    'SP',
    'São Paulo',
    '11988888888',
    'centro@redeexemplo.com.br',
    'Av. Paulista',
    '1000',
    'Sala 101',
    'Bela Vista',
    '11977777777',
    '5511988888888',
    'João Silva'
  ],
  [
    'Loja Shopping',
    '98765432000122',
    'Loja Shopping LTDA',
    '04547000',
    'SP',
    'São Paulo',
    '11977777777',
    'shopping@redeexemplo.com.br',
    'Av. Brigadeiro Faria Lima',
    '2000',
    '',
    'Pinheiros',
    '11966666666',
    '5511977777777',
    'Maria Santos'
  ],
  [
    'Loja Sul',
    '98765432000133',
    'Loja Sul LTDA',
    '04038001',
    'SP',
    'São Paulo',
    '11966666666',
    'sul@redeexemplo.com.br',
    'Av. dos Bandeirantes',
    '3000',
    '',
    'Vila Olímpia',
    '11955555555',
    '5511966666666',
    'Pedro Costa'
  ]
];

const lojasData = [lojasHeaders, ...lojasExamples];
const lojasWorksheet = XLSX.utils.aoa_to_sheet(lojasData);

// Adicionar largura das colunas
lojasWorksheet['!cols'] = [
  { wch: 20 }, // nome_loja
  { wch: 18 }, // cnpj_loja
  { wch: 30 }, // razao_social_loja
  { wch: 10 }, // cep_loja
  { wch: 8 },  // estado_loja
  { wch: 20 }, // cidade_loja
  { wch: 15 }, // telefone_loja
  { wch: 30 }, // email_loja
  { wch: 25 }, // rua_loja
  { wch: 10 }, // numero_loja
  { wch: 15 }, // complemento_loja
  { wch: 15 }, // bairro_loja
  { wch: 20 }, // telefone_secundario_loja
  { wch: 15 }, // whatsapp_loja
  { wch: 20 }  // gerente_loja
];

XLSX.utils.book_append_sheet(workbook, lojasWorksheet, 'Lojas');

// ========================================
// SALVAR ARQUIVO
// ========================================
const templateDir = path.join(__dirname, '..', 'docs', 'templates');
if (!fs.existsSync(templateDir)) {
  fs.mkdirSync(templateDir, { recursive: true });
}

const outputPath = path.join(templateDir, 'template-importacao-rede-lojas.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('✅ Template XLSX criado com sucesso!');
console.log(`📁 Localização: ${outputPath}`);
console.log('\n📋 Estrutura:');
console.log('  - Aba "Rede": Dados da rede (1 linha de exemplo)');
console.log('  - Aba "Lojas": Dados das lojas (3 linhas de exemplo)');
console.log('\n💡 Campos marcados com * são obrigatórios');

