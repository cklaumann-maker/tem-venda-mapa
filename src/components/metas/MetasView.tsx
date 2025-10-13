
"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";

// ==================== Types & Helpers ====================
type LinhaHist = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const br = (n:number)=> 'R$ ' + (n||0).toLocaleString('pt-BR');
const pct = (n:number)=> ((n||0)*100).toFixed(1) + '%';
const clamp01 = (n:number)=> Math.max(0, Math.min(1, n));

function Guard({ ok, msg, children }:{ ok:boolean; msg:string; children:React.ReactNode }) {
  if (ok) return <>{children}</>;
  return <div className="rounded-xl border p-3 bg-amber-50 text-amber-800 text-sm">{msg}</div>;
}

// Build weeks within a month: weeks are Sunday->Saturday, trimmed to the month edges.
// If the month starts on Friday, first week includes Fri-Sat-Sun.
function buildWeeks(ano:number, mes1to12:number) {
  const weeks:{start:Date; end:Date; days:number; label:string}[] = [];
  const first = new Date(ano, mes1to12-1, 1);
  const last = new Date(ano, mes1to12, 0);
  const firstDow = first.getDay(); // 0=Sun..6=Sat
  const start = new Date(first);
  start.setDate(first.getDate() - firstDow);
  let cur = new Date(start);
  while (cur <= last) {
    const wStart = new Date(cur);
    const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate()+6);
    const s = new Date(Math.max(wStart.getTime(), first.getTime()));
    const e = new Date(Math.min(wEnd.getTime(), last.getTime()));
    const days = Math.round((e.getTime()-s.getTime())/86400000)+1;
    weeks.push({ start:s, end:e, days, label: `${String(s.getDate()).padStart(2,'0')}/${String(mes1to12).padStart(2,'0')}–${String(e.getDate()).padStart(2,'0')}/${String(mes1to12).padStart(2,'0')}` });
    cur.setDate(cur.getDate()+7);
  }
  return weeks;
}

