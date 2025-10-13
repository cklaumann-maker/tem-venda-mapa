"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import SectionTitle from "@/components/common/SectionTitle";
import { brand } from "@/lib/brand";
import { Target, FileSpreadsheet } from "lucide-react";

type LinhaHistorico = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
type LinhaVendaDia = { data:string; loja:string; cidade?:string; estado?:string; venda_total:number };

function daysInMonth(year:number, month:number){ return new Date(year, month, 0).getDate(); }
function getWeeksForMonth(year:number, month:number){
  const res: {idx:number; start:Date; end:Date; dias:number}[] = [];
  const firstDay = new Date(year, month-1, 1);
  let start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay()); // Domingo
  let idx = 1;
  while (true){
    const end = new Date(start); end.setDate(start.getDate()+6);
    const clipStart = new Date(Math.max(start.getTime(), new Date(year, month-1, 1).getTime()));
    const clipEnd = new Date(Math.min(end.getTime(), new Date(year, month-1, daysInMonth(year, month)).getTime()));
    const dias = Math.max(0, Math.round((clipEnd.getTime()-clipStart.getTime())/86400000)+1);
    if (dias>0) res.push({idx, start:clipStart, end:clipEnd, dias});
    if (end >= new Date(year, month-1, daysInMonth(year, month))) break;
    start = new Date(end); start.setDate(end.getDate()+1); idx++;
  }
  return res;
}
function fmtDate(d:Date){ return d.toISOString().slice(0,10); }
function formatBR(n:number){ return 'R$ ' + (n||0).toLocaleString('pt-BR'); }
function pct(n:number){ return ((n||0)*100).toFixed(1) + '%'; }

// === Índice Anual (inflacao + cmed*partMedicamentos + crescimento)
function indiceAnual(inflacao:number, cmed:number, partMed:number, cresc:number){
  return inflacao + (cmed * partMed) + cresc; // fração 0..1
}

// === Soma do mês do último ano (para comparação por mês)
function totalMesUltAnoFrom(historico:any[], ultimoAno:number, m:number){
  return (historico||[]).filter((r:any)=>r.ano===ultimoAno && r.mes===m).reduce((s:number,r:any)=>s+r.venda_total,0);
}

function pctNum(n:number){ return ((n||0)*100).toFixed(1); }

