"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

// ==================== Types ====================
type LinhaHist = { 
  ano: number; 
  mes: number; 
  loja: string; 
  cidade?: string; 
  estado?: string; 
  venda_total: number 
};

interface MetasStep1Props {
  onDataLoaded: (data: LinhaHist[], lojas: string[]) => void;
  historico: LinhaHist[];
  lojas: string[];
}

// ==================== Component ====================
export default function MetasStep1({ onDataLoaded, historico, lojas }: MetasStep1Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ======= Importação CSV =======
  function importarCSV(file: File) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift()?.split(',').map(h => h.trim().toLowerCase());
        
        if (!header) {
          setError("Arquivo CSV inválido");
          setIsLoading(false);
          return;
        }

        const idxAno = header.indexOf('ano');
        const idxMes = header.indexOf('mes');
        const idxLoja = header.indexOf('loja');
        const idxCidade = header.indexOf('cidade');
        const idxEstado = header.indexOf('estado');
        const idxVenda = header.indexOf('venda_total');

        if (idxAno === -1 || idxMes === -1 || idxLoja === -1 || idxVenda === -1) {
          setError("Colunas obrigatórias não encontradas: ano, mes, loja, venda_total");
          setIsLoading(false);
          return;
        }

        const parsed: LinhaHist[] = [];
        for (const line of lines) {
          const cols = line.split(',');
          const row: LinhaHist = {
            ano: parseInt(cols[idxAno] || '0'),
            mes: parseInt(cols[idxMes] || '0'),
            loja: (cols[idxLoja] || '').trim(),
            cidade: idxCidade >= 0 ? (cols[idxCidade] || '').trim() : undefined,
            estado: idxEstado >= 0 ? (cols[idxEstado] || '').trim() : undefined,
            venda_total: parseFloat((cols[idxVenda] || '0').replace(/\./g, '').replace(',', '.')),
          };
          if (row.ano && row.mes && row.loja) parsed.push(row);
        }

        if (parsed.length === 0) {
          setError("Nenhum dado válido encontrado no arquivo");
          setIsLoading(false);
          return;
        }

        const lojasUnicas = [...new Set(parsed.map(r => r.loja))];
        onDataLoaded(parsed, lojasUnicas);
        setSuccess(true);
        setError(null);
      } catch (err) {
        setError("Erro ao processar arquivo: " + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  }

  function carregarMock() {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Simular carregamento
    setTimeout(() => {
      const lojasEx = [
        { nome: 'Loja Central', cidade: 'São Paulo', estado: 'SP' },
        { nome: 'Filial 1', cidade: 'Campinas', estado: 'SP' },
        { nome: 'Filial 2', cidade: 'Santos', estado: 'SP' },
      ];
      
      const mock: LinhaHist[] = [];
      for (let ano of [2024, 2025]) {
        for (let m = 1; m <= 12; m++) {
          lojasEx.forEach((l, i) => {
            const base = 80000 + i * 15000;
            const saz = [1, 2].includes(m) ? 0.92 : [11, 12].includes(m) ? 1.12 : 1.0;
            mock.push({ 
              ano, 
              mes: m, 
              loja: l.nome, 
              cidade: l.cidade, 
              estado: l.estado, 
              venda_total: Math.round(base * saz) 
            });
          });
        }
      }
      
      onDataLoaded(mock, lojasEx.map(l => l.nome));
      setSuccess(true);
      setIsLoading(false);
    }, 1500);
  }

  const br = (n: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Upload className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Importar Histórico de Vendas</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Carregue o histórico de vendas dos últimos 24 meses para calcular as metas do próximo ano.
        </p>
      </div>

      {/* UPLOAD CARD */}
      <Card className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-300 transition-colors">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Upload do Arquivo CSV
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Formato esperado: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  ano,mes,loja,cidade,estado,venda_total
                </code>
              </p>
            </div>

            <div className="space-y-3">
              <Input 
                type="file" 
                accept=".csv" 
                onChange={(e) => { 
                  const f = e.target.files?.[0]; 
                  if (f) importarCSV(f); 
                }}
                className="max-w-md mx-auto"
                disabled={isLoading}
              />
              
              <div className="text-sm text-gray-500">
                ou
              </div>
              
              <Button 
                variant="outline" 
                onClick={carregarMock}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Carregar Dados de Exemplo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOADING STATE */}
      {isLoading && (
        <Card className="rounded-2xl border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div>
                <div className="font-medium text-blue-900">Processando arquivo...</div>
                <div className="text-sm text-blue-700">Aguarde enquanto processamos os dados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ERROR STATE */}
      {error && (
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <div className="font-medium text-red-900">Erro no processamento</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUCCESS STATE */}
      {success && (
        <Card className="rounded-2xl border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Dados carregados com sucesso!</div>
                <div className="text-sm text-green-700">
                  {historico.length} registros importados de {lojas.length} lojas
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DATA PREVIEW */}
      {historico.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Dados Carregados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="text-sm text-green-700 font-medium">Total de Registros</div>
                <div className="text-2xl font-bold text-green-900">{historico.length}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-sm text-blue-700 font-medium">Lojas Identificadas</div>
                <div className="text-2xl font-bold text-blue-900">{lojas.length}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-sm text-purple-700 font-medium">Período</div>
                <div className="text-lg font-bold text-purple-900">
                  {Math.min(...historico.map(h => h.ano))} - {Math.max(...historico.map(h => h.ano))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Lojas detectadas:</div>
              <div className="flex flex-wrap gap-2">
                {lojas.map((loja, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {loja}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