// Distribute a month total by weeks proportional to number of days in each week segment.
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
  // ---- Dados base
  const [historico, setHistorico] = useState<LinhaHist[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);

  // ---- Índices (cenário editável)
  const [partMedicamentos, setPartMedicamentos] = useState(0.55);
  const [inflacao, setInflacao] = useState(0.045);
  const [cmed, setCmed] = useState(0.05);
  const [crescimento, setCrescimento] = useState(0.10);
  const taxaComposta = useMemo(()=> inflacao + (cmed * partMedicamentos) + crescimento, [inflacao,cmed,partMedicamentos,crescimento]);

  // ---- Pesos e nível
  const [nivelPeso, setNivelPeso] = useState<'loja'|'cidade'|'estado'>('loja');
  const [basePeso, setBasePeso] = useState<'historico'|'igualitario'|'personalizado'>('historico');
  const [pesos, setPesos] = useState<Record<string, number>>({}); // chave depende do nível

  // ---- Dias por mês (totais, não úteis)
  const [diasMes, setDiasMes] = useState<Record<number, number>>({}); // 1..12

  // ---- UI: expand weeks per month (passo 6 e 7)
  const [expandedWeeks6, setExpandedWeeks6] = useState<Record<number, boolean>>({}); // 1..12
  const toggleWeeks6 = (m:number)=> setExpandedWeeks6(p=>({ ...p, [m]: !p[m] }));
  const [expandedWeeks7, setExpandedWeeks7] = useState<Record<number, boolean>>({}); // 1..12
  const toggleWeeks7 = (m:number)=> setExpandedWeeks7(p=>({ ...p, [m]: !p[m] }));

  // ---- Simulação: cenários A/B
  const [metaMensalA, setMetaMensalA] = useState<Record<number, number> | null>(null);
  const [metaMensalB, setMetaMensalB] = useState<Record<number, number> | null>(null);
  const [cenarioEscolhido, setCenarioEscolhido] = useState<'A'|'B'|null>(null);
  const [cenarioConfirmado, setCenarioConfirmado] = useState<'A'|'B'|null>(null);

  // ---- Visualização (Passo 9)
  const [nivelVisual, setNivelVisual] = useState<'loja'|'cidade'|'estado'>('loja');

  // ---- Cálculos principais
  const anosOrdenados = useMemo(()=> [...new Set(historico.map(h=>h.ano))].sort((a,b)=>a-b), [historico]);
  const ultimoAno = anosOrdenados[anosOrdenados.length-1];
  const anoMeta = (ultimoAno||new Date().getFullYear()-1)+1;
  const totalUltimoAno = useMemo(()=> historico.filter(h=>h.ano===ultimoAno).reduce((s,h)=>s+h.venda_total,0), [historico, ultimoAno]);
  const metaAnual = useMemo(()=> Math.round((totalUltimoAno||0) * (1 + taxaComposta)), [totalUltimoAno, taxaComposta]);

  // participação mensal no último ano
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

  // distribuição mensal (preview) baseada na meta anual do cenário atual
  const metaMensalAtual = useMemo(()=>{
    const map: Record<number, number> = {};
    for (let m=1;m<=12;m++) map[m] = Math.round((metaAnual||0) * (partMensalUltAno[m]||0));
    const soma = Object.values(map).reduce((a,b)=>a+b,0);
    let diff = (metaAnual||0) - soma;
    let i=1;
    while (diff!==0 && i<=12) { const k = ((i-1)%12)+1; map[k]+= (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
    return map;
  },[metaAnual, partMensalUltAno]);

  // chaves do nível selecionado (para pesos e visualização)
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

  // sugerir pesos
  function sugerirPesos() {
    const novo: Record<string, number> = {};
    if (!chavesNivel.length) return setPesos({});
    if (basePeso === 'igualitario') {
      const v = 1/chavesNivel.length; chavesNivel.forEach(k=> novo[k]=v);
    } else if (basePeso === 'historico') {
      const soma: Record<string, number> = {}; chavesNivel.forEach(k=> soma[k]=0);
      historico.filter(h=>h.ano===ultimoAno).forEach(h=>{
        const k = nivelPeso==='loja' ? h.loja : nivelPeso==='cidade' ? (h.cidade||'') : (h.estado||'');
        if (k) soma[k] += h.venda_total;
      });
      const total = Object.values(soma).reduce((a,b)=>a+b,0)||1;
      chavesNivel.forEach(k=> novo[k] = (soma[k]||0)/total);
    } else {
      const v = 1/chavesNivel.length; chavesNivel.forEach(k=> novo[k]=v);
    }
    setPesos(novo);
  }

  // abertura por nível (valor por chave em cada mês) — usa nívelPeso
  const aberturaPorNivel: Record<number, { chave:string; valor:number }[]> = useMemo(()=>{
    const out: Record<number, { chave:string; valor:number }[]> = {};
    const somaPesos = Object.values(pesos).reduce((a,b)=>a+b,0)||1;
    for (let m=1;m<=12;m++){
      const totalMes = metaMensalAtual[m]||0;
      const arr = chavesNivel.map(ch => ({ chave: ch, valor: Math.round(totalMes * ((pesos[ch]||0)/somaPesos)) }));
      const soma = arr.reduce((s,r)=>s+r.valor,0);
      let diff = totalMes - soma, i=0;
      while (diff!==0 && i<arr.length) { arr[i].valor += (diff>0?1:-1); diff += (diff>0?-1:+1); i++; }
      out[m]=arr;
    }
    return out;
  },[metaMensalAtual, chavesNivel, pesos]);

  // abertura para visualização (Passo 9) — usa nivelVisual e o cenário confirmado (A/B)
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
      if (ch) somaChave[ch] += h.venda_total;
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

  // dias por mês sugeridos
  function sugerirDiasTotais(){
    const d: Record<number, number> = {};
    for (let m=1;m<=12;m++) d[m] = new Date(anoMeta, m, 0).getDate();
    setDiasMes(d);
  }

  // média diária por mês
  const mediaDia = (m:number)=> {
    const d = diasMes[m]||0; if (!d) return 0;
    return Math.round((metaMensalAtual[m]||0)/d);
  };

  // ======= Importação CSV =======
  function importarCSV(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.split(',').map(h=>h.trim().toLowerCase());
      if (!header) return;
      const idxAno = header.indexOf('ano');
      const idxMes = header.indexOf('mes');
      const idxLoja = header.indexOf('loja');
      const idxCidade = header.indexOf('cidade');
      const idxEstado = header.indexOf('estado');
      const idxVenda = header.indexOf('venda_total');
      const parsed: LinhaHist[] = [];
      for (const line of lines) {
        const cols = line.split(',');
        const row: LinhaHist = {
          ano: parseInt(cols[idxAno]||'0'),
          mes: parseInt(cols[idxMes]||'0'),
          loja: (cols[idxLoja]||'').trim(),
          cidade: idxCidade>=0 ? (cols[idxCidade]||'').trim() : undefined,
          estado: idxEstado>=0 ? (cols[idxEstado]||'').trim() : undefined,
          venda_total: parseFloat((cols[idxVenda]||'0').replace(/\./g,'').replace(',','.')),
        };
        if (row.ano && row.mes && row.loja) parsed.push(row);
      }
      setHistorico(parsed);
      setLojas([...new Set(parsed.map(r=>r.loja))]);
    };
    reader.readAsText(file);
  }

  function carregarMock(){
    const lojasEx = [
      { nome:'Loja Central', cidade:'São Paulo', estado:'SP' },
      { nome:'Filial 1', cidade:'Campinas', estado:'SP' },
      { nome:'Filial 2', cidade:'Santos', estado:'SP' },
    ];
    const mock: LinhaHist[] = [];
    for (let ano of [2024, 2025]){
      for (let m=1;m<=12;m++){
        lojasEx.forEach((l, i)=>{
          const base = 80000 + i*15000;
          const saz = [1,2].includes(m)?0.92: [11,12].includes(m)?1.12: 1.0;
          mock.push({ ano, mes:m, loja:l.nome, cidade:l.cidade, estado:l.estado, venda_total: Math.round(base*saz) });
        });
      }
    }
    setHistorico(mock);
    setLojas(lojasEx.map(l=>l.nome));
  }

  // ==================== Supabase: grava SOMENTE no Passo 9 ====================
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

  async function gravarSupabase() {
    if (!historico.length || !ultimoAno) { alert("Importe o histórico antes."); return; }
    if (!cenarioConfirmado) { alert("Confirme o cenário no Passo 8 antes de gravar."); return; }
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
  }

  function salvarCenarioA(){ setMetaMensalA({ ...metaMensalAtual }); }
  function salvarCenarioB(){ setMetaMensalB({ ...metaMensalAtual }); }
  function confirmarCenario(){ 
    if (!cenarioEscolhido) { alert("Selecione o cenário A ou B."); return; }
    setCenarioConfirmado(cenarioEscolhido);
    alert(`Cenário ${cenarioEscolhido} confirmado. Revise no Passo 9 e grave no banco.`);
  }

  // ==================== JSX ====================
  return (
    <div className="space-y-4">
      {/* BARRA FIXA TOP */}
      <div className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-screen-xl mx-auto px-3 py-2 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border p-2 bg-white/60">
            <div className="text-xs text-muted-foreground">Venda ano anterior ({ultimoAno||"-"})</div>
            <div className="font-semibold">{br(totalUltimoAno||0)}</div>
          </div>
          <div className="rounded-xl border p-2 bg-white/60">
            <div className="text-xs text-muted-foreground">Meta do ano ({anoMeta})</div>
            <div className="font-semibold">{br(metaAnual||0)}</div>
          </div>
          <div className="rounded-xl border p-2 bg-white/60">
            <div className="text-xs text-muted-foreground">Crescimento (taxa composta)</div>
            <div className="font-semibold">{pct(taxaComposta||0)}</div>
          </div>
        </div>
      </div>

      {/* PASSO 1 — Histórico */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">1) Importar histórico mensal — até 24 meses</h4>
          <div className="text-sm text-muted-foreground">
            CSV: <code>ano,mes,loja,cidade,estado,venda_total</code>
          </div>
          <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importarCSV(f); }} />
          <Button variant="outline" onClick={carregarMock}>Carregar exemplo</Button>
          <div className="text-sm">Lojas detectadas: <strong>{lojas.join(", ")||"-"}</strong></div>
        </CardContent>
      </Card>

      {/* PASSO 2 — Índices */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 grid md:grid-cols-3 gap-4">
          <div>
            <Label>Participação anual de Medicamentos (%)</Label>
            <Input
              type="number"
              value={(partMedicamentos*100).toFixed(1)}
              onChange={(e)=>setPartMedicamentos(clamp01((+e.target.value||0)/100))}
            />
          </div>
          <div>
            <Label>Inflação (%)</Label>
            <Input
              type="number"
              value={(inflacao*100).toFixed(2)}
              onChange={(e)=>setInflacao(Math.max(0, (+e.target.value||0)/100))}
            />
          </div>
          <div>
            <Label>Índice CMED (%) — aplicado apenas em Medicamentos</Label>
            <Input
              type="number"
              value={(cmed*100).toFixed(2)}
              onChange={(e)=>setCmed(Math.max(0, (+e.target.value||0)/100))}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Taxa de crescimento planejada (%)</Label>
            <Input
              type="number"
              value={(crescimento*100).toFixed(2)}
              onChange={(e)=>setCrescimento((+e.target.value||0)/100)}
            />
          </div>
          <div className="md:col-span-3 text-sm">
            <span>Taxa composta do ano: <strong>{pct(taxaComposta)}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* PASSO 3 — Resultado da meta anual e meses */}
      <Guard ok={!!ultimoAno && totalUltimoAno>0} msg="Importe o histórico (Passo 1) para ver a meta do ano e meses.">
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">3) Resultado — Meta do ano e distribuição por mês</h4>
            <div className="text-sm">Total último ano ({ultimoAno||"-"}): <strong>{br(totalUltimoAno)}</strong></div>
            <div className="text-lg font-semibold">Meta anual (cenário atual): {br(metaAnual)}</div>
            <div className="text-sm">Índice do ano: <strong>{pct(taxaComposta)}</strong></div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="font-medium">{meses[m-1]}</div>
                  <div className="text-xs text-muted-foreground">% no último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                  <div className="text-sm">Meta mês (simulada): <strong>{br(metaMensalAtual[m]||0)}</strong></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Guard>

      {/* PASSO 4 — Pesos */}
      <Guard ok={!!ultimoAno} msg="Importe o histórico antes para escolher o nível de pesos.">
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">4) Estratégia de Pesos</h4>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Nível</Label>
                <Select value={nivelPeso} onValueChange={(v:any)=>{ setNivelPeso(v); setPesos({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loja">Loja</SelectItem>
                    <SelectItem value="cidade">Cidade</SelectItem>
                    <SelectItem value="estado">Estado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Base</Label>
                <Select value={basePeso} onValueChange={(v:any)=>setBasePeso(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="overflow-auto rounded-2xl border mt-3">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">{nivelPeso.toUpperCase()}</th>
                      <th className="text-left px-4 py-3 font-medium">Peso (%)</th>
                      <th className="text-left px-4 py-3 font-medium">Impacto em Jan (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chavesNivel.map(k=>{
                      const p = clamp01(pesos[k]||0);
                      const impactoJan = Math.round((metaMensalAtual[1]||0) * (p / (Object.values(pesos).reduce((a,b)=>a+b,0)||1)));
                      return (
                        <tr key={k} className="odd:bg-white even:bg-gray-50/60">
                          <td className="px-4 py-3">{k}</td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={(p*100).toFixed(2)}
                              onChange={(e)=>{ const v = clamp01((+e.target.value||0)/100); setPesos(prev=>({ ...prev, [k]: v })); }}
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

            <div className="text-sm text-muted-foreground">
              Soma dos pesos: <strong>{((Object.values(pesos).reduce((a,b)=>a+b,0)||0)*100).toFixed(2)}%</strong>
            </div>
          </CardContent>
        </Card>
      </Guard>

      {/* PASSO 5 — Dias por mês */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">5) Dias no mês (ano inteiro)</h4>
          <Button variant="outline" onClick={sugerirDiasTotais}>Sugerir dias do ano</Button>
          <div className="grid md:grid-cols-3 gap-2 mt-3">
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{meses[m-1]}</div>
                <div className="text-xs text-muted-foreground">Dias</div>
                <Input
                  type="number"
                  value={diasMes[m]||''}
                  onChange={(e)=>setDiasMes(d=>({ ...d, [m]: parseInt(e.target.value||'0') }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PASSO 6 — Distribuição mensal com abertura + botão semanas */}
      <Guard
        ok={!!ultimoAno && totalUltimoAno>0 && Object.keys(pesos).length>0}
        msg="Defina o histórico (1), índices (2) e pesos (4) para ver a distribuição por mês com abertura."
      >
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">6) Distribuição mensal — “Abertura” (nível escolhido) e “Abrir semanas”</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {/* Quadro ano */}
              <div className="rounded-xl border p-3 bg-white">
                <div className="font-medium">Ano</div>
                <div className="text-sm">Meta anual: <strong>{br(metaAnual)}</strong></div>
                <div className="text-xs text-muted-foreground">Índice do ano: <strong>{pct(taxaComposta)}</strong></div>
              </div>
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="font-medium">{meses[m-1]}</div>
                  <div className="text-xs text-muted-foreground">% último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                  <div className="text-sm">Meta mês: <strong>{br(metaMensalAtual[m]||0)}</strong></div>
                  <div className="mt-2 flex gap-2">
                    <details className="w-full">
                      <summary className="text-xs underline cursor-pointer">Abertura</summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-auto pr-2">
                        {(aberturaPorNivel[m]||[]).map((r,i)=>(
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span>{r.chave}</span><span>{br(r.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                    <Button variant="outline" size="sm" onClick={()=>toggleWeeks6(m)}>Abrir semanas</Button>
                  </div>
                  {expandedWeeks6[m] && (
                    <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                      {(() => {
                        const weeks = buildWeeks(anoMeta, m);
                        const valores = splitMonthIntoWeeks(metaMensalAtual[m]||0, weeks);
                        return (
                          <div className="space-y-1">
                            {weeks.map((w, idx)=> (
                              <div key={idx} className="flex items-center justify-between text-xs">
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

      {/* PASSO 7 — Média diária + botão semanas (por mês) */}
      <Guard
        ok={Object.keys(diasMes).length>0}
        msg="Preencha os dias por mês (Passo 5) para ver as médias diárias."
      >
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">7) Distribuição diária (média) — e abertura semanal por mês</h4>
            <div className="grid md:grid-cols-3 gap-2">
              {/* Quadro Ano */}
              <div className="rounded-xl border p-3 bg-white">
                <div className="font-medium">Ano</div>
                <div className="text-sm">Meta anual: <strong>{br(metaAnual)}</strong></div>
                <div className="text-xs text-muted-foreground">Clique em “Abrir semanas” no mês</div>
              </div>
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="font-medium">{meses[m-1]}</div>
                  <div className="text-xs text-muted-foreground">Dias: {diasMes[m]||'-'}</div>
                  <div className="text-sm">Meta diária média: <strong>{diasMes[m]? br(mediaDia(m)) : '-'}</strong></div>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={()=>toggleWeeks7(m)}>Abrir semanas</Button>
                  </div>
                  {expandedWeeks7[m] && (
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

      {/* PASSO 8 — Simulação (salvar A/B, escolher e confirmar) */}
      <Guard ok={!!ultimoAno && totalUltimoAno>0 && Object.keys(pesos).length>0} msg="Finalize os passos anteriores para simular.">
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">8) Simular cenários e escolher qual usar</h4>
            <div className="grid md:grid-cols-4 gap-3">
              <div><Label>Inflação (%)</Label><Input type="number" value={(inflacao*100).toFixed(2)} onChange={(e)=>{ setInflacao(Math.max(0,(+e.target.value||0)/100)); }} /></div>
              <div><Label>CMED (%)</Label><Input type="number" value={(cmed*100).toFixed(2)} onChange={(e)=>{ setCmed(Math.max(0,(+e.target.value||0)/100)); }} /></div>
              <div><Label>Part. Medicamentos (%)</Label><Input type="number" value={(partMedicamentos*100).toFixed(1)} onChange={(e)=>{ setPartMedicamentos(clamp01((+e.target.value||0)/100)); }} /></div>
              <div><Label>Crescimento (%)</Label><Input type="number" value={(crescimento*100).toFixed(2)} onChange={(e)=>{ setCrescimento((+e.target.value||0)/100); }} /></div>
            </div>
            <div className="text-sm">Meta anual (preview): <strong>{br(metaAnual)}</strong> • Índice do ano: <strong>{pct(taxaComposta)}</strong></div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={salvarCenarioA}>Salvar Cenário A</Button>
              <Button variant="outline" onClick={salvarCenarioB}>Salvar Cenário B</Button>
              <div className="flex items-center gap-2 ml-2 text-sm">
                <span>Usar:</span>
                <label className="flex items-center gap-1"><input type="radio" name="cenario" onChange={()=>setCenarioEscolhido('A')} checked={cenarioEscolhido==='A'} /> Cenário A</label>
                <label className="flex items-center gap-1"><input type="radio" name="cenario" onChange={()=>setCenarioEscolhido('B')} checked={cenarioEscolhido==='B'} /> Cenário B</label>
              </div>
              <Button onClick={confirmarCenario} style={{ background:"#5ee100", color:"#111" }}>Confirmar cenário</Button>
            </div>

            {(metaMensalA || metaMensalB) && (
              <div className="grid md:grid-cols-2 gap-3">
                {metaMensalA && (
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="font-medium mb-2">Cenário A — Distribuição mensal</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {Array.from({length:12},(_,i)=>i+1).map(m=>(
                        <div key={m} className="rounded-lg border p-2 bg-gray-50">
                          <div className="font-medium">{meses[m-1]}</div>
                          <div>{br(metaMensalA[m]||0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {metaMensalB && (
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="font-medium mb-2">Cenário B — Distribuição mensal</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {Array.from({length:12},(_,i)=>i+1).map(m=>(
                        <div key={m} className="rounded-lg border p-2 bg-gray-50">
                          <div className="font-medium">{meses[m-1]}</div>
                          <div>{br(metaMensalB[m]||0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {metaMensalA && metaMensalB && (
              <div className="mt-3 rounded-xl border p-3 bg-white">
                <div className="font-medium mb-2">Comparativo A × B</div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({length:12},(_,i)=>i+1).map(m=>{
                    const a = metaMensalA[m]||0;
                    const b = metaMensalB[m]||0;
                    const delta = b - a;
                    const deltaPct = a ? ((b/a)-1) : 0;
                    return (
                      <div key={m} className="rounded-lg border p-2 bg-gray-50 text-xs">
                        <div className="font-medium">{meses[m-1]}</div>
                        <div>A: {br(a)}</div>
                        <div>B: {br(b)}</div>
                        <div>Δ B-A: {br(delta)} ({(deltaPct*100).toFixed(1)}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Guard>

      {/* PASSO 9 — Revisão por nível + Gravar Supabase */}
      <Guard ok={!!ultimoAno && totalUltimoAno>0} msg="Confirme um cenário no Passo 8 para revisar e gravar.">
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">9) Revisão final e gravação</h4>
            <div className="text-sm">Cenário confirmado: <strong>{cenarioConfirmado||"(nenhum)"}</strong></div>

            <div className="flex items-center gap-2">
              <Label>Exibir por</Label>
              <Select value={nivelVisual} onValueChange={(v:any)=>setNivelVisual(v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cabeçalho ano */}
            <div className="rounded-xl border p-3 bg-white">
              <div className="text-sm">Meta anual: <strong>{br(Object.values(metaMensalFinal).reduce((a,b)=>a+b,0))}</strong> • Índice do ano: <strong>{pct(taxaComposta)}</strong></div>
            </div>

            {/* Drill: chave → meses */}
            <div className="mt-3 space-y-3">
              {chavesNivelVisual.map((chave)=> (
                <div key={chave} className="rounded-xl border p-3 bg-white">
                  <div className="font-semibold mb-2">{chave || "(não informado)"}</div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from({length:12},(_,i)=>i+1).map(m=>{
                      const arr = aberturaVisual[m]||[];
                      const item = arr.find(a=>a.chave===chave);
                      return (
                        <div key={m} className="rounded-lg border p-2 bg-gray-50">
                          <div className="text-sm font-medium">{meses[m-1]}</div>
                          <div className="text-xs text-muted-foreground">Meta</div>
                          <div className="text-sm font-semibold">{br(item?.valor||0)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={gravarSupabase} style={{ background:"#5ee100", color:"#111" }} disabled={!cenarioConfirmado}>Gravar no Supabase</Button>
            </div>
          </CardContent>
        </Card>
      </Guard>
    </div>
  );
}