export default function MetasView(){
  const [step, setStep] = useState(1);

  const [historico, setHistorico] = useState<LinhaHistorico[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);

  const [partMedicamentos, setPartMedicamentos] = useState(0.55);
  const [inflacao, setInflacao] = useState(0.045);
  const [cmed, setCmed] = useState(0.05);
  const [crescimento, setCrescimento] = useState(0.10);

  const [simInflacaoPct, setSimInflacaoPct] = useState<number>(Math.round(0.045*10000)/100);
  const [simCmedPct, setSimCmedPct] = useState<number>(Math.round(0.05*10000)/100);
  const [simPartMedPct, setSimPartMedPct] = useState<number>(Math.round(0.55*10000)/100);
  const [simCrescimentoPct, setSimCrescimentoPct] = useState<number>(Math.round(0.10*10000)/100);

  const [nivelPeso, setNivelPeso] = useState<'loja'|'cidade'|'estado'>('loja');
  const [basePeso, setBasePeso] = useState<'historico'|'igualitario'|'personalizado'>('historico');
  const [pesosLoja, setPesosLoja] = useState<Record<string, number>>({});
  const [pesosCidade, setPesosCidade] = useState<Record<string, number>>({});
  const [pesosEstado, setPesosEstado] = useState<Record<string, number>>({});

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [diasMes, setDiasMes] = useState<Record<number, number>>({});

  const [metaAnual, setMetaAnual] = useState<number>(0);
  const [metaMensalDistribuida, setMetaMensalDistribuida] = useState<Record<number, number>>({});

  const [step6Visao, setStep6Visao] = useState<'loja'|'cidade'|'estado'>('loja');
  const [step6Expanded, setStep6Expanded] = useState<number|null>(null);
  const [step6YearOpen, setStep6YearOpen] = useState<boolean>(false);

  const [step7Expanded, setStep7Expanded] = useState<number|null>(null);
  const [step7YearOpen, setStep7YearOpen] = useState<boolean>(false);

  // Step 8
  const [visaoFinalScope, setVisaoFinalScope] = useState<'empresa'|'loja'|'cidade'|'estado'>('empresa');
  const [visaoFinalKey, setVisaoFinalKey] = useState<string>('');
  const [openWeeksKeys, setOpenWeeksKeys] = useState<Record<string, boolean>>({});
  const [step8YearOpen, setStep8YearOpen] = useState<boolean>(false);

  // Step 9 acompanhamento
  const [acomp, setAcomp] = useState<LinhaVendaDia[]>([]);
  const [step9Scope, setStep9Scope] = useState<'empresa'|'loja'|'cidade'|'estado'>('empresa');
  const [step9Key, setStep9Key] = useState<string>('');
  const [step9YearOpen, setStep9YearOpen] = useState<boolean>(false);

  const anosOrdenados = useMemo(()=>[...new Set(historico.map(r=>r.ano))].sort((a,b)=>a-b),[historico]);
  const ultimoAno = anosOrdenados[anosOrdenados.length-1];
  const anoMeta = ultimoAno ? ultimoAno+1 : new Date().getFullYear();

  const totalUltimoAno = useMemo(()=> historico.filter(r=>r.ano===ultimoAno).reduce((s,r)=>s+r.venda_total,0),[historico, ultimoAno]);

  const participacaoMensalUltAno = useMemo(()=>{
    const porMes: Record<number, number> = {};
    for (let m=1;m<=12;m++) porMes[m] = historico.filter(r=>r.ano===ultimoAno && r.mes===m).reduce((s,r)=>s+r.venda_total,0);
    const total = Object.values(porMes).reduce((a,b)=>a+b,0) || 1;
    const pct: Record<number, number> = {};
    for (let m=1;m<=12;m++) pct[m] = porMes[m]/total;
    return pct;
  },[historico, ultimoAno]);

  const cidadesUltAno = useMemo(()=>[...new Set(historico.filter(r=>r.ano===ultimoAno).map(r=>r.cidade||''))].filter(Boolean),[historico, ultimoAno]);
  const estadosUltAno = useMemo(()=>[...new Set(historico.filter(r=>r.ano===ultimoAno).map(r=>r.estado||''))].filter(Boolean),[historico, ultimoAno]);

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
      const parsed: LinhaHistorico[] = [];
      for (const line of lines) {
        const cols = line.split(',');
        const row: LinhaHistorico = {
          ano: parseInt(cols[idxAno]||'0'),
          mes: parseInt(cols[idxMes]||'0'),
          loja: (cols[idxLoja]||'').trim(),
          cidade: idxCidade>=0 ? (cols[idxCidade]||'').trim() : undefined,
          estado: idxEstado>=0 ? (cols[idxEstado]||'').trim() : undefined,
          venda_total: parseFloat((cols[idxVenda]||'0').replace('.','').replace(',','.')),
        };
        if (row.ano && row.mes && row.loja) parsed.push(row);
      }
      setHistorico(parsed);
      setLojas([...new Set(parsed.map(r=>r.loja))]);
      setStep(2);
    };
    reader.readAsText(file);
  }

  function carregarMock(){
    const mock:LinhaHistorico[]=[];
    const lojasEx = [
      { nome:'Loja Central', cidade:'São Paulo', estado:'SP' },
      { nome:'Filial 1', cidade:'Campinas', estado:'SP' },
      { nome:'Filial 2', cidade:'Santos', estado:'SP' },
    ];
    for (let ano of [2024, 2025]) {
      for (let mes=1; mes<=12; mes++) {
        lojasEx.forEach((l, idx)=>{
          const base = 80000 + idx*15000;
          const saz = [1,2].includes(mes) ? 0.9 : [11,12].includes(mes)? 1.15 : 1.0;
          mock.push({ ano, mes, loja:l.nome, cidade:l.cidade, estado:l.estado, venda_total: Math.round(base * saz) });
        });
      }
    }
    setHistorico(mock);
    setLojas([...new Set(mock.map(r=>r.loja))]);
    setStep(2);
  }

  function somaPesos(obj:Record<string,number>){ return Object.values(obj).reduce((a,b)=>a+b,0); }

  function calcularMetaAnualComIndices(params:{inflacao:number;cmed:number;part:number;crescimento:number}){
    const taxa = params.inflacao + (params.cmed * params.part) + params.crescimento;
    const meta = Math.round(totalUltimoAno * (1 + taxa));
    return meta;
  }

  function distribuirMensalComMeta(meta:number){
    const bruto: Record<number, number> = {};
    for (let m=1;m<=12;m++) bruto[m]= meta * (participacaoMensalUltAno[m]||0);
    const arred: Record<number, number> = {}; let soma=0;
    for (let m=1;m<=12;m++){ arred[m]=Math.round(bruto[m]); soma+=arred[m]; }
    const diff = meta - soma;
    if (diff!==0){
      const totalAbs = Object.values(arred).reduce((a,b)=>a+Math.abs(b),0)||1;
      const ajuste: Record<number, number> = {}; let somaAj=0;
      for (let m=1;m<=12;m++){ ajuste[m]=Math.round((Math.abs(arred[m])/totalAbs)*diff); somaAj+=ajuste[m]; }
      const resto = diff - somaAj;
      for (let m=1;m<=12;m++) arred[m]+=ajuste[m];
      for (let i=0;i<Math.abs(resto);i++){ const mi=((i)%12)+1; arred[mi]+= (diff>0?1:-1); }
    }
    return arred;
  }

  function historicoEmpresaAno(){ return historico.filter(r=>r.ano===ultimoAno).reduce((s,r)=>s+r.venda_total,0); }
  function historicoEmpresaMes(m:number){ return (historico||[]).filter((r:any)=>r.ano===ultimoAno && r.mes===m).reduce((s:number,r:any)=>s+r.venda_total,0); }
  function historicoLojaAno(l:string){ return historico.filter(r=>r.ano===ultimoAno && r.loja===l).reduce((s,r)=>s+r.venda_total,0); }
  function historicoCidadeAno(c:string){ return historico.filter(r=>r.ano===ultimoAno && (r.cidade||'')===c).reduce((s,r)=>s+r.venda_total,0); }
  function historicoEstadoAno(e:string){ return historico.filter(r=>r.ano===ultimoAno && (r.estado||'')===e).reduce((s,r)=>s+r.venda_total,0); }
  function historicoGrupoMes(chave:string, tipo:'loja'|'cidade'|'estado', m:number){
    if (tipo==='loja'){ return historico.filter(r=>r.ano===ultimoAno && r.mes===m && r.loja===chave).reduce((s,r)=>s+r.venda_total,0); }
    if (tipo==='cidade'){ return historico.filter(r=>r.ano===ultimoAno && r.mes===m && (r.cidade||'')===chave).reduce((s,r)=>s+r.venda_total,0); }
    return historico.filter(r=>r.ano===ultimoAno && r.mes===m && (r.estado||'')===chave).reduce((s,r)=>s+r.venda_total,0);
  }
  function variacaoPct(novo:number, antigo:number){ if (!antigo) return 0; return (novo/antigo - 1) * 100; }

  const crescimentoPct = useMemo(()=>{
    if (!totalUltimoAno) return 0;
    return ((metaAnual/(totalUltimoAno||1))-1)*100;
  },[metaAnual,totalUltimoAno]);

  const metaBaseline = useMemo(()=> calcularMetaAnualComIndices({ inflacao, cmed, part:partMedicamentos, crescimento }), [inflacao, cmed, partMedicamentos, crescimento, totalUltimoAno]);
  const mensalBaseline = useMemo(()=> distribuirMensalComMeta(metaBaseline), [metaBaseline, participacaoMensalUltAno]);

  const metaSim = useMemo(()=> calcularMetaAnualComIndices({
    inflacao: (simInflacaoPct||0)/100,
    cmed: (simCmedPct||0)/100,
    part: (simPartMedPct||0)/100,
    crescimento: (simCrescimentoPct||0)/100
  }), [simInflacaoPct, simCmedPct, simPartMedPct, simCrescimentoPct, totalUltimoAno]);

  const mensalSim = useMemo(()=> distribuirMensalComMeta(metaSim), [metaSim, participacaoMensalUltAno]);

  const totalDiasAno = useMemo(()=> Array.from({length:12},(_,i)=>i+1).reduce((s,m)=>s+(diasMes[m]||0),0),[diasMes]);

  function pesoLojaFinal(loja:string){
    if (nivelPeso==='loja'){ return pesosLoja[loja]||0; }
    if (nivelPeso==='cidade'){
      const reg = historico.find(r=>r.ano===ultimoAno && r.loja===loja);
      const cidade = reg?.cidade||'';
      const pesoCidade = (pesosCidade[cidade]||0);
      if (basePeso==='historico'){
        const somaCidade = historico.filter(r=>r.ano===ultimoAno && (r.cidade||'')===cidade).reduce((s,r)=>s+r.venda_total,0)||1;
        const daLoja = historico.filter(r=>r.ano===ultimoAno && r.loja===loja).reduce((s,r)=>s+r.venda_total,0);
        return pesoCidade * (daLoja/somaCidade);
      } else {
        const lojasCidade = [...new Set(historico.filter(r=>r.ano===ultimoAno && (r.cidade||'')===cidade).map(r=>r.loja))];
        return pesoCidade * (1/Math.max(1,lojasCidade.length));
      }
    }
    const reg = historico.find(r=>r.ano===ultimoAno && r.loja===loja);
    const estado = reg?.estado||'';
    const pesoEstado = (pesosEstado[estado]||0);
    if (basePeso==='historico'){
      const somaEstado = historico.filter(r=>r.ano===ultimoAno && (r.estado||'')===estado).reduce((s,r)=>s+r.venda_total,0)||1;
      const daLoja = historico.filter(r=>r.ano===ultimoAno && r.loja===loja).reduce((s,r)=>s+r.venda_total,0);
      return pesoEstado * (daLoja/somaEstado);
    } else {
      const lojasEstado = [...new Set(historico.filter(r=>r.ano===ultimoAno && (r.estado||'')===estado).map(r=>r.loja))];
      return pesoEstado * (1/Math.max(1,lojasEstado.length));
    }
  }

  function shareByCidade(){
    const map:Record<string,number> = {};
    lojas.forEach(l=>{
      const reg = historico.find(r=>r.ano===ultimoAno && r.loja===l);
      const c = reg?.cidade||''; if(!c) return;
      map[c] = (map[c]||0) + pesoLojaFinal(l);
    });
    return map;
  }
  function shareByEstado(){
    const map:Record<string,number> = {};
    lojas.forEach(l=>{
      const reg = historico.find(r=>r.ano===ultimoAno && r.loja===l);
      const e = reg?.estado||''; if(!e) return;
      map[e] = (map[e]||0) + pesoLojaFinal(l);
    });
    return map;
  }

  function toggleWeeksKey(key:string){ setOpenWeeksKeys(prev=> ({...prev, [key]: !prev[key]})); }

  // ---- Acompanhamento CSV ----
  function importarAcompanhamento(file: File){
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.split(',').map(h=>h.trim().toLowerCase());
      if (!header) return;
      const idxData = header.indexOf('data');
      const idxLoja = header.indexOf('loja');
      const idxCidade = header.indexOf('cidade');
      const idxEstado = header.indexOf('estado');
      const idxVenda = header.indexOf('venda_total');
      const out: LinhaVendaDia[] = [];
      for (const line of lines) {
        const cols = line.split(',');
        out.push({
          data: (cols[idxData]||'').trim(),
          loja: (cols[idxLoja]||'').trim(),
          cidade: idxCidade>=0 ? (cols[idxCidade]||'').trim() : undefined,
          estado: idxEstado>=0 ? (cols[idxEstado]||'').trim() : undefined,
          venda_total: parseFloat((cols[idxVenda]||'0').replace('.','').replace(',','.')),
        });
      }
      setAcomp(out);
    };
    reader.readAsText(file);
  }

  // Helpers de acompanhamento
  function anoDeStr(s:string){ return parseInt((s||'').slice(0,4)||'0'); }
  function mesDeStr(s:string){ return parseInt((s||'').slice(5,7)||'0'); }

  function realizadoEmpresaAno(){ return acomp.filter(a=>anoDeStr(a.data)===anoMeta).reduce((s,a)=>s+a.venda_total,0); }
  function realizadoEmpresaMes(m:number){ return acomp.filter(a=>anoDeStr(a.data)===anoMeta && mesDeStr(a.data)===m).reduce((s,a)=>s+a.venda_total,0); }

  function realizadoGrupoAno(scope:'loja'|'cidade'|'estado', key:string){
    return acomp.filter(a=>anoDeStr(a.data)===anoMeta && (
      scope==='loja' ? a.loja===key : scope==='cidade' ? (a.cidade||'')===key : (a.estado||'')===key
    )).reduce((s,a)=>s+a.venda_total,0);
  }
  function realizadoGrupoMes(scope:'loja'|'cidade'|'estado', key:string, m:number){
    return acomp.filter(a=>anoDeStr(a.data)===anoMeta && mesDeStr(a.data)===m && (
      scope==='loja' ? a.loja===key : scope==='cidade' ? (a.cidade||'')===key : (a.estado||'')===key
    )).reduce((s,a)=>s+a.venda_total,0);
  }

  // ---- Renders ----
  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="rounded-2xl border bg-white sticky top-[60px] z-[5]">
        <div className="px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="text-sm font-medium">Meta consolidada: <span className="font-semibold">Ano → Mês → Semana → Dia</span></div>
          <div className="text-sm">Ano meta: <strong>{ultimoAno ? ultimoAno+1 : new Date().getFullYear()}</strong></div>
          <div className="text-sm">Meta anual: <strong>{formatBR(metaAnual)}</strong></div>
          <div className="text-sm">Base {ultimoAno}: <strong>{formatBR(totalUltimoAno)}</strong></div>
        </div>
      </div>

      <SectionTitle icon={Target} title="Metas — Simulador Anual → Mensal → Semanal/Dia" subtitle="Importe histórico, simule cenários, defina pesos e consolide" />

      <div className="flex flex-wrap items-center gap-2">
        {[1,2,3,4,5,6,7,8,9].map(n=> (
          <Button key={n} variant={n===step? 'default':'outline'} onClick={()=>setStep(n)} style={n===step?{ background: brand.primary, color:'#111' }:undefined}>Passo {n===9?'Acompanhamento':n}</Button>
        ))}
      </div>

      {/* STEP 1 */}
      {step===1 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">1) Importar histórico (12–24 meses) — CSV: ano,mes,loja,cidade,estado,venda_total</h4>
          <div className="text-sm text-muted-foreground">Importe um CSV real ou <Button variant="outline" onClick={carregarMock} className="inline-flex ml-1">Carregar exemplo</Button></div>
          <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importarCSV(f); }} />
          {historico.length>0 && (<div className="text-sm">Registros: <strong>{historico.length}</strong> • Lojas: <strong>{lojas.join(', ')}</strong></div>)}
        </CardContent></Card>
      )}

      {/* STEP 2 */}
      {step===2 && (
        <Card className="rounded-2xl"><CardContent className="p-4 grid md:grid-cols-3 gap-4">
          <div><Label>Participação anual de Medicamentos (%)</Label><Input type="number" value={(partMedicamentos*100).toFixed(1)} onChange={(e)=>setPartMedicamentos(Math.max(0, Math.min(1, (+e.target.value||0)/100)))} /></div>
          <div><Label>Inflação (%)</Label><Input type="number" value={(inflacao*100).toFixed(2)} onChange={(e)=>setInflacao(Math.max(0, (+e.target.value||0)/100))} /></div>
          <div><Label>Índice CMED (%) — aplicado apenas em Medicamentos</Label><Input type="number" value={(cmed*100).toFixed(2)} onChange={(e)=>setCmed(Math.max(0, (+e.target.value||0)/100))} /></div>
          <div><Label>Crescimento (%)</Label><Input type="number" value={(crescimento*100).toFixed(2)} onChange={(e)=>setCrescimento((+e.target.value||0)/100)} /></div>
          <div className="md:col-span-3">
            <Button
              onClick={()=>{
                setSimInflacaoPct(Math.round(inflacao*10000)/100);
                setSimCmedPct(Math.round(cmed*10000)/100);
                setSimPartMedPct(Math.round(partMedicamentos*10000)/100);
                setSimCrescimentoPct(Math.round(crescimento*10000)/100);
                setStep(3);
              }}
              style={{ background: brand.primary, color:'#111' }}
            >Avançar para simulação</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 3 — simulação */}
      {step===3 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-4"><div className="rounded-xl border p-3 bg-white mt-3">
  <div className="font-medium mb-1">Índice do ano (confirmado)</div>
  <div className="text-sm text-muted-foreground">
    Total: <strong>{(indiceAnual(inflacao, cmed, partMedicamentos, crescimento)*100).toFixed(2)}%</strong> &nbsp;•&nbsp;
    Inflação: <strong>{(inflacao*100).toFixed(2)}%</strong> &nbsp;•&nbsp;
    CMED×Part.: <strong>{((cmed*partMedicamentos)*100).toFixed(2)}%</strong> &nbsp;•&nbsp;
    Cresc.: <strong>{(crescimento*100).toFixed(2)}%</strong>
  </div>
</div>

<div className="mt-3 rounded-2xl border p-3 bg-white">
  <div className="font-medium mb-2">Meses — índice aplicado e variação vs. {ultimoAno}</div>
  <div className="grid md:grid-cols-3 gap-3">
    {Array.from({length:12},(_,i)=>i+1).map(m=>{
      const part = participacaoMensalUltAno[m] || 0;
      const metaMes = metaMensalDistribuida[m] || 0;
      const baseMesAnt = totalMesUltAnoFrom(historico, ultimoAno, m) || 0;
      const varPct = baseMesAnt ? ((metaMes/baseMesAnt)-1)*100 : 0;

      return (
        <div key={m} className="rounded-xl border p-3 bg-white">
          <div className="font-medium">{meses[m-1]}</div>
          <div className="text-xs text-muted-foreground">Part. histórica: <strong>{(part*100).toFixed(1)}%</strong></div>
          <div className="text-xs">Meta do mês: <strong>{formatBR(metaMes)}</strong></div>
          <div className="text-xs">Variação vs. {ultimoAno}: <strong>{varPct.toFixed(1)}%</strong></div>
        </div>
      );
    })}
  </div>
</div>
          <h4 className="font-semibold">3) Simulação & escolha do cenário</h4>
          <p className="text-sm text-muted-foreground">
            <strong>Cenário 1</strong> = índices atuais. Ajuste à direita para simular o <strong>Cenário 2</strong>.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-3 bg-white">
              <div className="font-medium mb-1">Cenário 1 (Base)</div>
              <div className="text-sm">Meta Anual: <strong>{formatBR(metaBaseline)}</strong></div>
              <div className="text-xs text-muted-foreground mb-2">Distribuição mensal (histórico)</div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({length:12},(_,i)=>i+1).map(m=>(
                  <div key={m} className="rounded-lg border p-2 text-xs bg-gray-50">
                    <div className="font-medium">{meses[m-1]}</div>
                    <div>{formatBR(mensalBaseline[m]||0)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-3 bg-white">
              <div className="font-medium mb-1">Cenário 2 (Ajustes)</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><Label>Inflação (%)</Label><Input type="number" value={simInflacaoPct} onChange={(e)=>setSimInflacaoPct(+e.target.value||0)} /></div>
                <div><Label>CMED (%)</Label><Input type="number" value={simCmedPct} onChange={(e)=>setSimCmedPct(+e.target.value||0)} /></div>
                <div><Label>Part. Med. (%)</Label><Input type="number" value={simPartMedPct} onChange={(e)=>setSimPartMedPct(+e.target.value||0)} /></div>
                <div><Label>Crescimento (%)</Label><Input type="number" value={simCrescimentoPct} onChange={(e)=>setSimCrescimentoPct(+e.target.value||0)} /></div>
              </div>
              <div className="text-sm mt-2">Meta Anual: <strong>{formatBR(metaSim)}</strong></div>
              <div className="text-xs text-muted-foreground mb-2">Distribuição mensal (histórico)</div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({length:12},(_,i)=>i+1).map(m=>(
                  <div key={m} className="rounded-lg border p-2 text-xs bg-gray-50">
                    <div className="font-medium">{meses[m-1]}</div>
                    <div>{formatBR(mensalSim[m]||0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setStep(2)}>Voltar</Button>
            <Button
              onClick={()=>{
                // Usa cenário 2 por padrão na primeira vez
                const useSim = (metaAnual===0) ? true : (Math.abs(metaSim - metaAnual) < Math.abs(metaBaseline - metaAnual));
                if (useSim){
                  setMetaAnual(metaSim);
                  setMetaMensalDistribuida(mensalSim);
                  setInflacao(simInflacaoPct/100); setCmed(simCmedPct/100); setPartMedicamentos(simPartMedPct/100); setCrescimento(simCrescimentoPct/100);
                } else {
                  setMetaAnual(metaBaseline);
                  setMetaMensalDistribuida(mensalBaseline);
                }
                setStep(4);
              }}
              style={{ background: brand.primary, color:'#111' }}
            >Usar cenário</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 4: Pesos */}
      {step===4 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">4) Estratégia de Pesos</h4>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Nível</Label>
              <Select value={nivelPeso} onValueChange={(v:any)=>setNivelPeso(v)}>
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
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={()=>{
                if (basePeso==='igualitario'){
                  if (nivelPeso==='loja'){ const novo:Record<string,number>={}; lojas.forEach(l=>novo[l]=1/lojas.length); setPesosLoja(novo); }
                  else if (nivelPeso==='cidade'){ const novo:Record<string,number>={}; cidadesUltAno.forEach(c=>novo[c]=1/Math.max(1,cidadesUltAno.length)); setPesosCidade(novo); }
                  else { const novo:Record<string,number>={}; estadosUltAno.forEach(e=>novo[e]=1/Math.max(1,estadosUltAno.length)); setPesosEstado(novo); }
                } else if (basePeso==='historico'){
                  if (nivelPeso==='loja'){
                    const somaPor:Record<string,number>={}; lojas.forEach(l=>somaPor[l]=0);
                    historico.filter(r=>r.ano===ultimoAno).forEach(r=>{ somaPor[r.loja]=(somaPor[r.loja]||0)+r.venda_total; });
                    const total = Object.values(somaPor).reduce((a,b)=>a+b,0)||1;
                    const novo:Record<string,number>={}; lojas.forEach(l=>novo[l]=(somaPor[l]||0)/total); setPesosLoja(novo);
                  } else if (nivelPeso==='cidade'){
                    const soma:Record<string,number>={}; cidadesUltAno.forEach(c=>soma[c]=0);
                    historico.filter(r=>r.ano===ultimoAno).forEach(r=>{ const c=r.cidade||''; if(c) soma[c]=(soma[c]||0)+r.venda_total; });
                    const total = Object.values(soma).reduce((a,b)=>a+b,0)||1;
                    const novo:Record<string,number>={}; cidadesUltAno.forEach(c=>novo[c]=(soma[c]||0)/total); setPesosCidade(novo);
                  } else {
                    const soma:Record<string,number>={}; estadosUltAno.forEach(e=>soma[e]=0);
                    historico.filter(r=>r.ano===ultimoAno).forEach(r=>{ const e=r.estado||''; if(e) soma[e]=(soma[e]||0)+r.venda_total; });
                    const total = Object.values(soma).reduce((a,b)=>a+b,0)||1;
                    const novo:Record<string,number>={}; estadosUltAno.forEach(e=>novo[e]=(soma[e]||0)/total); setPesosEstado(novo);
                  }
                } else {
                  if (nivelPeso==='loja'){ const novo:Record<string,number>={}; lojas.forEach(l=>novo[l]=1/lojas.length); setPesosLoja(novo); }
                  if (nivelPeso==='cidade'){ const novo:Record<string,number>={}; cidadesUltAno.forEach(c=>novo[c]=1/Math.max(1,cidadesUltAno.length)); setPesosCidade(novo); }
                  if (nivelPeso==='estado'){ const novo:Record<string,number>={}; estadosUltAno.forEach(e=>novo[e]=1/Math.max(1,estadosUltAno.length)); setPesosEstado(novo); }
                }
              }}>Sugerir pesos</Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Editor de pesos conforme nível */}
            {nivelPeso==='loja' && (
              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Loja</th><th className="px-4 py-3 text-left">Peso (%)</th></tr></thead>
                  <tbody>
                    {lojas.map(l=>(
                      <tr key={l} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{l}</td>
                        <td className="px-4 py-3"><Input type="number" value={((pesosLoja[l]||0)*100).toFixed(2)} onChange={(e)=>{ const v=(+e.target.value||0)/100; setPesosLoja(p=>({...p,[l]:Math.max(0,v)})); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {nivelPeso==='cidade' && (
              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Cidade</th><th className="px-4 py-3 text-left">Peso (%)</th></tr></thead>
                  <tbody>
                    {cidadesUltAno.map(c=>(
                      <tr key={c} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{c}</td>
                        <td className="px-4 py-3"><Input type="number" value={((pesosCidade[c]||0)*100).toFixed(2)} onChange={(e)=>{ const v=(+e.target.value||0)/100; setPesosCidade(p=>({...p,[c]:Math.max(0,v)})); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {nivelPeso==='estado' && (
              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-left">Peso (%)</th></tr></thead>
                  <tbody>
                    {estadosUltAno.map(e=>(
                      <tr key={e} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{e}</td>
                        <td className="px-4 py-3"><Input type="number" value={((pesosEstado[e]||0)*100).toFixed(2)} onChange={(e2)=>{ const v=(+e2.target.value||0)/100; setPesosEstado(p=>({...p,[e]:Math.max(0,v)})); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Preview ADAPTATIVO conforme nível */}
            <div className="overflow-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{nivelPeso==='loja'?'Loja':nivelPeso==='cidade'?'Cidade':'Estado'}</th>
                    <th className="px-4 py-3 text-left">Peso efetivo</th>
                    <th className="px-4 py-3 text-left">Meta anual (R$)</th>
                    <th className="px-4 py-3 text-left">Δ vs {ultimoAno} (R$)</th>
                    <th className="px-4 py-3 text-left">Δ (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(nivelPeso==='loja' ? lojas : nivelPeso==='cidade' ? cidadesUltAno : estadosUltAno).map(key=>{
                    let peso = 0, meta = 0, hist = 0;
                    if (nivelPeso==='loja'){
                      peso = pesoLojaFinal(key);
                      meta = Math.round(metaAnual * peso);
                      hist = historicoLojaAno(key);
                    } else if (nivelPeso==='cidade'){
                      peso = (pesosCidade[key]||0);
                      meta = Math.round(metaAnual * peso);
                      hist = historicoCidadeAno(key);
                    } else {
                      peso = (pesosEstado[key]||0);
                      meta = Math.round(metaAnual * peso);
                      hist = historicoEstadoAno(key);
                    }
                    const delta = meta - hist;
                    const deltaPct = variacaoPct(meta, hist);
                    return (
                      <tr key={key} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{key}</td>
                        <td className="px-4 py-3">{pct(peso)}</td>
                        <td className="px-4 py-3">{formatBR(meta)}</td>
                        <td className="px-4 py-3">{formatBR(delta)}</td>
                        <td className="px-4 py-3">{deltaPct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mt-2">
            Soma atual: <strong>
              {nivelPeso==='loja' ? pct(somaPesos(pesosLoja)) : nivelPeso==='cidade' ? pct(somaPesos(pesosCidade)) : pct(somaPesos(pesosEstado))}
            </strong> — precisa somar 100%.
          </div>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(3)}>Voltar</Button>
            <Button onClick={()=>{ const d:Record<number,number>={}; for (let m=1;m<=12;m++) d[m]=daysInMonth(anoMeta,m); setDiasMes(d); setStep(5); }}
              style={{ background: brand.primary, color:'#111' }}
              disabled={Math.abs((nivelPeso==='loja'?somaPesos(pesosLoja):nivelPeso==='cidade'?somaPesos(pesosCidade):somaPesos(pesosEstado)) - 1) > 0.001}
            >Continuar</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 5 — ok */}
      {step===5 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">5) Dias no mês (ano inteiro)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border p-3 bg-white">
              <div className="font-medium">Ano {anoMeta}</div>
              <div className="text-xs text-muted-foreground mb-1">Total de dias</div>
              <div className="text-sm font-semibold">{Array.from({length:12},(_,i)=>i+1).reduce((s,m)=>s+(diasMes[m]||0),0) || '-'}</div>
            </div>
            {Array.from({length:12},(_,i)=>i+1).map(m => (
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{meses[m-1]} / {anoMeta}</div>
                <div className="text-xs text-muted-foreground mb-1">Total de dias</div>
                <Input type="number" value={diasMes[m]||''} onChange={(e)=>setDiasMes(d=>({...d,[m]: parseInt(e.target.value||'0')}))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(4)}>Voltar</Button>
            <Button onClick={()=>setStep(6)} style={{ background: brand.primary, color:'#111' }}>Continuar</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 6 — incluir "Abertura" no card ANO */}
      {step===6 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-4">
          <h4 className="font-semibold">6) Distribuição mensal — clique em "Abertura" no mês</h4>
          <div className="flex items-center gap-2">
            <Label>Visão:</Label>
            <Select value={step6Visao} onValueChange={(v:any)=>setStep6Visao(v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Agrupamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loja">Por loja</SelectItem>
                <SelectItem value="cidade">Por cidade</SelectItem>
                <SelectItem value="estado">Por estado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card do Ano com Abertura */}
            <div className="rounded-xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">Ano {anoMeta}</div>
                <Button size="sm" variant="outline" onClick={()=>setStep6YearOpen(v=>!v)}>{step6YearOpen? "Ocultar" : "Abertura"}</Button>
              </div>
              <div className="text-xs text-muted-foreground">Meta anual</div>
              <div className="text-sm font-semibold">{formatBR(metaAnual)}</div>

              {step6YearOpen && (
                <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                  <div className="text-xs text-muted-foreground mb-1">Consolidado ({step6Visao})</div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {step6Visao==='loja' && lojas.map(l=>{
                      const p = pesoLojaFinal(l);
                      const val = Math.round(metaAnual * p);
                      const hist = historicoLojaAno(l);
                      const va = val - hist;
                      const vp = variacaoPct(val, hist);
                      return <div key={l} className="rounded-md border p-2 bg-white">{l}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                    })}
                    {step6Visao==='cidade' && Object.entries(shareByCidade()).map(([c,p])=>{
                      const val = Math.round(metaAnual * (p||0));
                      const hist = historicoCidadeAno(c);
                      const va = val - hist; const vp = variacaoPct(val, hist);
                      return <div key={c} className="rounded-md border p-2 bg-white">{c}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                    })}
                    {step6Visao==='estado' && Object.entries(shareByEstado()).map(([e,p])=>{
                      const val = Math.round(metaAnual * (p||0));
                      const hist = historicoEstadoAno(e);
                      const va = val - hist; const vp = variacaoPct(val, hist);
                      return <div key={e} className="rounded-md border p-2 bg-white">{e}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Meses */}
            {Array.from({length:12},(_,i)=>i+1).map(m => {
              const aberto = step6Expanded===m;
              const metaMes = metaMensalDistribuida[m]||0;
              const histMes = historicoEmpresaMes(m);
              const varPct = variacaoPct(metaMes, histMes);
              const varAbs = metaMes - histMes;
              return (
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{meses[m-1]}</div>
                    <Button size="sm" variant="outline" onClick={()=> setStep6Expanded(aberto? null : m)}>{aberto? "Ocultar" : "Abertura"}</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Histórico: {pct(participacaoMensalUltAno[m]||0)}</div>
                  <div className="mt-1 text-sm">Meta: <strong>{formatBR(metaMes)}</strong></div>
                  <div className="text-[11px] mt-1">Δ vs {ultimoAno}: <strong>{formatBR(varAbs)}</strong> ({varPct.toFixed(1)}%)</div>

                  {aberto && (
                    <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                      <div className="text-xs text-muted-foreground mb-1">Consolidado ({step6Visao})</div>
                      <div className="grid grid-cols-1 gap-2">
                        {step6Visao==='loja' && lojas.map(l=>{
                          const p = pesoLojaFinal(l);
                          const val = Math.round(metaMes * p);
                          const hist = historicoGrupoMes(l, 'loja', m);
                          const vp = variacaoPct(val, hist);
                          const va = val - hist;
                          return <div key={l} className="rounded-md border p-2 bg-white text-xs">{l}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                        })}
                        {step6Visao==='cidade' && (()=> {
                          const entries = Object.entries(shareByCidade());
                          return entries.map(([c,p])=>{
                            const val = Math.round(metaMes * (p||0));
                            const hist = historicoGrupoMes(c, 'cidade', m);
                            const vp = variacaoPct(val, hist);
                            const va = val - hist;
                            return <div key={c} className="rounded-md border p-2 bg-white text-xs">{c}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                          });
                        })()}
                        {step6Visao==='estado' && (()=> {
                          const entries = Object.entries(shareByEstado());
                          return entries.map(([e,p])=>{
                            const val = Math.round(metaMes * (p||0));
                            const hist = historicoGrupoMes(e, 'estado', m);
                            const vp = variacaoPct(val, hist);
                            const va = val - hist;
                            return <div key={e} className="rounded-md border p-2 bg-white text-xs">{e}: <strong>{formatBR(val)}</strong> • Δ {formatBR(va)} ({vp.toFixed(1)}%)</div>
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setStep(5)}>Voltar</Button>
            <Button onClick={()=>setStep(7)} style={{ background: brand.primary, color:'#111' }}>Continuar</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 7 — adicionar "Meta geral do mês" */}
      {step===7 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">7) Distribuição diária (média) e semanas — clique no mês</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card do Ano com "Ver meses" */}
            <div className="rounded-xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">Ano {anoMeta}</div>
                <Button size="sm" variant="outline" onClick={()=>setStep7YearOpen(v=>!v)}>{step7YearOpen? "Ocultar meses" : "Ver meses"}</Button>
              </div>
              <div className="text-xs text-muted-foreground">Meta anual</div>
              <div className="text-sm font-semibold">{formatBR(metaAnual)}</div>
              <div className="text-xs text-muted-foreground mt-1">Dias planejados</div>
              <div className="text-sm">{totalDiasAno || '-'}</div>

              {step7YearOpen && (
                <div className="mt-2 rounded-lg border p-2 bg-gray-50 text-xs">
                  <div className="text-muted-foreground mb-1">Meses</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({length:12},(_,i)=>i+1).map(m=>(
                      <div key={m} className="rounded-md border p-2 bg-white">
                        <div className="font-medium">{meses[m-1]}</div>
                        <div>Meta: <strong>{formatBR(metaMensalDistribuida[m]||0)}</strong></div>
                        <div>Dias: {diasMes[m]||'-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {Array.from({length:12},(_,i)=>i+1).map(m => {
              const dm = diasMes[m]||0;
              const md = dm? Math.round((metaMensalDistribuida[m]||0)/dm):0;
              const aberto = step7Expanded===m;
              return (
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{meses[m-1]}</div>
                    <Button size="sm" variant="outline" onClick={()=> setStep7Expanded(aberto? null : m)}>{aberto? "Ocultar" : "Ver semanas"}</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Dias: {dm||'-'}</div>
                  <div className="text-sm mt-1">Meta geral do mês: <strong>{formatBR(metaMensalDistribuida[m]||0)}</strong></div>
                  <div className="mt-1 text-sm">Meta diária média: <strong>{dm? formatBR(md): '-'}</strong></div>

                  {aberto && (
                    <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                      <div className="text-xs text-muted-foreground mb-1">Semanas (Dom→Sáb)</div>
                      <div className="grid grid-cols-1 gap-2">
                        {getWeeksForMonth(anoMeta, m).map(w=>{
                          const totalDias = getWeeksForMonth(anoMeta, m).reduce((a,b)=>a+b.dias,0)||1;
                          const v = Math.round((metaMensalDistribuida[m]||0)*(w.dias/totalDias));
                          return (
                            <div key={w.idx} className="rounded-md border p-2 bg-white text-xs">
                              <div className="font-medium">Semana {w.idx}</div>
                              <div>{fmtDate(w.start)} — {fmtDate(w.end)} • {w.dias} dias</div>
                              <div>Meta: <strong>{formatBR(v)}</strong></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(6)}>Voltar</Button>
            <Button onClick={()=>setStep(8)} style={{ background: brand.primary, color:'#111' }}>Ir para Consolidação</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 8 — ok (foi ajustado antes) */}
      {step===8 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-4">
          <h4 className="font-semibold">8) Consolidação final — Visualização única</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label>Escopo</Label>
              <Select value={visaoFinalScope} onValueChange={(v:any)=>{ setVisaoFinalScope(v); setVisaoFinalKey(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visaoFinalScope==='loja' && (
              <div>
                <Label>Loja</Label>
                <Select value={visaoFinalKey} onValueChange={(v:any)=>setVisaoFinalKey(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha a loja" /></SelectTrigger>
                  <SelectContent>{lojas.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {visaoFinalScope==='cidade' && (
              <div>
                <Label>Cidade</Label>
                <Select value={visaoFinalKey} onValueChange={(v:any)=>setVisaoFinalKey(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha a cidade" /></SelectTrigger>
                  <SelectContent>{cidadesUltAno.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {visaoFinalScope==='estado' && (
              <div>
                <Label>Estado</Label>
                <Select value={visaoFinalKey} onValueChange={(v:any)=>setVisaoFinalKey(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha o estado" /></SelectTrigger>
                  <SelectContent>{estadosUltAno.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {visaoFinalScope==='empresa' ? (
            <div className="rounded-2xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Empresa — Meta anual: {formatBR(metaAnual)}</div>
                <Button size="sm" variant="outline" onClick={()=>setStep8YearOpen(v=>!v)}>{step8YearOpen? "Ocultar meses" : "Ver meses"}</Button>
              </div>

              {step8YearOpen && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.from({length:12},(_,i)=>i+1).map(m => {
                    const metaMes = metaMensalDistribuida[m]||0;
                    const histMes = historicoEmpresaMes(m);
                    const varPct = variacaoPct(metaMes, histMes);
                    const varAbs = metaMes - histMes;
                    const key = `company-${m}`;
                    const open = !!openWeeksKeys[key];
                    return (
                      <div key={m} className="rounded-lg border p-2 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{meses[m-1]}</div>
                          <Button size="sm" variant="outline" onClick={()=>toggleWeeksKey(key)}>{open? "Ocultar semanas" : "Ver semanas"}</Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Meta do mês</div>
                        <div className="text-sm"><strong>{formatBR(metaMes)}</strong></div>
                        <div className="text-[11px] mt-1">Δ vs {ultimoAno}: <strong>{formatBR(varAbs)}</strong> ({varPct.toFixed(1)}%)</div>

                        {open && (
                          <div className="mt-1">
                            <div className="text-[11px] text-muted-foreground">Semanas (Dom→Sáb)</div>
                            <ul className="text-[11px]">
                              {getWeeksForMonth(anoMeta, m).map(w=>{
                                const totalDias = getWeeksForMonth(anoMeta, m).reduce((a,b)=>a+b.dias,0)||1;
                                const v = Math.round(metaMes*(w.dias/totalDias));
                                return <li key={w.idx}>S{w.idx} {fmtDate(w.start)}–{fmtDate(w.end)}: <strong>{formatBR(v)}</strong></li>
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : visaoFinalKey ? (
            <div className="rounded-2xl border p-3 bg-white">
              <div className="text-sm font-semibold">
                {visaoFinalScope==='loja' && <>Loja — {visaoFinalKey}</>}
                {visaoFinalScope==='cidade' && <>Cidade — {visaoFinalKey}</>}
                {visaoFinalScope==='estado' && <>Estado — {visaoFinalKey}</>}
              </div>
              <div className="rounded-lg border p-2 bg-gray-50 mt-2">
                <div className="text-sm font-medium">Ano {anoMeta}</div>
                <div className="text-xs text-muted-foreground">Meta anual</div>
                <div className="text-sm">
                  <strong>
                    {formatBR(Math.round(metaAnual * (
                      visaoFinalScope==='loja' ? pesoLojaFinal(visaoFinalKey)
                      : visaoFinalScope==='cidade' ? (shareByCidade()[visaoFinalKey]||0)
                      : (shareByEstado()[visaoFinalKey]||0)
                    )))}
                  </strong>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({length:12},(_,i)=>i+1).map(m=>{
                  const pesoGrupo = (
                    visaoFinalScope==='loja' ? pesoLojaFinal(visaoFinalKey)
                    : visaoFinalScope==='cidade' ? (shareByCidade()[visaoFinalKey]||0)
                    : (shareByEstado()[visaoFinalKey]||0)
                  );
                  const mensalGrupo = Math.round((metaMensalDistribuida[m]||0) * pesoGrupo);
                  const hist = historicoGrupoMes(visaoFinalKey, visaoFinalScope as any, m);
                  const vp = variacaoPct(mensalGrupo, hist);
                  const va = mensalGrupo - hist;
                  const wkKey = `grp-${visaoFinalKey}-${m}`;
                  const open = !!openWeeksKeys[wkKey];
                  return (
                    <div key={m} className="rounded-lg border p-2 bg-gray-50">
                      <div className="flex items-center justify_between">
                        <div className="text-sm font-medium">{meses[m-1]}</div>
                        <Button size="sm" variant="outline" onClick={()=>toggleWeeksKey(wkKey)}>{open? "Ocultar semanas" : "Ver semanas"}</Button>
                      </div>
                      <div className="text-xs text-muted-foreground">Total mês (grupo)</div>
                      <div className="text-sm"><strong>{formatBR(mensalGrupo)}</strong></div>
                      <div className="text-[11px] mt-1">Δ vs {ultimoAno}: <strong>{formatBR(va)}</strong> ({vp.toFixed(1)}%)</div>

                      {open && (
                        <div className="mt-1">
                          <div className="text-[11px] text-muted-foreground">Semanas (Dom→Sáb)</div>
                          <ul className="text-[11px]">
                            {getWeeksForMonth(anoMeta, m).map(w=>{
                              const totalDias = getWeeksForMonth(anoMeta, m).reduce((a,b)=>a+b.dias,0)||1;
                              const v = Math.round(mensalGrupo*(w.dias/totalDias));
                              return <li key={w.idx}>S{w.idx} {fmtDate(w.start)}–{fmtDate(w.end)}: <strong>{formatBR(v)}</strong></li>
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Selecione o escopo e a chave para visualizar.</div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setStep(7)}>Voltar</Button>
            <Button style={{ background: brand.primary, color:'#111' }} onClick={()=>setStep(9)}>Ir para Acompanhamento</Button>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 9 — Acompanhamento (dashboard estilo Passo 8) */}
      {step===9 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-4">
          <h4 className="font-semibold">Acompanhamento</h4>
          <p className="text-sm text-muted-foreground">
            Importe um CSV diário no formato: <code>data,loja,cidade,estado,venda_total</code>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a className="underline text-sm" href="/mnt/data/exemplo_vendas_diarias.csv" target="_blank" rel="noreferrer">Baixar planilha de exemplo</a>
            <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importarAcompanhamento(f); }} />
          </div>

          {/* Filtro de escopo para acompanhamento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label>Escopo</Label>
              <Select value={step9Scope} onValueChange={(v:any)=>{ setStep9Scope(v); setStep9Key(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {step9Scope==='loja' && (
              <div>
                <Label>Loja</Label>
                <Select value={step9Key} onValueChange={(v:any)=>setStep9Key(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha a loja" /></SelectTrigger>
                  <SelectContent>{lojas.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {step9Scope==='cidade' && (
              <div>
                <Label>Cidade</Label>
                <Select value={step9Key} onValueChange={(v:any)=>setStep9Key(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha a cidade" /></SelectTrigger>
                  <SelectContent>{cidadesUltAno.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {step9Scope==='estado' && (
              <div>
                <Label>Estado</Label>
                <Select value={step9Key} onValueChange={(v:any)=>setStep9Key(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha o estado" /></SelectTrigger>
                  <SelectContent>{estadosUltAno.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Bloco estilo passo 8, mas com Meta x Realizado x Desempenho */}
          {step9Scope==='empresa' ? (
            <div className="rounded-2xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Empresa — {anoMeta}</div>
                <Button size="sm" variant="outline" onClick={()=>setStep9YearOpen(v=>!v)}>{step9YearOpen? "Ocultar meses" : "Ver meses"}</Button>
              </div>

              {/* Card Ano: Meta, Realizado, Δ, % atingimento, Cresc. vs último ano */}
              <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                <div className="text-sm font-medium">Ano {anoMeta}</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div>Meta: <strong>{formatBR(metaAnual)}</strong></div>
                  <div>Realizado: <strong>{formatBR(realizadoEmpresaAno())}</strong></div>
                  <div>Δ vs Meta: <strong>{formatBR(realizadoEmpresaAno() - metaAnual)}</strong></div>
                  <div>% Ating.: <strong>{((realizadoEmpresaAno()/(metaAnual||1))*100).toFixed(1)}%</strong></div>
                  <div>Cresc. vs {ultimoAno}: <strong>{variacaoPct(realizadoEmpresaAno(), historicoEmpresaAno()).toFixed(1)}%</strong></div>
                </div>
              </div>

              {step9YearOpen && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.from({length:12},(_,i)=>i+1).map(m=>{
                    const metaMes = metaMensalDistribuida[m]||0;
                    const realizadoMes = realizadoEmpresaMes(m);
                    const delta = realizadoMes - metaMes;
                    const ating = (realizadoMes/(metaMes||1))*100;
                    const cresc = variacaoPct(realizadoMes, historicoEmpresaMes(m));
                    return (
                      <div key={m} className="rounded-lg border p-2 bg-gray-50">
                        <div className="text-sm font-medium">{meses[m-1]}</div>
                        <div className="text-xs">Meta: <strong>{formatBR(metaMes)}</strong></div>
                        <div className="text-xs">Realizado: <strong>{formatBR(realizadoMes)}</strong></div>
                        <div className="text-xs">Δ vs Meta: <strong>{formatBR(delta)}</strong> • %Ating: <strong>{ating.toFixed(1)}%</strong></div>
                        <div className="text-xs">Cresc. vs {ultimoAno}: <strong>{cresc.toFixed(1)}%</strong></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : step9Key ? (
            <div className="rounded-2xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                  {step9Scope==='loja' && <>Loja — {step9Key}</>}
                  {step9Scope==='cidade' && <>Cidade — {step9Key}</>}
                  {step9Scope==='estado' && <>Estado — {step9Key}</>}
                </div>
                <Button size="sm" variant="outline" onClick={()=>setStep9YearOpen(v=>!v)}>{step9YearOpen? "Ocultar meses" : "Ver meses"}</Button>
              </div>

              {/* Card Ano escopo escolhido */}
              <div className="mt-2 rounded-lg border p-2 bg-gray-50">
                <div className="text-sm font-medium">Ano {anoMeta}</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {(() => {
                    const pesoGrupo = (
                      step9Scope==='loja' ? (lojas.includes(step9Key)? pesoLojaFinal(step9Key):0)
                      : step9Scope==='cidade' ? (shareByCidade()[step9Key]||0)
                      : (shareByEstado()[step9Key]||0)
                    );
                    const metaGrupoAno = Math.round(metaAnual * pesoGrupo);
                    const realizadoAno = realizadoGrupoAno(step9Scope as any, step9Key);
                    const histAno = step9Scope==='loja'? historicoLojaAno(step9Key) : step9Scope==='cidade'? historicoCidadeAno(step9Key) : historicoEstadoAno(step9Key);
                    const crescAno = variacaoPct(realizadoAno, histAno);
                    return (
                      <>
                        <div>Meta: <strong>{formatBR(metaGrupoAno)}</strong></div>
                        <div>Realizado: <strong>{formatBR(realizadoAno)}</strong></div>
                        <div>Δ vs Meta: <strong>{formatBR(realizadoAno - metaGrupoAno)}</strong></div>
                        <div>% Ating.: <strong>{((realizadoAno/(metaGrupoAno||1))*100).toFixed(1)}%</strong></div>
                        <div>Cresc. vs {ultimoAno}: <strong>{crescAno.toFixed(1)}%</strong></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {step9YearOpen && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.from({length:12},(_,i)=>i+1).map(m=>{
                    const pesoGrupo = (
                      step9Scope==='loja' ? (lojas.includes(step9Key)? pesoLojaFinal(step9Key):0)
                      : step9Scope==='cidade' ? (shareByCidade()[step9Key]||0)
                      : (shareByEstado()[step9Key]||0)
                    );
                    const metaMesGrupo = Math.round((metaMensalDistribuida[m]||0) * pesoGrupo);
                    const realizadoMesGrupo = realizadoGrupoMes(step9Scope as any, step9Key, m);
                    const delta = realizadoMesGrupo - metaMesGrupo;
                    const ating = (realizadoMesGrupo/(metaMesGrupo||1))*100;
                    const cresc = variacaoPct(realizadoMesGrupo, historicoGrupoMes(step9Key, step9Scope as any, m));
                    return (
                      <div key={m} className="rounded-lg border p-2 bg-gray-50">
                        <div className="text-sm font-medium">{meses[m-1]}</div>
                        <div className="text-xs">Meta: <strong>{formatBR(metaMesGrupo)}</strong></div>
                        <div className="text-xs">Realizado: <strong>{formatBR(realizadoMesGrupo)}</strong></div>
                        <div className="text-xs">Δ vs Meta: <strong>{formatBR(delta)}</strong> • %Ating: <strong>{ating.toFixed(1)}%</strong></div>
                        <div className="text-xs">Cresc. vs {ultimoAno}: <strong>{cresc.toFixed(1)}%</strong></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Selecione o escopo e a chave para visualizar.</div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setStep(8)}>Voltar</Button>
            <Button style={{ background: brand.primary, color:'#111' }}>Salvar acompanhamento</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
