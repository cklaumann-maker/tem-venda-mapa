
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import MetasWizard from "./MetasWizard";
import MetasStep1 from "./MetasStep1";
import MetasStep2 from "./MetasStep2";
import { useStore } from "@/contexts/StoreContext";

// ==================== Types & Helpers ====================
type LinhaHist = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
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

  // ---- Visualização final
  const [nivelVisual, setNivelVisual] = useState<'loja'|'cidade'|'estado'>('loja');

  // ---- Step atual
  const [step, setStep] = useState(1);

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
      onStepChange={setStep} 
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
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">Distribuição Mensal</h3>
                  <p className="text-gray-600">Visualize a meta anual e abra detalhes por unidade e semana.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="font-medium">Ano Meta</div>
                    <div className="text-sm text-muted-foreground">{anoMeta}</div>
                    <div className="mt-2 text-lg font-semibold">{br(metaAnual)}</div>
                    <div className="text-xs text-gray-500">Índice composto: {pct(taxaComposta)}</div>
                  </div>
                  {Array.from({length:12},(_,i)=>i+1).map(m=>(
                    <div key={m} className="rounded-xl border p-3 bg-white">
                      <div className="font-medium">{meses[m-1]}</div>
                      <div className="text-xs text-gray-500">% último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                      <div className="mt-2 text-sm font-semibold">Meta do mês: {br(metaMensalAtual[m]||0)}</div>
                      <div className="mt-2 flex gap-2">
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
                          {expandedMeses[m] ? "Fechar semanas" : "Abrir semanas"}
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
                  ))}
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
                    <p className="text-gray-600">Informe os dias de cada mês para calcular a média diária.</p>
                  </div>
                  <Button variant="outline" onClick={sugerirDiasTotais}>Usar calendário oficial</Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({length:12},(_,i)=>i+1).map(m=>(
                    <div key={m} className="rounded-xl border p-3 bg-white">
                      <div className="font-medium">{meses[m-1]}</div>
                      <div className="text-xs text-gray-500">Dias úteis/abertos</div>
                      <Input
                        type="number"
                        value={diasMes[m] ?? ""}
                        onChange={(e)=>setDiasMes(prev=>({ ...prev, [m]: parseInt(e.target.value||'0') }))}
                        className="mt-2"
                      />
                      <div className="mt-2 text-xs text-gray-500">Meta diária média</div>
                      <div className="text-sm font-semibold">{diasMes[m] ? br(mediaDia(m)) : '-'}</div>
                    </div>
                  ))}
                </div>
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
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">Simular Cenários</h3>
                  <p className="text-gray-600">Ajuste os índices, salve os cenários e compare distribuições mensais.</p>
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

                <div className="text-sm text-gray-600">
                  Meta anual simulada: <strong>{br(metaAnual)}</strong> • Índice composto: <strong>{pct(taxaComposta)}</strong>
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

                {(metaMensalA || metaMensalB) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {metaMensalA && (
                      <Card className="rounded-2xl border">
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Cenário A</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {Array.from({length:12},(_,i)=>i+1).map(m=>(
                              <div key={m} className="rounded-lg border p-2 bg-gray-50">
                                <div className="font-medium">{meses[m-1]}</div>
                                <div>{br(metaMensalA[m]||0)}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {metaMensalB && (
                      <Card className="rounded-2xl border">
                        <CardContent className="p-4 space-y-2">
                          <div className="font-semibold">Cenário B</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {Array.from({length:12},(_,i)=>i+1).map(m=>(
                              <div key={m} className="rounded-lg border p-2 bg-gray-50">
                                <div className="font-medium">{meses[m-1]}</div>
                                <div>{br(metaMensalB[m]||0)}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {metaMensalA && metaMensalB && (
                  <Card className="rounded-2xl border bg-white">
                    <CardContent className="p-4 space-y-2">
                      <div className="font-semibold">Comparativo B x A</div>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {Array.from({length:12},(_,i)=>i+1).map(m=>{
                          const a = metaMensalA[m]||0;
                          const b = metaMensalB[m]||0;
                          const delta = b - a;
                          const deltaPct = a ? ((b/a)-1) : 0;
                          return (
                            <div key={m} className="rounded-lg border p-2 bg-gray-50">
                              <div className="font-medium">{meses[m-1]}</div>
                              <div>A: {br(a)}</div>
                              <div>B: {br(b)}</div>
                              <div>Δ: {br(delta)} ({(deltaPct*100).toFixed(1)}%)</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">Revisão Final</h3>
                    <p className="text-gray-600">Confira a distribuição escolhida antes de salvar no Supabase.</p>
                  </div>
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="text-xs text-gray-500">Cenário confirmado</div>
                    <div className="text-lg font-semibold">{cenarioConfirmado || "(nenhum)"}</div>
                  </div>
                </div>

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

                <div className="rounded-xl border p-3 bg-white">
                  <div className="text-sm">
                    Meta anual ({anoMeta}): <strong>{br(Object.values(metaMensalFinal).reduce((a,b)=>a+b,0))}</strong> • Índice composto: <strong>{pct(taxaComposta)}</strong>
                  </div>
                </div>

                <div className="space-y-3">
                  {chavesNivelVisual.map((chave)=>(
                    <div key={chave} className="rounded-xl border p-3 bg-white">
                      <div className="font-semibold mb-2">{chave || "(não informado)"}</div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Array.from({length:12},(_,i)=>i+1).map(m=>{
                          const arr = aberturaVisual[m]||[];
                          const item = arr.find(a=>a.chave===chave);
                          return (
                            <div key={m} className="rounded-lg border p-2 bg-gray-50">
                              <div className="text-sm font-medium">{meses[m-1]}</div>
                              <div className="text-xs text-gray-500">Meta</div>
                              <div className="text-sm font-semibold">{br(item?.valor||0)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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

