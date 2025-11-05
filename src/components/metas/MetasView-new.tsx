"use client";
import React, { useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import MetasWizard from "./MetasWizard";
import MetasStep1 from "./MetasStep1";
import MetasStep2 from "./MetasStep2";

// ==================== Types & Helpers ====================
type LinhaHist = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
const br = (n:number)=> 'R$ ' + (n||0).toLocaleString('pt-BR');
const pct = (n:number)=> ((n||0)*100).toFixed(1) + '%';
const clamp01 = (n:number)=> Math.max(0, Math.min(1, n));

// ==================== Component ====================
export default function MetasView() {
  // ---- Dados base
  const [historico, setHistorico] = useState<LinhaHist[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);

  // ---- Índices (cenário editável)
  const [partMedicamentos, setPartMedicamentos] = useState(0.55);
  const [inflacao, setInflacao] = useState(0.045);
  const [cmed, setCmed] = useState(0.05);
  const [crescimento, setCrescimento] = useState(0.10);
  const taxaComposta = useMemo(()=> inflacao + (cmed * partMedicamentos) + crescimento, [inflacao,cmed,partMedicamentos,crescimento]);

  // ---- Step atual
  const [step, setStep] = useState(1);

  // ---- Cálculos principais
  const anosOrdenados = useMemo(()=> [...new Set(historico.map(h=>h.ano))].sort((a,b)=>a-b), [historico]);
  const ultimoAno = anosOrdenados[anosOrdenados.length-1];
  const anoMeta = (ultimoAno||new Date().getFullYear()-1)+1;
  const totalUltimoAno = useMemo(()=> historico.filter(h=>h.ano===ultimoAno).reduce((s,h)=>s+h.venda_total,0), [historico, ultimoAno]);
  const metaAnual = useMemo(()=> Math.round((totalUltimoAno||0) * (1 + taxaComposta)), [totalUltimoAno, taxaComposta]);

  // ==================== JSX ====================
  return (
    <MetasWizard 
      currentStep={step} 
      onStepChange={setStep} 
      totalSteps={6}
    >
      {/* STEP 1 - Importar Dados */}
      {step === 1 && (
        <MetasStep1 
          onDataLoaded={(data, lojas) => {
            setHistorico(data);
            setLojas(lojas);
          }}
          historico={historico}
          lojas={lojas}
        />
      )}

      {/* STEP 2 - Configurar Índices */}
      {step === 2 && (
        <MetasStep2 
          onIndicesChange={(indices) => {
            setPartMedicamentos(indices.partMedicamentos);
            setInflacao(indices.inflacao);
            setCmed(indices.cmed);
            setCrescimento(indices.crescimento);
          }}
          indices={{
            partMedicamentos,
            inflacao,
            cmed,
            crescimento
          }}
        />
      )}

      {/* STEP 3 - Definir Pesos */}
      {step === 3 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">Passo 3 - Definir Pesos</h3>
          <p className="text-gray-600">Em desenvolvimento...</p>
        </div>
      )}

      {/* STEP 4 - Distribuir Metas */}
      {step === 4 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">Passo 4 - Distribuir Metas</h3>
          <p className="text-gray-600">Em desenvolvimento...</p>
        </div>
      )}

      {/* STEP 5 - Simular Cenários */}
      {step === 5 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">Passo 5 - Simular Cenários</h3>
          <p className="text-gray-600">Em desenvolvimento...</p>
        </div>
      )}

      {/* STEP 6 - Revisar & Salvar */}
      {step === 6 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">Passo 6 - Revisar & Salvar</h3>
          <p className="text-gray-600">Em desenvolvimento...</p>
        </div>
      )}
    </MetasWizard>
  );
}


