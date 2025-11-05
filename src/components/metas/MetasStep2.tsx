"use client";
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, TrendingUp, Calculator, Target } from "lucide-react";

// ==================== Types ====================
interface MetasStep2Props {
  onIndicesChange: (indices: {
    partMedicamentos: number;
    inflacao: number;
    cmed: number;
    crescimento: number;
  }) => void;
  indices: {
    partMedicamentos: number;
    inflacao: number;
    cmed: number;
    crescimento: number;
  };
}

// ==================== Component ====================
export default function MetasStep2({ onIndicesChange, indices }: MetasStep2Props) {
  const [localIndices, setLocalIndices] = useState(indices);

  const taxaComposta = useMemo(() => 
    localIndices.inflacao + (localIndices.cmed * localIndices.partMedicamentos) + localIndices.crescimento, 
    [localIndices]
  );

  const handleChange = (field: keyof typeof localIndices, value: number) => {
    const newIndices = { ...localIndices, [field]: value };
    setLocalIndices(newIndices);
    onIndicesChange(newIndices);
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const pct = (n: number) => ((n || 0) * 100).toFixed(2) + '%';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Configurar Índices Econômicos</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Defina os índices que serão aplicados para calcular o crescimento das metas.
        </p>
      </div>

      {/* INDICES CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PARTICIPAÇÃO MEDICAMENTOS */}
        <Card className="rounded-2xl border-2 hover:border-green-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              Participação de Medicamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Percentual de medicamentos no faturamento (%)
              </Label>
              <Input
                type="number"
                value={(localIndices.partMedicamentos * 100).toFixed(1)}
                onChange={(e) => handleChange('partMedicamentos', clamp01((+e.target.value || 0) / 100))}
                className="mt-2"
                placeholder="55.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentual que medicamentos representam no faturamento total
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-700 font-medium">Valor atual</div>
              <div className="text-lg font-bold text-green-900">
                {pct(localIndices.partMedicamentos)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* INFLAÇÃO */}
        <Card className="rounded-2xl border-2 hover:border-blue-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              Inflação Anual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Taxa de inflação esperada (%)
              </Label>
              <Input
                type="number"
                value={(localIndices.inflacao * 100).toFixed(2)}
                onChange={(e) => handleChange('inflacao', Math.max(0, (+e.target.value || 0) / 100))}
                className="mt-2"
                placeholder="4.50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Inflação geral da economia para o próximo ano
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-700 font-medium">Valor atual</div>
              <div className="text-lg font-bold text-blue-900">
                {pct(localIndices.inflacao)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CMED */}
        <Card className="rounded-2xl border-2 hover:border-orange-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calculator className="w-5 h-5 text-orange-600" />
              </div>
              Índice CMED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Índice CMED para medicamentos (%)
              </Label>
              <Input
                type="number"
                value={(localIndices.cmed * 100).toFixed(2)}
                onChange={(e) => handleChange('cmed', Math.max(0, (+e.target.value || 0) / 100))}
                className="mt-2"
                placeholder="5.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Aplicado apenas sobre a participação de medicamentos
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-700 font-medium">Valor atual</div>
              <div className="text-lg font-bold text-orange-900">
                {pct(localIndices.cmed)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CRESCIMENTO */}
        <Card className="rounded-2xl border-2 hover:border-purple-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              Crescimento Planejado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Taxa de crescimento real (%)
              </Label>
              <Input
                type="number"
                value={(localIndices.crescimento * 100).toFixed(2)}
                onChange={(e) => handleChange('crescimento', (+e.target.value || 0) / 100)}
                className="mt-2"
                placeholder="10.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Crescimento real desejado para o negócio
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-700 font-medium">Valor atual</div>
              <div className="text-lg font-bold text-purple-900">
                {pct(localIndices.crescimento)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RESUMO */}
      <Card className="rounded-2xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
              <Calculator className="w-6 h-6 text-gray-600" />
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Taxa Composta do Ano
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Resultado da combinação de todos os índices
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {pct(taxaComposta)}
              </div>
              <div className="text-sm text-gray-600">
                Inflação + (CMED × Part. Medicamentos) + Crescimento
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600">Inflação</div>
                <div className="font-semibold">{pct(localIndices.inflacao)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600">CMED × Part.</div>
                <div className="font-semibold">
                  {pct(localIndices.cmed * localIndices.partMedicamentos)}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-gray-600">Crescimento</div>
                <div className="font-semibold">{pct(localIndices.crescimento)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


