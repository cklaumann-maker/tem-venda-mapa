
"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import MetasWizard from "./MetasWizard";
import MetasStep1 from "./MetasStep1";
import MetasStep2 from "./MetasStep2";
import { useStore } from "@/contexts/StoreContext";
import { BarChart3, Target, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle, CalendarDays, CheckCircle, ClipboardList } from "lucide-react";

// ==================== Types & Helpers ====================
type LinhaHist = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const TRIMESTRES = [
  { label: "1º Trim.", meses: [1, 2, 3] },
  { label: "2º Trim.", meses: [4, 5, 6] },
  { label: "3º Trim.", meses: [7, 8, 9] },
  { label: "4º Trim.", meses: [10, 11, 12] },
] as const;
const br = (n:number)=> 'R$ ' + (n||0).toLocaleString('pt-BR');
const pct = (n:number)=> ((n||0)*100).toFixed(1) + '%';
const clamp01 = (n:number)=> Math.max(0, Math.min(1, n));

function Guard({ ok, msg, children }:{ ok:boolean; msg:string; children:React.ReactNode }) {
  if (ok) return <>{children}</>;
  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50">
      <CardContent className="p-6 text-center text-amber-800 text-sm">
        {msg}
      </CardContent>
    </Card>
  );
}

function buildWeeks(ano:number, mes1to12:number) {
  const weeks:{start:Date; end:Date; days:number; label:string}[] = [];
  const first = new Date(ano, mes1to12-1, 1);
  const last = new Date(ano, mes1to12, 0);
  const firstDow = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - firstDow);
  let cur = new Date(start);
  while (cur <= last) {
    const wStart = new Date(cur);
    const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate()+6);
    const s = new Date(Math.max(wStart.getTime(), first.getTime()));
    const e = new Date(Math.min(wEnd.getTime(), last.getTime()));
    const days = Math.round((e.getTime()-s.getTime())/86400000)+1;
    weeks.push({ 
      start:s, 
      end:e, 
      days, 
      label: `${String(s.getDate()).padStart(2,'0')}/${String(mes1to12).padStart(2,'0')}–${String(e.getDate()).padStart(2,'0')}/${String(mes1to12).padStart(2,'0')}` 
    });
    cur.setDate(cur.getDate()+7);
  }
  return weeks;
}

function splitMonthIntoWeeks(totalMes:number, weeks:{days:number}[]) {
  const totalDays = weeks.reduce((s,w)=>s+w.days,0) || 1;
  const raw = weeks.map(w=> Math.round(totalMes * (w.days/totalDays)));
  const soma = raw.reduce((a,b)=>a+b,0);
  let diff = totalMes - soma, i=0;
  while (diff!==0 && i<raw.length) { raw[i] += (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
  return raw;
}

// ==================== Component ====================
export default function MetasView() {
  const { currentStore } = useStore();

  // ---- Dados base
  const [historico, setHistorico] = useState<LinhaHist[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);

  // ---- Índices (cenário editável)
  const [partMedicamentos, setPartMedicamentos] = useState(0.55);
  const [inflacao, setInflacao] = useState(0.045);
  const [cmed, setCmed] = useState(0.05);
  const [crescimento, setCrescimento] = useState(0.10);
  const taxaComposta = useMemo(()=> inflacao + (cmed * partMedicamentos) + crescimento, [inflacao,cmed,partMedicamentos,crescimento]);

  // ---- Pesos
  const [nivelPeso, setNivelPeso] = useState<'loja'|'cidade'|'estado'>('loja');
  const [basePeso, setBasePeso] = useState<'historico'|'igualitario'|'personalizado'>('historico');
  const [pesos, setPesos] = useState<Record<string, number>>({});
  const [pesosInput, setPesosInput] = useState<Record<string, string>>({});

  // ---- Dias e detalhes mensais
  const [diasMes, setDiasMes] = useState<Record<number, number>>({});
  const [expandedMeses, setExpandedMeses] = useState<Record<number, boolean>>({});
  const toggleMesDetalhe = (m:number)=> setExpandedMeses(prev=>({ ...prev, [m]: !prev[m] }));

  // ---- Simulação
  const [metaMensalA, setMetaMensalA] = useState<Record<number, number> | null>(null);
  const [metaMensalB, setMetaMensalB] = useState<Record<number, number> | null>(null);
  const [cenarioEscolhido, setCenarioEscolhido] = useState<'A'|'B'|null>(null);
  const [cenarioConfirmado, setCenarioConfirmado] = useState<'A'|'B'|null>(null);
  const [cenarioJustificativa, setCenarioJustificativa] = useState("");

  // ---- Visualização final
  const [nivelVisual, setNivelVisual] = useState<'loja'|'cidade'|'estado'>('loja');

  const diasCompletos = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => diasMes[i + 1] ?? null).every((v) => v && v > 0);
  }, [diasMes]);

  // ---- Step atual
  const [step, setStep] = useState(1);
  const handleStepChange = useCallback((targetStep: number) => {
    if (targetStep > step && step === 4 && !diasCompletos) {
      alert("Preencha os dias úteis de todos os meses na seção 'Metas Diárias' antes de avançar.");
      return;
    }
    setStep(targetStep);
  }, [step, diasCompletos]);

  useEffect(() => {
    setHistorico([]);
    setLojas([]);
    setPesos({});
    setPesosInput({});
    setDiasMes({});
    setExpandedMeses({});
    setMetaMensalA(null);
    setMetaMensalB(null);
    setCenarioEscolhido(null);
    setCenarioConfirmado(null);
    setStep(1);
  }, [currentStore?.id]);

  // ---- Cálculos principais
  const anosOrdenados = useMemo(()=> [...new Set(historico.map(h=>h.ano))].sort((a,b)=>a-b), [historico]);
  const ultimoAno = anosOrdenados[anosOrdenados.length-1];
  const anoMeta = (ultimoAno||new Date().getFullYear()-1)+1;
  const totalUltimoAno = useMemo(()=> historico.filter(h=>h.ano===ultimoAno).reduce((s,h)=>s+h.venda_total,0), [historico, ultimoAno]);
  const metaAnual = useMemo(()=> Math.round((totalUltimoAno||0) * (1 + taxaComposta)), [totalUltimoAno, taxaComposta]);

  const partMensalUltAno = useMemo(()=>{
    const porMes: Record<number, number> = {};
    for (let m=1;m<=12;m++){
      porMes[m] = historico.filter(h=>h.ano===ultimoAno && h.mes===m).reduce((s,h)=>s+h.venda_total,0);
    }
    const total = Object.values(porMes).reduce((a,b)=>a+b,0) || 1;
    const pctByM: Record<number, number> = {};
    for (let m=1;m<=12;m++){ pctByM[m] = (porMes[m]||0)/total; }
    return pctByM;
  },[historico, ultimoAno]);

  const metaMensalAtual = useMemo(()=>{
    const map: Record<number, number> = {};
    for (let m=1;m<=12;m++) map[m] = Math.round((metaAnual||0) * (partMensalUltAno[m]||0));
    const soma = Object.values(map).reduce((a,b)=>a+b,0);
    let diff = (metaAnual||0) - soma;
    let i=1;
    while (diff!==0 && i<=12) { const k = ((i-1)%12)+1; map[k]+= (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
    return map;
  },[metaAnual, partMensalUltAno]);

  const chavesNivel = useMemo(()=>{
    if (!ultimoAno) return [];
    if (nivelPeso==='loja')   return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.loja))];
    if (nivelPeso==='cidade') return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.cidade||'').filter(Boolean))];
    return                        [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.estado||'').filter(Boolean))];
  },[historico, ultimoAno, nivelPeso]);

  const chavesNivelVisual = useMemo(()=>{
    if (!ultimoAno) return [];
    if (nivelVisual==='loja')   return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.loja))];
    if (nivelVisual==='cidade') return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.cidade||'').filter(Boolean))];
    return                          [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.estado||'').filter(Boolean))];
  },[historico, ultimoAno, nivelVisual]);

  const somaPesos = useMemo(()=>(Object.values(pesos).reduce((a,b)=>a+b,0)||0),[pesos]);

  const aberturaPorNivel: Record<number, { chave:string; valor:number }[]> = useMemo(()=>{
    const out: Record<number, { chave:string; valor:number }[]> = {};
    const divisor = somaPesos || 1;
    for (let m=1;m<=12;m++){
      const totalMes = metaMensalAtual[m]||0;
      const arr = chavesNivel.map(ch => ({ chave: ch, valor: Math.round(totalMes * ((pesos[ch]||0)/divisor)) }));
      const soma = arr.reduce((s,r)=>s+r.valor,0);
      let diff = totalMes - soma, i=0;
      while (diff!==0 && i<arr.length) { arr[i].valor += (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
      out[m]=arr;
    }
    return out;
  },[metaMensalAtual, chavesNivel, pesos, somaPesos]);

  const metaMensalFinal = useMemo(()=>{
    if (cenarioConfirmado==='A' && metaMensalA) return metaMensalA;
    if (cenarioConfirmado==='B' && metaMensalB) return metaMensalB;
    return metaMensalAtual;
  },[cenarioConfirmado, metaMensalA, metaMensalB, metaMensalAtual]);

  const metaMensalSeries = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const valor = metaMensalAtual[mes] || 0;
      const share = metaAnual ? valor / metaAnual : 0;
      return { mes, valor, share };
    });
  }, [metaMensalAtual, metaAnual]);

  const mesComMaiorMeta = useMemo(() => {
    return metaMensalSeries.reduce((acc, item) => (item.valor > acc.valor ? item : acc), { mes: 1, valor: 0, share: 0 });
  }, [metaMensalSeries]);

  const metaMensalMedia = useMemo(() => {
    if (!metaMensalSeries.length) return 0;
    const soma = metaMensalSeries.reduce((acc, item) => acc + item.valor, 0);
    return soma / metaMensalSeries.length;
  }, [metaMensalSeries]);

  const historicoMensalUltAno = useMemo(() => {
    const map: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      map[m] = Math.round((totalUltimoAno || 0) * (partMensalUltAno[m] || 0));
    }
    return map;
  }, [totalUltimoAno, partMensalUltAno]);

  const metaMensalMediaPercentual = useMemo(() => {
    return metaAnual ? (metaMensalMedia / metaAnual) * 100 : 0;
  }, [metaMensalMedia, metaAnual]);

  const temMetaDistribuida = useMemo(() => {
    return metaMensalSeries.some((item) => item.valor > 0);
  }, [metaMensalSeries]);

  const linhaPercentual = useMemo(() => {
    if (!metaMensalSeries.length) return null;
    const pontos = metaMensalSeries.map((item, idx) => {
      const sharePct = Math.max(item.share * 100, 0);
      const x = metaMensalSeries.length === 1 ? 50 : (idx / (metaMensalSeries.length - 1)) * 100;
      const y = 100 - Math.min(sharePct, 100);
      return { x, y, sharePct };
    });
    const path = pontos
      .map((ponto, idx) => `${idx === 0 ? "M" : "L"} ${ponto.x} ${ponto.y}`)
      .join(" ");
    return { pontos, path };
  }, [metaMensalSeries]);

  const topMeses = useMemo(() => {
    return [...metaMensalSeries]
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3);
  }, [metaMensalSeries]);

  const concentracaoTrimestre = useMemo(() => {
    const trimestreMap: Record<string, number[]> = {
      "1º Trimestre": [1, 2, 3],
      "2º Trimestre": [4, 5, 6],
      "3º Trimestre": [7, 8, 9],
      "4º Trimestre": [10, 11, 12],
    };
    const obj: Record<string, number> = {};
    Object.entries(trimestreMap).forEach(([label, mesesLista]) => {
      const valor = mesesLista.reduce((acc, mes) => acc + (metaMensalAtual[mes] || 0), 0);
      obj[label] = valor;
    });
    return obj;
  }, [metaMensalAtual]);

  const scenarioDiffMap = useMemo(() => {
    if (!metaMensalA || !metaMensalB) return null;
    const map: Record<number, { delta: number; deltaPct: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const a = metaMensalA[m] || 0;
      const b = metaMensalB[m] || 0;
      const delta = b - a;
      const base = a || b || 0;
      map[m] = {
        delta,
        deltaPct: base ? (delta / base) * 100 : 0,
      };
    }
    return map;
  }, [metaMensalA, metaMensalB]);

  const variacaoAnualHistorico = useMemo(() => {
    if (!totalUltimoAno) return 0;
    return ((metaAnual - totalUltimoAno) / totalUltimoAno) * 100;
  }, [metaAnual, totalUltimoAno]);

  const totalCenarioA = useMemo(() => {
    if (!metaMensalA) return null;
    return Object.values(metaMensalA).reduce((acc, val) => acc + (val || 0), 0);
  }, [metaMensalA]);

  const totalCenarioB = useMemo(() => {
    if (!metaMensalB) return null;
    return Object.values(metaMensalB).reduce((acc, val) => acc + (val || 0), 0);
  }, [metaMensalB]);

  const variacaoAnualA = useMemo(() => {
    if (!totalUltimoAno || totalCenarioA == null) return null;
    return ((totalCenarioA - totalUltimoAno) / totalUltimoAno) * 100;
  }, [totalUltimoAno, totalCenarioA]);

  const variacaoAnualB = useMemo(() => {
    if (!totalUltimoAno || totalCenarioB == null) return null;
    return ((totalCenarioB - totalUltimoAno) / totalUltimoAno) * 100;
  }, [totalUltimoAno, totalCenarioB]);

  const totalMetaFinalConfirmada = useMemo(() => {
    return Object.values(metaMensalFinal).reduce((acc, val) => acc + (val || 0), 0);
  }, [metaMensalFinal]);

  const variacaoAnualConfirmada = useMemo(() => {
    if (!totalUltimoAno) return null;
    return ((totalMetaFinalConfirmada - totalUltimoAno) / totalUltimoAno) * 100;
  }, [totalUltimoAno, totalMetaFinalConfirmada]);

  const diffAB = useMemo(() => {
    if (totalCenarioA == null || totalCenarioB == null) return null;
    return totalCenarioB - totalCenarioA;
  }, [totalCenarioA, totalCenarioB]);

  const diffABPct = useMemo(() => {
    if (diffAB == null || totalCenarioA == null || totalCenarioA === 0) return null;
    return (diffAB / totalCenarioA) * 100;
  }, [diffAB, totalCenarioA]);

  const calcularMediaDiaria = (meta: Record<number, number> | null) => {
    if (!meta) return null;
    let dias = 0;
    let totalMeta = 0;
    for (let m = 1; m <= 12; m++) {
      const diasConsiderados = diasMes[m] ?? new Date(anoMeta, m, 0).getDate();
      dias += diasConsiderados;
      totalMeta += meta[m] || 0;
    }
    return dias ? Math.round(totalMeta / dias) : null;
  };

  const mediaDiariaA = useMemo(() => calcularMediaDiaria(metaMensalA), [metaMensalA, diasMes, anoMeta]);
  const mediaDiariaB = useMemo(() => calcularMediaDiaria(metaMensalB), [metaMensalB, diasMes, anoMeta]);

  const resumoTrimestres = useMemo(() => {
    return TRIMESTRES.map(({ label, meses }) => {
      const valorA = metaMensalA
        ? meses.reduce((acc, mes) => acc + (metaMensalA[mes] || 0), 0)
        : null;
      const valorB = metaMensalB
        ? meses.reduce((acc, mes) => acc + (metaMensalB[mes] || 0), 0)
        : null;
      const diff = valorA != null && valorB != null ? valorB - valorA : null;
      return { label, valorA, valorB, diff };
    });
  }, [metaMensalA, metaMensalB]);

  const checklistStatus = useMemo(
    () => [
      { label: "Histórico importado", ok: historico.length > 0 },
      { label: "Pesos configurados", ok: Object.keys(pesos).length > 0 },
      { label: "Dias úteis preenchidos", ok: diasCompletos },
      { label: "Cenário A salvo", ok: !!metaMensalA },
      { label: "Cenário B salvo", ok: !!metaMensalB },
    ],
    [historico.length, pesos, diasCompletos, metaMensalA, metaMensalB]
  );

  const aberturaVisual: Record<number, { chave:string; valor:number }[]> = useMemo(()=>{
    const out: Record<number, { chave:string; valor:number }[]> = {};
    const somaChave: Record<string, number> = {};
    chavesNivelVisual.forEach(k=> somaChave[k]=0);
    historico.filter(h=>h.ano===ultimoAno).forEach(h=>{
      const ch = nivelVisual==='loja' ? h.loja : nivelVisual==='cidade' ? (h.cidade||'') : (h.estado||'');
      if (ch) somaChave[ch] = (somaChave[ch]||0) + h.venda_total;
    });
    const totalChaves = Object.values(somaChave).reduce((a,b)=>a+b,0)||1;
    for (let m=1;m<=12;m++){
      const totalMes = metaMensalFinal[m]||0;
      const arr = chavesNivelVisual.map(ch => ({ chave: ch, valor: Math.round(totalMes * ((somaChave[ch]||0)/totalChaves)) }));
      const soma = arr.reduce((s,r)=>s+r.valor,0);
      let diff = totalMes - soma, i=0;
      while (diff!==0 && i<arr.length) { arr[i].valor += (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
      out[m]=arr;
    }
    return out;
  },[metaMensalFinal, chavesNivelVisual, historico, ultimoAno, nivelVisual]);

  const metaVisualPorMes = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) {
      const linha = aberturaVisual[m] || [];
      map[m] = {};
      linha.forEach((item) => {
        map[m][item.chave] = item.valor || 0;
      });
    }
    return map;
  }, [aberturaVisual]);

  const historicoVisualPorMes = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) map[m] = {};
    if (!ultimoAno) return map;
    historico
      .filter((h) => h.ano === ultimoAno)
      .forEach((h) => {
        const chave =
          nivelVisual === "loja"
            ? h.loja
            : nivelVisual === "cidade"
            ? (h.cidade || "")
            : (h.estado || "");
        if (!chave) return;
        map[h.mes][chave] = (map[h.mes][chave] || 0) + (h.venda_total || 0);
      });
    return map;
  }, [historico, ultimoAno, nivelVisual]);

  const matrizTotais = useMemo(() => {
    const totalPorChave: Record<string, { meta: number; historico: number }> = {};
    chavesNivelVisual.forEach((ch) => {
      totalPorChave[ch] = { meta: 0, historico: 0 };
    });
    for (let m = 1; m <= 12; m++) {
      const linhaMeta = aberturaVisual[m] || [];
      linhaMeta.forEach((item) => {
        if (!totalPorChave[item.chave]) {
          totalPorChave[item.chave] = { meta: 0, historico: 0 };
        }
        totalPorChave[item.chave].meta += item.valor || 0;
      });
      const linhaHist = historicoVisualPorMes[m] || {};
      Object.entries(linhaHist).forEach(([ch, valor]) => {
        if (!totalPorChave[ch]) totalPorChave[ch] = { meta: 0, historico: 0 };
        totalPorChave[ch].historico += valor || 0;
      });
    }
    return totalPorChave;
  }, [aberturaVisual, historicoVisualPorMes, chavesNivelVisual]);

  const sugerirPesos = () => {
    const novo: Record<string, number> = {};
    if (!chavesNivel.length) {
      setPesos({});
      setPesosInput({});
      return;
    }
    if (basePeso === 'igualitario') {
      const v = 1/chavesNivel.length; chavesNivel.forEach(k=> novo[k]=v);
    } else if (basePeso === 'historico') {
      const soma: Record<string, number> = {}; chavesNivel.forEach(k=> soma[k]=0);
      historico.filter(h=>h.ano===ultimoAno).forEach(h=>{
        const k = nivelPeso==='loja' ? h.loja : nivelPeso==='cidade' ? (h.cidade||'') : (h.estado||'');
        if (k) soma[k] = (soma[k]||0) + h.venda_total;
      });
      const total = Object.values(soma).reduce((a,b)=>a+b,0)||1;
      chavesNivel.forEach(k=> novo[k] = (soma[k]||0)/total);
    } else {
      const v = 1/chavesNivel.length; chavesNivel.forEach(k=> novo[k]=v);
    }
    setPesos(novo);
    const formatado: Record<string, string> = {};
    chavesNivel.forEach(k=> { formatado[k] = ((novo[k]||0)*100).toFixed(2); });
    setPesosInput(formatado);
  };

  const sugerirDiasTotais = () => {
    const d: Record<number, number> = {};
    for (let m=1;m<=12;m++) d[m] = new Date(anoMeta, m, 0).getDate();
    setDiasMes(d);
  };

  const mediaDia = (m:number)=> {
    const d = diasMes[m]||0; if (!d) return 0;
    return Math.round((metaMensalAtual[m]||0)/d);
  };

  const salvarCenarioA = ()=> setMetaMensalA({ ...metaMensalAtual });
  const salvarCenarioB = ()=> setMetaMensalB({ ...metaMensalAtual });
  const confirmarCenario = ()=> {
    if (!cenarioEscolhido) { alert("Selecione o cenário A ou B."); return; }
    setCenarioConfirmado(cenarioEscolhido);
    alert(`Cenário ${cenarioEscolhido} confirmado. Revise antes de gravar.`);
  };

  // ==================== Supabase helpers ====================
  async function ensureLojas(lojasInput: {nome:string; cidade?:string; estado?:string}[]): Promise<Record<string,string>> {
    const supa = supabaseClient();
    const nomes = Array.from(new Set(lojasInput.map(l=>l.nome)));
    const { data: existentes, error: errSel } = await supa.from("lojas").select("*").in("nome", nomes);
    if (errSel) throw errSel;
    const map: Record<string,string> = {};
    (existentes||[]).forEach((r:any)=> map[r.nome]=r.id);
    const faltantes = lojasInput.filter(l=>!map[l.nome]);
    if (faltantes.length){
      const { data: inseridas, error: errIns } = await supa.from("lojas")
        .insert(faltantes.map(l=>({ nome:l.nome, cidade:l.cidade||null, estado:l.estado||null })))
        .select("*");
      if (errIns) throw errIns;
      (inseridas||[]).forEach((r:any)=> map[r.nome]=r.id);
    }
    return map;
  }

  async function upsertMetasMensais(rows: {ano:number; mes:number; loja_id:string; meta:number; locked?:boolean}[]) {
    const supa = supabaseClient();
    const { error } = await supa.from("metas_mensais").upsert(rows, { onConflict: "ano,mes,loja_id" });
    if (error) throw error;
  }

  const gravarSupabase = async () => {
    if (!historico.length || !ultimoAno) { alert("Importe o histórico antes."); return; }
    if (!cenarioConfirmado) { alert("Confirme o cenário no passo anterior."); return; }
    const metas = cenarioConfirmado==='A' ? metaMensalA : metaMensalB;
    if (!metas) { alert("Cenário selecionado sem distribuição mensal válida."); return; }

    const mapLojaChave: Record<string,string> = {};
    lojas.forEach(l=>{
      const ref = historico.find(h=>h.loja===l && h.ano===ultimoAno);
      mapLojaChave[l] = nivelPeso==='loja' ? l : (nivelPeso==='cidade' ? (ref?.cidade||'') : (ref?.estado||''));
    });

    const lojasPorChave: Record<string,string[]> = {};
    lojas.forEach(l=>{
      const ch = mapLojaChave[l]||'';
      if (!ch) return;
      lojasPorChave[ch] = lojasPorChave[ch]||[];
      lojasPorChave[ch].push(l);
    });

    const lojasInfo = lojas.map((nome)=> {
      const ref = historico.find(h=>h.loja===nome && h.ano===ultimoAno);
      return { nome, cidade: ref?.cidade, estado: ref?.estado };
    });
    const idPorLoja = await ensureLojas(lojasInfo);

    const somaChave: Record<string, number> = {};
    Object.keys(lojasPorChave).forEach(k=> somaChave[k]=0);
    historico.filter(h=>h.ano===ultimoAno).forEach(h=>{
      const ch = nivelPeso==='loja' ? h.loja : nivelPeso==='cidade' ? (h.cidade||'') : (h.estado||'');
      if (ch) somaChave[ch] = (somaChave[ch]||0) + h.venda_total;
    });
    const totalChaves = Object.values(somaChave).reduce((a,b)=>a+b,0)||1;

    const linhas: {ano:number; mes:number; loja_id:string; meta:number; locked?:boolean}[] = [];
    for (let m=1;m<=12;m++){
      const totalMes = metas[m]||0;
      const valorPorChave: Record<string, number> = {};
      Object.keys(lojasPorChave).forEach(ch=> {
        valorPorChave[ch] = Math.round(totalMes * ((somaChave[ch]||0)/totalChaves));
      });
      const soma = Object.values(valorPorChave).reduce((a,b)=>a+b,0);
      let diff = totalMes - soma; let i=0; const keys = Object.keys(valorPorChave);
      while (diff!==0 && i<keys.length) { valorPorChave[keys[i]] += (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }

      for (const ch of Object.keys(valorPorChave)){
        const lojasDaChave = lojasPorChave[ch]||[];
        if (!lojasDaChave.length) continue;
        const igual = Math.floor(valorPorChave[ch] / lojasDaChave.length);
        let resto = valorPorChave[ch] - (igual * lojasDaChave.length);
        lojasDaChave.forEach((lojaNome)=>{
          const loja_id = idPorLoja[lojaNome];
          if (!loja_id) return;
          const metaLojaMes = igual + (resto>0?1:0);
          if (resto>0) resto--;
          linhas.push({ ano: anoMeta, mes: m, loja_id, meta: metaLojaMes, locked: true });
        });
      }
    }

    await upsertMetasMensais(linhas);
    alert("Metas gravadas no Supabase com sucesso!");
  };

  // ==================== JSX ====================
  if (!currentStore) {
    return (
      <Card className="rounded-2xl border-dashed border-2 border-amber-200 bg-amber-50/40">
        <CardContent className="p-8 text-center space-y-2">
          <div className="text-lg font-semibold text-amber-800">Selecione uma loja para configurar as metas.</div>
          <div className="text-sm text-amber-700">
            Utilize o seletor de lojas no topo da página. Apenas administradores ou gerentes podem alternar entre unidades.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <MetasWizard 
      currentStep={step} 
      onStepChange={handleStepChange} 
      totalSteps={6}
    >
      {/* STEP 1 - Importar Dados */}
      {step === 1 && (
        <MetasStep1 
          onDataLoaded={(data, lojas) => {
            setHistorico(data);
            setLojas(lojas);
            setPesos({});
            setPesosInput({});
            setMetaMensalA(null);
            setMetaMensalB(null);
            setCenarioEscolhido(null);
            setCenarioConfirmado(null);
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
            setCenarioConfirmado(null);
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
        <div className="space-y-6">
          <Guard 
            ok={!!ultimoAno && historico.length>0} 
            msg="Importe o histórico (Passo 1) antes de configurar os pesos."
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">Estratégia de Pesos</h3>
                  <p className="text-gray-600">Defina como a meta anual será distribuída entre unidades.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nível</Label>
                    <Select value={nivelPeso} onValueChange={(v:any)=>{ setNivelPeso(v); setPesos({}); setPesosInput({}); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loja">Loja</SelectItem>
                        <SelectItem value="cidade">Cidade</SelectItem>
                        <SelectItem value="estado">Estado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Base sugerida</Label>
                    <Select value={basePeso} onValueChange={(v:any)=>setBasePeso(v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione a base" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="historico">Histórico</SelectItem>
                        <SelectItem value="igualitario">Igualitário</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={sugerirPesos}>Sugerir pesos</Button>
                  </div>
                </div>

                {chavesNivel.length>0 && (
                  <div className="overflow-auto rounded-2xl border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">{nivelPeso.toUpperCase()}</th>
                          <th className="text-left px-4 py-3 font-medium">Peso (%)</th>
                          <th className="text-left px-4 py-3 font-medium">Impacto Jan (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chavesNivel.map((chave)=> {
                          const pesoPct = clamp01(pesos[chave]||0);
                          const impactoJan = somaPesos ? Math.round((metaMensalAtual[1]||0) * ((pesos[chave]||0)/somaPesos)) : 0;
                          const inputValor = pesosInput[chave] ?? ((pesoPct||0)*100).toFixed(2);
                          const handleChange = (valor: string) => {
                            setPesosInput(prev=>({ ...prev, [chave]: valor }));
                            const limpo = valor.replace(',', '.');
                            const numero = parseFloat(limpo);
                            if (!Number.isNaN(numero)) {
                              const normalizado = clamp01(numero / 100);
                              setPesos(prev=>({ ...prev, [chave]: normalizado }));
                            }
                          };
                          const handleBlur = () => {
                            const limpo = (pesosInput[chave] ?? "").replace(',', '.');
                            const numero = parseFloat(limpo);
                            const normalizado = Number.isNaN(numero) ? 0 : clamp01(numero / 100);
                            setPesos(prev=>({ ...prev, [chave]: normalizado }));
                            setPesosInput(prev=>({ ...prev, [chave]: ((normalizado||0)*100).toFixed(2) }));
                          };
                          return (
                            <tr key={chave} className="odd:bg-white even:bg-gray-50/60">
                              <td className="px-4 py-3">{chave}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={inputValor}
                                  onChange={(e)=>handleChange(e.target.value)}
                                  onBlur={handleBlur}
                                />
                              </td>
                              <td className="px-4 py-3">{br(impactoJan)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  Soma dos pesos: <strong>{(somaPesos*100).toFixed(2)}%</strong>
                </div>
              </CardContent>
            </Card>
          </Guard>
        </div>
      )}

      {/* STEP 4 - Distribuir Metas */}
      {step === 4 && (
        <div className="space-y-6">
      <Guard
        ok={!!ultimoAno && totalUltimoAno>0 && Object.keys(pesos).length>0}
        msg="Finalize os passos 1 a 3 para visualizar a distribuição mensal."
      >
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">Distribuição Mensal</h3>
              <p className="text-gray-600">Painel visual para comparar metas por mês e identificar destaques rapidamente.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Meta anual</div>
                  <div className="text-xl font-semibold text-gray-900">{br(metaAnual)}</div>
                  <div className="text-xs text-gray-500">Ano {anoMeta} • Índice composto {pct(taxaComposta)}</div>
                </div>
              </div>
              <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Variação vs. ano anterior</div>
                  <div className={`text-xl font-semibold ${variacaoAnualHistorico >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {variacaoAnualHistorico >= 0 ? "+" : ""}
                    {variacaoAnualHistorico.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Histórico {br(totalUltimoAno || 0)}</div>
                </div>
              </div>
              <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Meta média mensal</div>
                  <div className="text-xl font-semibold text-gray-900">{br(Math.round(metaMensalMedia))}</div>
                  <div className="text-xs text-gray-500">
                    {metaMensalMediaPercentual.toFixed(1)}% da meta anual • Média diária {br(Math.round(metaMensalMedia / 30 || 0))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Mês com maior meta</div>
                  <div className="text-xl font-semibold text-gray-900">{meses[(mesComMaiorMeta?.mes ?? 1) - 1]}</div>
                  <div className="text-xs text-gray-500">{br(mesComMaiorMeta?.valor || 0)} • {(mesComMaiorMeta?.share * 100 || 0).toFixed(1)}% do ano</div>
                </div>
              </div>
            </div>

            {topMeses.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Top meses
                      </h4>
                      <span className="text-xs text-gray-500">Ranking por valor</span>
                    </div>
                    <div className="space-y-3">
                      {topMeses.map((item, idx) => (
                        <div key={item.mes} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">{idx + 1}º</span>
                            <span className="font-medium text-gray-800">{meses[item.mes - 1]}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{br(item.valor)}</div>
                            <div className="text-xs text-gray-500">{(item.share * 100).toFixed(1)}% da meta</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Concentração trimestral
                      </h4>
                      <span className="text-xs text-gray-500">Meta por trimestre</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(concentracaoTrimestre).map(([label, valor]) => (
                        <div key={label} className="rounded-lg border p-3 bg-white flex flex-col gap-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
                          <div className="font-semibold text-gray-900">{br(valor)}</div>
                          <div className="text-xs text-gray-500">
                            {metaAnual ? ((valor / metaAnual) * 100).toFixed(1) : 0}% do total
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="rounded-2xl border p-4 bg-white">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Distribuição visual</h4>
                  <p className="text-sm text-gray-600">
                    Barras mostram valores em reais; linha tracejada indica o percentual da meta anual por mês.
                  </p>
                </div>
                {temMetaDistribuida ? (
                  <div className="text-sm text-green-700 font-medium">
                    Mês líder: {meses[(mesComMaiorMeta?.mes ?? 1) - 1]} ({br(mesComMaiorMeta?.valor || 0)})
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Carregue dados reais para habilitar o gráfico comparativo.
                  </div>
                )}
              </div>
              {temMetaDistribuida ? (
                <div className="relative">
                  <div className="absolute inset-0 pointer-events-none rounded-2xl border border-gray-100" />
                  <div className="flex items-end gap-3 h-72 relative px-2">
                    {/* Linha percentual removida para evitar sobreposição */}
                    {metaMensalSeries.map((item) => {
                      const valores = metaMensalSeries.map((s) => s.valor);
                      const min = Math.min(...valores);
                      const max = Math.max(...valores);
                      const normalizado = max === min ? 1 : (item.valor - min) / (max - min);
                      const alturaPx = Math.max(normalizado * 220, 18);
                      const valorBr = br(item.valor);
                      const destaque = item.valor === mesComMaiorMeta.valor;
                      return (
                        <div key={item.mes} className="flex-1 flex flex-col items-center gap-2">
                          <div className="text-xs font-semibold text-gray-900 text-center leading-tight min-h-[32px] flex items-end justify-center">
                            {valorBr}
                          </div>
                          <div className="relative flex-1 flex items-end w-full">
                            <div
                              className="w-full rounded-t-lg transition-all duration-300 shadow-lg"
                              style={{
                                height: `${alturaPx}px`,
                                background: destaque
                                  ? "linear-gradient(180deg, #16a34a 0%, #22c55e 70%, #15803d 100%)"
                                  : "linear-gradient(180deg, #22c55e 0%, #34d399 70%, #10b981 100%)",
                                border: destaque ? "1px solid #15803d" : "1px solid #16a34a",
                              }}
                            />
                          </div>
                          <div className="text-xs font-medium text-gray-700">{meses[item.mes - 1]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Importe o histórico e configure os índices/pesos para visualizar o gráfico de distribuição mensal.
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({length:12},(_,i)=>i+1).map(m=>{
                const serie = metaMensalSeries.find((item) => item.mes === m);
                const sharePct = (serie?.share || 0) * 100;
                return (
                  <div key={m} className="rounded-xl border p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{meses[m-1]}</div>
                      <span className="text-xs font-semibold text-green-700">{sharePct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">% último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Meta do mês</span>
                          <span className="font-semibold text-gray-900">{br(metaMensalAtual[m]||0)}</span>
                        </div>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400"
                            style={{ width: `${Math.min(Math.max(sharePct, 2), 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-2 space-y-1 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>Histórico {ultimoAno}</span>
                          <span className="font-semibold text-gray-800">{br(historicoMensalUltAno[m] || 0)}</span>
                        </div>
                        {(() => {
                          const valorMeta = metaMensalAtual[m] || 0;
                          const historicoMes = historicoMensalUltAno[m] || 0;
                          const diff = valorMeta - historicoMes;
                          const diffPct = historicoMes ? (diff / historicoMes) * 100 : (valorMeta ? 100 : 0);
                          const positivo = diff >= 0;
                          return (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">Variação</span>
                              <span className={`flex items-center gap-1 font-semibold ${positivo ? "text-emerald-600" : "text-red-600"}`}>
                                {positivo ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {positivo ? "+" : "-"}
                                {br(Math.abs(diff))}
                                <span className="text-xs">
                                  ({positivo ? "+" : "-"}{Math.abs(diffPct).toFixed(1)}%)
                                </span>
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        {(() => {
                          const valorMeta = metaMensalAtual[m] || 0;
                          const historicoMes = historicoMensalUltAno[m] || 0;
                          const diasNoMes = diasMes[m] ?? new Date(anoMeta, m, 0).getDate();
                          const metaDiaria = diasNoMes ? Math.round(valorMeta / diasNoMes) : 0;
                          const historicoDiario = diasNoMes ? Math.round(historicoMes / diasNoMes) : 0;
                          return (
                            <>
                              <div className="rounded-md bg-gray-50 p-2">
                                <div className="text-[10px] uppercase text-gray-500 tracking-wide">Meta diária</div>
                                <div className="font-semibold text-gray-900">{br(metaDiaria)}</div>
                                <div className="text-[10px] text-gray-500">{diasNoMes} dias considerados</div>
                              </div>
                              <div className="rounded-md bg-gray-50 p-2">
                                <div className="text-[10px] uppercase text-gray-500 tracking-wide">Histórico diário</div>
                                <div className="font-semibold text-gray-900">{br(historicoDiario)}</div>
                                <div className="text-[10px] text-gray-500">Referência {ultimoAno}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {scenarioDiffMap && (
                        <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                          {(() => {
                            const info = scenarioDiffMap[m];
                            if (!info) return null;
                            const positivo = info.delta >= 0;
                            return (
                              <div className="flex items-center justify-between">
                                <span>Cenário B - A</span>
                                <span className={`flex items-center gap-1 font-semibold ${positivo ? "text-emerald-600" : "text-red-600"}`}>
                                  {positivo ? "▲" : "▼"} {br(Math.abs(info.delta))}
                                  <span className="text-xs">
                                    ({positivo ? "+" : "-"}{Math.abs(info.deltaPct).toFixed(1)}%)
                                  </span>
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {(() => {
                        const valorMeta = metaMensalAtual[m] || 0;
                        const historicoMes = historicoMensalUltAno[m] || 0;
                        const diff = valorMeta - historicoMes;
                        const diffPct = historicoMes ? (diff / historicoMes) * 100 : (valorMeta ? 100 : 0);
                        if (Math.abs(diffPct) < 20) return null;
                        return (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <span>
                              Meta está {diffPct > 0 ? `${Math.abs(diffPct).toFixed(1)}% acima` : `${Math.abs(diffPct).toFixed(1)}% abaixo`} do histórico {ultimoAno}. Avalie ajustes de campanha ou pesos.
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <details className="w-full">
                        <summary className="text-xs underline cursor-pointer">Abertura</summary>
                        <div className="mt-2 space-y-1 max-h-40 overflow-auto pr-2">
                          {(aberturaPorNivel[m]||[]).map((r,idx)=>(
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span>{r.chave}</span><span>{br(r.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                      <Button variant="outline" size="sm" onClick={()=>toggleMesDetalhe(m)}>
                        {expandedMeses[m] ? "Fechar" : "Semanas"}
                      </Button>
                    </div>
                    {expandedMeses[m] && (
                      <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                        {(() => {
                          const weeks = buildWeeks(anoMeta, m);
                          const valores = splitMonthIntoWeeks(metaMensalAtual[m]||0, weeks);
                          return (
                            <div className="space-y-1 text-xs">
                              {weeks.map((w, idx)=> (
                                <div key={idx} className="flex items-center justify-between">
                                  <span>Sem {idx+1} ({w.label})</span>
                                  <span>{br(valores[idx]||0)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Guard>

          <Guard
            ok={Object.keys(pesos).length>0}
            msg="Configure os pesos (Passo 3) antes de ajustar metas diárias."
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">Metas Diárias</h3>
                    <p className="text-gray-600">Informe rapidamente os dias úteis por mês para ajustar a meta diária.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={sugerirDiasTotais}>Usar calendário oficial</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const promptValue = window.prompt("Atribuir o mesmo número de dias úteis a todos os meses:", "26");
                        if (promptValue) {
                          const parsed = parseInt(promptValue, 10);
                          if (!Number.isNaN(parsed)) {
                            const novo: Record<number, number> = {};
                            for (let m = 1; m <= 12; m++) novo[m] = parsed;
                            setDiasMes(novo);
                          }
                        }
                      }}
                    >
                      Preencher todos
                    </Button>
                  </div>
                </div>
                <div className="grid xl:grid-cols-2 gap-6">
                  {[0, 1].map((linha) => (
                    <table key={linha} className="w-full text-sm bg-white border rounded-2xl overflow-hidden">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 tracking-wide">
                        <tr>
                          <th className="px-3 py-2">Mês</th>
                          <th className="px-3 py-2 w-24">Dias úteis</th>
                          <th className="px-3 py-2 w-32">Meta diária</th>
                          <th className="px-3 py-2 w-32">Histórico diário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 6 }, (_, i) => linha * 6 + i + 1).map((m) => {
                          const dias = diasMes[m] ?? "";
                          const valorMeta = metaMensalAtual[m] || 0;
                          const historicoMes = historicoMensalUltAno[m] || 0;
                          const diasConsiderados = diasMes[m] ?? new Date(anoMeta, m, 0).getDate();
                          const metaDiaria = diasConsiderados ? Math.round(valorMeta / diasConsiderados) : 0;
                          const historicoDiario = diasConsiderados ? Math.round(historicoMes / diasConsiderados) : 0;
                          return (
                            <tr key={m} className="odd:bg-white even:bg-gray-50/60">
                              <td className="px-3 py-2 font-medium text-gray-800">{meses[m - 1]}</td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={dias}
                                  onChange={(e) =>
                                    setDiasMes((prev) => ({
                                      ...prev,
                                      [m]: parseInt(e.target.value || "0", 10),
                                    }))
                                  }
                                  className="h-9"
                                />
                              </td>
                              <td className="px-3 py-2 font-semibold text-gray-900">{diasMes[m] ? br(metaDiaria) : "-"}</td>
                              <td className="px-3 py-2 text-gray-600">{diasMes[m] ? br(historicoDiario) : "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ))}
                </div>
                {!diasCompletos && (
                  <div className="text-xs text-amber-600">
                    Preencha os dias úteis de todos os meses para habilitar os próximos passos.
                  </div>
                )}
              </CardContent>
            </Card>
          </Guard>
        </div>
      )}
      {/* STEP 5 - Simular Cenários */}
      {step === 5 && (
        <div className="space-y-6">
          <Guard
            ok={!!ultimoAno && totalUltimoAno>0 && Object.keys(pesos).length>0}
            msg="Conclua os passos anteriores para simular cenários."
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-gray-900">Simular Cenários</h3>
                  <p className="text-gray-600">Ajuste os índices, salve variações e compare rapidamente os impactos no plano anual.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Cenário A</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {totalCenarioA != null ? br(totalCenarioA) : "Salve o cenário A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {variacaoAnualA != null
                          ? `Vs ${ultimoAno}: ${variacaoAnualA >= 0 ? "+" : ""}${variacaoAnualA.toFixed(1)}%`
                          : "Aguardando histórico"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Cenário B</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {totalCenarioB != null ? br(totalCenarioB) : "Salve o cenário B"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {variacaoAnualB != null
                          ? `Vs ${ultimoAno}: ${variacaoAnualB >= 0 ? "+" : ""}${variacaoAnualB.toFixed(1)}%`
                          : "Aguardando histórico"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Diferença B − A</div>
                      <div className="text-xl font-semibold">
                        {diffAB != null ? (
                          <span className={diffAB >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {diffAB >= 0 ? "+" : "-"}{br(Math.abs(diffAB))}
                          </span>
                        ) : (
                          <span className="text-gray-400">Aguardando cenários</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {diffABPct != null
                          ? `${diffABPct >= 0 ? "+" : "-"}${Math.abs(diffABPct).toFixed(1)}%`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Média diária</div>
                      <div className="flex items-center justify-between">
                        <span>Cenário A</span>
                        <span className="font-semibold text-gray-900">
                          {mediaDiariaA != null ? br(mediaDiariaA) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cenário B</span>
                        <span className="font-semibold text-gray-900">
                          {mediaDiariaB != null ? br(mediaDiariaB) : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Valores calculados com base nos dias úteis informados.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Inflação (%)</Label>
                    <Input type="number" value={(inflacao*100).toFixed(2)} onChange={(e)=>{ setInflacao(Math.max(0,(+e.target.value||0)/100)); setCenarioConfirmado(null); }} />
                  </div>
                  <div>
                    <Label>CMED (%)</Label>
                    <Input type="number" value={(cmed*100).toFixed(2)} onChange={(e)=>{ setCmed(Math.max(0,(+e.target.value||0)/100)); setCenarioConfirmado(null); }} />
                  </div>
                  <div>
                    <Label>Part. Medicamentos (%)</Label>
                    <Input type="number" value={(partMedicamentos*100).toFixed(1)} onChange={(e)=>{ setPartMedicamentos(clamp01((+e.target.value||0)/100)); setCenarioConfirmado(null); }} />
                  </div>
                  <div>
                    <Label>Crescimento (%)</Label>
                    <Input type="number" value={(crescimento*100).toFixed(2)} onChange={(e)=>{ setCrescimento((+e.target.value||0)/100); setCenarioConfirmado(null); }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={salvarCenarioA}>Salvar Cenário A</Button>
                  <Button variant="outline" onClick={salvarCenarioB}>Salvar Cenário B</Button>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Usar:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="cenario" onChange={()=>setCenarioEscolhido('A')} checked={cenarioEscolhido==='A'} />
                      Cenário A
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="cenario" onChange={()=>setCenarioEscolhido('B')} checked={cenarioEscolhido==='B'} />
                      Cenário B
                    </label>
                  </div>
                  <Button onClick={confirmarCenario} className="bg-green-600 hover:bg-green-700 text-white">
                    Confirmar cenário
                  </Button>
                </div>

                {metaMensalA && metaMensalB && (
                  <div className="rounded-2xl border p-4 bg-white overflow-x-auto">
                    <div className="font-semibold text-gray-900 mb-3">Comparativo mensal Cenário B x A</div>
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 tracking-wide">
                        <tr>
                          <th className="px-3 py-2">Mês</th>
                          <th className="px-3 py-2">Cenário A</th>
                          <th className="px-3 py-2">Cenário B</th>
                          <th className="px-3 py-2">Diferença B − A</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const valorA = metaMensalA[m] || 0;
                          const valorB = metaMensalB[m] || 0;
                          const diffValor = valorB - valorA;
                          const diffPctLocal = valorA ? (diffValor / valorA) * 100 : valorB ? 100 : 0;
                          return (
                            <tr key={m} className="odd:bg-white even:bg-gray-50/60">
                              <td className="px-3 py-2 font-medium text-gray-800">{meses[m - 1]}</td>
                              <td className="px-3 py-2">{br(valorA)}</td>
                              <td className="px-3 py-2">{br(valorB)}</td>
                              <td className="px-3 py-2">
                                <span className={`font-semibold ${diffValor >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {diffValor >= 0 ? "+" : "-"}{br(Math.abs(diffValor))}
                                  <span className="ml-1 text-xs">
                                    ({diffPctLocal >= 0 ? "+" : "-"}{Math.abs(diffPctLocal).toFixed(1)}%)
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resumoTrimestres.map(({ label, valorA, valorB, diff }) => (
                    <div key={label} className="rounded-2xl border p-4 bg-white space-y-2 text-sm text-gray-600">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                      <div className="flex items-center justify-between">
                        <span>Cenário A</span>
                        <span className="font-semibold text-gray-900">{valorA != null ? br(valorA) : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cenário B</span>
                        <span className="font-semibold text-gray-900">{valorB != null ? br(valorB) : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Diferença B − A</span>
                        <span className={`font-semibold ${diff != null && diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {diff != null ? (diff >= 0 ? "+" : "-") + br(Math.abs(diff)) : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border p-4 bg-white space-y-2 text-sm text-gray-600">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">Média diária Cenários</div>
                    <div className="flex items-center justify-between">
                      <span>Cenário A</span>
                      <span className="font-semibold text-gray-900">{mediaDiariaA != null ? br(mediaDiariaA) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cenário B</span>
                      <span className="font-semibold text-gray-900">{mediaDiariaB != null ? br(mediaDiariaB) : "—"}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Cálculo considera os dias úteis informados na etapa “Metas Diárias”.
                    </div>
                  </div>
                  <div className="rounded-2xl border p-4 bg-white space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <ClipboardList className="w-4 h-4 text-green-600" />
                      Checklist de preparação
                    </div>
                    <div className="space-y-2">
                      {checklistStatus.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm">
                          {item.ok ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={item.ok ? "text-gray-700" : "text-gray-500"}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações do cenário (opcional)</Label>
                  <Textarea
                    placeholder="Registre justificativas, hipóteses de crescimento ou instruções antes de confirmar o cenário."
                    value={cenarioJustificativa}
                    onChange={(e) => setCenarioJustificativa(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Essas observações não são gravadas no banco, mas ajudam a manter o contexto durante a revisão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Guard>
        </div>
      )}

      {/* STEP 6 - Revisar & Salvar */}
      {step === 6 && (
        <div className="space-y-6">
          <Guard
            ok={!!ultimoAno && totalUltimoAno>0}
            msg="Conclua os passos anteriores para revisar e salvar."
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-gray-900">Revisão final e gravação</h3>
                  <p className="text-gray-600">
                    Confirme o cenário escolhido, revise metas por {nivelVisual === "loja" ? "loja" : nivelVisual === "cidade" ? "cidade" : "estado"} e grave os dados no Supabase.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Cenário confirmado</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {cenarioConfirmado ? `Cenário ${cenarioConfirmado}` : "Nenhum cenário selecionado"}
                      </div>
                      {cenarioJustificativa && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {cenarioJustificativa}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Meta confirmada</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {br(Object.values(metaMensalFinal).reduce((acc, val) => acc + (val || 0), 0))}
                      </div>
                      <div className="text-xs text-gray-500">Índice composto {pct(taxaComposta)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Variação vs. {ultimoAno}</div>
                      <div className="text-xl font-semibold">
                        {variacaoAnualConfirmada != null ? (
                          <span className={variacaoAnualConfirmada >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {variacaoAnualConfirmada >= 0 ? "+" : ""}
                            {variacaoAnualConfirmada.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">Aguardando histórico</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Histórico {br(totalUltimoAno || 0)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Itens revisados</div>
                      <div className="space-y-1">
                        {checklistStatus.map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            {item.ok ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span className={item.ok ? "text-gray-700" : "text-gray-400"}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Label>Visualizar por</Label>
                    <Select value={nivelVisual} onValueChange={(v:any)=>setNivelVisual(v)}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loja">Loja</SelectItem>
                        <SelectItem value="cidade">Cidade</SelectItem>
                        <SelectItem value="estado">Estado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-gray-500">
                    Total de {nivelVisual === "loja" ? "lojas" : nivelVisual === "cidade" ? "cidades" : "estados"}:{" "}
                    <strong>{chavesNivelVisual.length}</strong>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 bg-white overflow-x-auto">
                  <div className="font-semibold text-gray-900 mb-3">
                    Matriz de metas por {nivelVisual === "loja" ? "loja" : nivelVisual === "cidade" ? "cidade" : "estado"}
                  </div>
                  <table className="w-full min-w-[880px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 tracking-wide">
                      <tr>
                        <th className="px-3 py-2">Mês</th>
                        {chavesNivelVisual.map((chave) => (
                          <th key={chave} className="px-3 py-2 text-center">{chave || "(não informado)"}</th>
                        ))}
                        <th className="px-3 py-2 text-center">Total do mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const linhaMeta = metaVisualPorMes[m] || {};
                        const linhaHist = historicoVisualPorMes[m] || {};
                        const totalMetaMes = Object.values(linhaMeta).reduce((acc, val) => acc + (val || 0), 0);
                        const totalHistMes = Object.values(linhaHist).reduce((acc, val) => acc + (val || 0), 0);
                        const diffMes = totalMetaMes - totalHistMes;
                        const diffPctMes = totalHistMes ? (diffMes / totalHistMes) * 100 : totalMetaMes ? 100 : 0;
                        return (
                          <tr key={m} className="odd:bg-white even:bg-gray-50/60 align-top">
                            <td className="px-3 py-2 font-medium text-gray-800">{meses[m - 1]}</td>
                            {chavesNivelVisual.map((chave) => {
                              const metaValor = linhaMeta[chave] || 0;
                              const histValor = linhaHist[chave] || 0;
                              const diffValor = metaValor - histValor;
                              const diffPct =
                                histValor ? (diffValor / histValor) * 100 : metaValor ? 100 : 0;
                              return (
                                <td key={chave} className="px-3 py-2 text-right">
                                  <div className="font-semibold text-gray-900">{br(metaValor)}</div>
                                  <div className={`text-xs ${diffValor >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {histValor
                                      ? `${diffValor >= 0 ? "+" : "-"}${Math.abs(diffPct).toFixed(1)}%`
                                      : "—"}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right">
                              <div className="font-semibold text-gray-900">{br(totalMetaMes)}</div>
                              <div className={`text-xs ${diffMes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {totalHistMes
                                  ? `${diffMes >= 0 ? "+" : "-"}${Math.abs(diffPctMes).toFixed(1)}%`
                                  : "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="text-sm font-semibold text-gray-900">
                        <td className="px-3 py-2">Total</td>
                        {chavesNivelVisual.map((chave) => {
                          const totalMeta = matrizTotais[chave]?.meta || 0;
                          const totalHist = matrizTotais[chave]?.historico || 0;
                          const diffTotal = totalMeta - totalHist;
                          const diffPctTotal = totalHist ? (diffTotal / totalHist) * 100 : totalMeta ? 100 : 0;
                          return (
                            <td key={chave} className="px-3 py-2 text-right">
                              <div>{br(totalMeta)}</div>
                              <div className={`text-xs ${diffTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {totalHist
                                  ? `${diffTotal >= 0 ? "+" : "-"}${Math.abs(diffPctTotal).toFixed(1)}%`
                                  : "—"}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right">
                          <div>{br(Object.values(metaMensalFinal).reduce((acc, val) => acc + (val || 0), 0))}</div>
                          <div className={`text-xs ${variacaoAnualConfirmada != null && variacaoAnualConfirmada >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {variacaoAnualConfirmada != null
                              ? `${variacaoAnualConfirmada >= 0 ? "+" : ""}${variacaoAnualConfirmada.toFixed(1)}%`
                              : "—"}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={gravarSupabase}
                    disabled={!cenarioConfirmado}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Gravar no Supabase
                  </Button>
                  {!cenarioConfirmado && (
                    <div className="text-sm text-gray-600 flex items-center">
                      Confirme um cenário no passo 5 antes de salvar.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Guard>
        </div>
      )}
    </MetasWizard>
  );
}

