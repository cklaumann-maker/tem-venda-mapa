"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";

// ===== Helpers
const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const br = (n:number)=> 'R$ ' + (n||0).toLocaleString('pt-BR');
const pct = (n:number)=> ((n||0)*100).toFixed(1) + '%';
const clamp01 = (n:number)=> Math.max(0, Math.min(1, n));

type LinhaHist = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };

export default function MetasView(){
  // ====== Wizard
  const [step, setStep] = useState(1);

  // ====== Dados base
  const [historico, setHistorico] = useState<LinhaHist[]>([]);
  const [lojas, setLojas] = useState<string[]>([]);
  const [nivelPeso, setNivelPeso] = useState<'loja'|'cidade'|'estado'>('loja');
  const [basePeso, setBasePeso] = useState<'historico'|'igualitario'|'personalizado'>('historico');
  const [pesos, setPesos] = useState<Record<string, number>>({}); // chave depende do nivelPeso
  const [diasMes, setDiasMes] = useState<Record<number, number>>({}); // dias totais (não úteis), editável

  // ====== Índices
  const [partMedicamentos, setPartMedicamentos] = useState(0.55);
  const [inflacao, setInflacao] = useState(0.045);
  const [cmed, setCmed] = useState(0.05);
  const [crescimento, setCrescimento] = useState(0.10);
  const taxaComposta = useMemo(()=> inflacao + (cmed * partMedicamentos) + crescimento, [inflacao,cmed,partMedicamentos,crescimento]);

  // ====== Cálculos principais
  const anosOrdenados = useMemo(()=> [...new Set(historico.map(h=>h.ano))].sort((a,b)=>a-b), [historico]);
  const ultimoAno = anosOrdenados[anosOrdenados.length-1];
  const totalUltimoAno = useMemo(()=> historico.filter(h=>h.ano===ultimoAno).reduce((s,h)=>s+h.venda_total,0), [historico, ultimoAno]);
  const metaAnual = useMemo(()=> Math.round(totalUltimoAno * (1 + taxaComposta)), [totalUltimoAno, taxaComposta]);

  // participação mensal do último ano
  const partMensalUltAno = useMemo(()=>{
    const porMes: Record<number, number> = {};
    for (let m=1;m<=12;m++){
      porMes[m] = historico.filter(h=>h.ano===ultimoAno && h.mes===m).reduce((s,h)=>s+h.venda_total,0);
    }
    const total = Object.values(porMes).reduce((a,b)=>a+b,0) || 1;
    const pct: Record<number, number> = {};
    for (let m=1;m<=12;m++) pct[m] = (porMes[m]||0)/total;
    return pct;
  },[historico, ultimoAno]);

  // distribuição mensal por participação
  const metaMensal = useMemo(()=>{
    const map: Record<number, number> = {};
    for (let m=1;m<=12;m++) map[m] = Math.round(metaAnual * (partMensalUltAno[m]||0));
    // microajuste para somar exatamente metaAnual
    const soma = Object.values(map).reduce((a,b)=>a+b,0);
    let diff = metaAnual - soma;
    let i=1;
    while (diff!==0 && i<=12){
      const k = ((i-1)%12)+1;
      map[k] += (diff>0?1:-1);
      diff += (diff>0?-1:+1);
      i++;
    }
    return map;
  },[metaAnual, partMensalUltAno]);

  // chaves conforme nível selecionado
  const chavesNivel = useMemo(()=>{
    if (nivelPeso==='loja') return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.loja))];
    if (nivelPeso==='cidade') return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.cidade||'').filter(Boolean))];
    return [...new Set(historico.filter(h=>h.ano===ultimoAno).map(h=>h.estado||'').filter(Boolean))];
  },[historico, ultimoAno, nivelPeso]);

  // sugerir pesos por base
  function sugerirPesos(){
    const novo: Record<string, number> = {};
    if (!chavesNivel.length) return setPesos({});
    if (basePeso==='igualitario'){
      const v = 1/chavesNivel.length;
      chavesNivel.forEach(k=> novo[k]=v);
    } else if (basePeso==='historico'){
      const soma: Record<string, number> = {};
      chavesNivel.forEach(k=> soma[k]=0);
      historico.filter(h=>h.ano===ultimoAno).forEach(h=>{
        const k = nivelPeso==='loja' ? h.loja : nivelPeso==='cidade' ? (h.cidade||'') : (h.estado||'');
        if (k) soma[k]+=h.venda_total;
      });
      const total = Object.values(soma).reduce((a,b)=>a+b,0)||1;
      chavesNivel.forEach(k=> novo[k]=(soma[k]||0)/total);
    } else {
      const v = 1/chavesNivel.length;
      chavesNivel.forEach(k=> novo[k]=v);
    }
    setPesos(novo);
  }

  // dias por mês sugeridos (totais do calendário)
  function sugerirDiasTotais(){
    const d: Record<number, number> = {};
    const anoMeta = (ultimoAno||new Date().getFullYear()-1)+1;
    for (let m=1;m<=12;m++){
      const lastDay = new Date(anoMeta, m, 0).getDate(); // m:1..12
      d[m]=lastDay;
    }
    setDiasMes(d);
  }

  // abertura por nível (distribui meta mensal para cada chave do nível via pesos)
  const aberturaPorNivel: Record<number, { chave:string; valor:number }[]> = useMemo(()=>{
    const out: Record<number, {chave:string; valor:number}[]> = {};
    for (let m=1;m<=12;m++){
      const arr: {chave:string; valor:number}[] = [];
      const totalMes = metaMensal[m]||0;
      const somaPesos = Object.values(pesos).reduce((a,b)=>a+b,0)||1;
      chavesNivel.forEach(k=>{
        const p = (pesos[k]||0)/somaPesos;
        arr.push({ chave:k, valor: Math.round(totalMes*p) });
      });
      // microajuste por mês
      const soma = arr.reduce((s,r)=>s+r.valor,0);
      let diff = totalMes - soma;
      let i=0;
      while(diff!==0 && i<arr.length){
        arr[i].valor += (diff>0?1:-1);
        diff += (diff>0?-1:+1);
        i++;
      }
      out[m]=arr;
    }
    return out;
  },[metaMensal, chavesNivel, pesos]);

  // Meta diária média (por mês)
  const metaDiariaMedia = (m:number)=>{
    const d = diasMes[m]||0; if (!d) return 0;
    return Math.round((metaMensal[m]||0)/d);
  };

  // ====== Importação CSV
  function importarCSV(file: File){
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
      for (const line of lines){
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
      setStep(2);
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
    setStep(2);
  }

  // ====== Supabase: consolidar no passo 8
  async function ensureLojas(lojasInput: {nome:string; cidade?:string; estado?:string}[]): Promise<Record<string,string>> {
    const supabase = supabaseClient();
    const nomes = Array.from(new Set(lojasInput.map(l=>l.nome)));
    const { data: existentes, error: errSel } = await supabase.from("lojas").select("*").in("nome", nomes);
    if (errSel) throw errSel;
    const map: Record<string,string> = {};
    (existentes||[]).forEach((r:any)=> map[r.nome]=r.id);
    const faltantes = lojasInput.filter(l=>!map[l.nome]);
    if (faltantes.length){
      const { data: inseridas, error: errIns } = await supabase.from("lojas")
        .insert(faltantes.map(l=>({ nome:l.nome, cidade:l.cidade||null, estado:l.estado||null })))
        .select("*");
      if (errIns) throw errIns;
      (inseridas||[]).forEach((r:any)=> map[r.nome]=r.id);
    }
    return map;
  }
  async function upsertMetasMensais(rows: {ano:number; mes:number; loja_id:string; meta:number; scenario_id?:string; locked?:boolean}[]) {
    const supabase = supabaseClient();
    const { error } = await supabase.from("metas_mensais").upsert(rows, { onConflict: "ano,mes,loja_id" });
    if (error) throw error;
  }
  async function consolidarPasso8(){
    if (!historico.length) { alert("Importe o histórico antes."); return; }
    const anos = [...new Set(historico.map(h=>h.ano))].sort((a,b)=>a-b);
    const anoMeta = (anos[anos.length-1]||new Date().getFullYear()-1)+1;

    // construímos a distribuição por LOJA a partir do nível de pesos escolhido
    const mapLojaChave: Record<string,string> = {};
    lojas.forEach(l=>{
      const ref = historico.find(h=>h.loja===l && h.ano===anos[anos.length-1]);
      mapLojaChave[l] = nivelPeso==='loja' ? l : (nivelPeso==='cidade' ? (ref?.cidade||'') : (ref?.estado||''));
    });
    const lojasPorChave: Record<string,string[]> = {};
    lojas.forEach(l=>{
      const ch = mapLojaChave[l]||'';
      lojasPorChave[ch] = lojasPorChave[ch]||[];
      lojasPorChave[ch].push(l);
    });

    const lojasInfo = lojas.map((nome)=>{
      const ref = historico.find(h=>h.loja===nome && h.ano===anos[anos.length-1]);
      return { nome, cidade: ref?.cidade, estado: ref?.estado };
    });
    const idPorLoja = await ensureLojas(lojasInfo);

    const linhas: {ano:number; mes:number; loja_id:string; meta:number; scenario_id?:string; locked?:boolean}[] = [];
    for (let m=1;m<=12;m++){
      const totalMes = metaMensal[m]||0;
      const somaPesosNivel = Object.values(pesos).reduce((a,b)=>a+b,0)||1;
      const valorPorChave: Record<string, number> = {};
      chavesNivel.forEach(ch=> valorPorChave[ch] = Math.round(totalMes * ( (pesos[ch]||0)/somaPesosNivel )));
      const somaCh = Object.values(valorPorChave).reduce((a,b)=>a+b,0);
      let diffCh = totalMes - somaCh;
      let ci=0; const chList = chavesNivel.slice();
      while (diffCh!==0 && ci<chList.length){
        valorPorChave[chList[ci]] += (diffCh>0?1:-1);
        diffCh += (diffCh>0?-1:+1);
        ci++;
      }
      for (const ch of chList){
        const lojasDaChave = lojasPorChave[ch]||[];
        if (!lojasDaChave.length) continue;
        const igual = Math.floor(valorPorChave[ch] / lojasDaChave.length);
        let resto = valorPorChave[ch] - (igual * lojasDaChave.length);
        lojasDaChave.forEach((lojaNome)=>{
          const metaLojaMes = igual + (resto>0?1:0);
          if (resto>0) resto--;
          const loja_id = idPorLoja[lojaNome];
          if (loja_id){
            linhas.push({ ano: anoMeta, mes: m, loja_id, meta: metaLojaMes, locked: true });
          }
        });
      }
    }
    await upsertMetasMensais(linhas);
    alert("Metas consolidadas no banco com sucesso!");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[1,2,3,4,5,6,7,8,9].map(n=>(
          <Button key={n} variant={n===step?'default':'outline'} onClick={()=>setStep(n)}>Passo {n}</Button>
        ))}
      </div>

      {step===1 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">1) Importar histórico mensal — até 24 meses</h4>
          <div className="text-sm text-muted-foreground">CSV: <code>ano,mes,loja,cidade,estado,venda_total</code></div>
          <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importarCSV(f); }} />
          <Button variant="outline" onClick={carregarMock}>Carregar exemplo</Button>
          <div className="text-sm">Lojas detectadas: <strong>{lojas.join(", ")||"-"}</strong></div>
        </CardContent></Card>
      )}

      {step===2 && (
        <Card className="rounded-2xl"><CardContent className="p-4 grid md:grid-cols-4 gap-3">
          <div><Label>Part. Medicamentos (%)</Label><Input type="number" value={(partMedicamentos*100).toFixed(1)} onChange={(e)=>setPartMedicamentos(clamp01(parseFloat(e.target.value||'0')/100))} /></div>
          <div><Label>Inflação (%)</Label><Input type="number" value={(inflacao*100).toFixed(2)} onChange={(e)=>setInflacao(Math.max(0, parseFloat(e.target.value||'0')/100))} /></div>
          <div><Label>CMED (%)</Label><Input type="number" value={(cmed*100).toFixed(2)} onChange={(e)=>setCmed(Math.max(0, parseFloat(e.target.value||'0')/100))} /></div>
          <div><Label>Crescimento (%)</Label><Input type="number" value={(crescimento*100).toFixed(2)} onChange={(e)=>setCrescimento(parseFloat(e.target.value||'0')/100)} /></div>
          <div className="md:col-span-4 text-sm">Taxa composta do ano: <strong>{pct(taxaComposta)}</strong></div>
          <div className="md:col-span-4"><Button onClick={()=>setStep(3)}>Avançar</Button></div>
        </CardContent></Card>
      )}

      {step===3 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">3) Resultado — Meta anual e participação mensal</h4>
          <div className="text-sm">Total último ano ({ultimoAno}): <strong>{br(totalUltimoAno)}</strong></div>
          <div className="text-lg font-semibold">Meta anual proposta: {br(metaAnual)}</div>
          <div className="text-sm">Índice do ano: <strong>{pct(taxaComposta)}</strong></div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{mesesNomes[m-1]}</div>
                <div className="text-xs text-muted-foreground">% no último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                <div className="text-sm">Meta mês: <strong>{br(metaMensal[m]||0)}</strong></div>
              </div>
            ))}
          </div>
          <Button onClick={()=>setStep(4)} variant="outline">Avançar</Button>
        </CardContent></Card>
      )}

      {step===4 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">4) Estratégia de pesos (nível de abertura)</h4>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Nível</Label>
              <Select value={nivelPeso} onValueChange={(v:any)=>{ setNivelPeso(v); setPesos({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Base</Label>
              <Select value={basePeso} onValueChange={(v:any)=>setBasePeso(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="historico">Histórico</SelectItem>
                  <SelectItem value="igualitario">Igualitário</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button variant="outline" onClick={sugerirPesos}>Sugerir pesos</Button></div>
          </div>

          {chavesNivel.length>0 && (
            <div className="overflow-auto rounded-2xl border mt-3">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{nivelPeso.toUpperCase()}</th>
                    <th className="text-left px-4 py-3 font-medium">Peso (%)</th>
                    <th className="text-left px-4 py-3 font-medium">Impacto no mês Jan (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {chavesNivel.map(k=>{
                    const p = clamp01(pesos[k]||0);
                    const impactoJan = Math.round((metaMensal[1]||0) * (p / (Object.values(pesos).reduce((a,b)=>a+b,0)||1)));
                    return (
                      <tr key={k} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{k}</td>
                        <td className="px-4 py-3"><Input type="number" value={(p*100).toFixed(2)} onChange={(e)=>{
                          const v = clamp01(parseFloat(e.target.value||'0')/100);
                          setPesos(prev=>({ ...prev, [k]: v }));
                        }} /></td>
                        <td className="px-4 py-3">{br(impactoJan)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">Soma dos pesos: <strong>{((Object.values(pesos).reduce((a,b)=>a+b,0)||0)*100).toFixed(2)}%</strong></div>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(3)}>Voltar</Button>
            <Button onClick={()=>setStep(5)} disabled={Math.abs(Object.values(pesos).reduce((a,b)=>a+b,0)-1)>0.001}>Avançar</Button>
          </div>
        </CardContent></Card>
      )}

      {step===5 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">5) Calendário — dias do mês (totais)</h4>
          <Button variant="outline" onClick={sugerirDiasTotais}>Sugerir dias do ano</Button>
          <div className="grid md:grid-cols-3 gap-2 mt-3">
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{mesesNomes[m-1]}</div>
                <div className="text-xs text-muted-foreground">Dias</div>
                <Input type="number" value={diasMes[m]||''} onChange={(e)=>setDiasMes(d=>({...d,[m]: parseInt(e.target.value||'0')}))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(4)}>Voltar</Button>
            <Button onClick={()=>setStep(6)}>Avançar</Button>
          </div>
        </CardContent></Card>
      )}

      {step===6 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">6) Distribuição mensal (com abertura por {nivelPeso})</h4>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div className="rounded-xl border p-3 bg-white">
              <div className="font-medium">Ano</div>
              <div className="text-sm">Meta anual: <strong>{br(metaAnual)}</strong></div>
              <div className="text-xs text-muted-foreground">Índice do ano: <strong>{pct(taxaComposta)}</strong></div>
            </div>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{mesesNomes[m-1]}</div>
                <div className="text-xs text-muted-foreground">% último ano: {(partMensalUltAno[m]*100||0).toFixed(1)}%</div>
                <div className="text-sm">Meta mês: <strong>{br(metaMensal[m]||0)}</strong></div>
                <div className="mt-2">
                  <details>
                    <summary className="text-xs underline cursor-pointer">Abertura</summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-auto pr-2">
                      {(aberturaPorNivel[m]||[]).map((r,i)=>(
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span>{r.chave}</span><span>{br(r.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(5)}>Voltar</Button>
            <Button onClick={()=>setStep(7)}>Avançar</Button>
          </div>
        </CardContent></Card>
      )}

      {step===7 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">7) Distribuição por dia (média por mês)</h4>
          <div className="grid md:grid-cols-3 gap-2">
            <div className="rounded-xl border p-3 bg-white">
              <div className="font-medium">Ano</div>
              <div className="text-sm">Meta anual: <strong>{br(metaAnual)}</strong></div>
              <div className="text-xs text-muted-foreground">Clique nos meses para ver a média diária</div>
            </div>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <div key={m} className="rounded-xl border p-3 bg-white">
                <div className="font-medium">{mesesNomes[m-1]}</div>
                <div className="text-xs text-muted-foreground">Dias: {diasMes[m]||'-'}</div>
                <div className="text-sm">Meta diária média: <strong>{diasMes[m]? br(metaDiariaMedia(m)) : '-'}</strong></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(6)}>Voltar</Button>
            <Button onClick={()=>setStep(8)}>Ir para simulação</Button>
          </div>
        </CardContent></Card>
      )}

      {step===8 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">8) Simulação e escolha de cenário</h4>
          <div className="grid md:grid-cols-4 gap-3">
            <div><Label>Inflação (%)</Label><Input type="number" value={(inflacao*100).toFixed(2)} onChange={(e)=>setInflacao(Math.max(0, parseFloat(e.target.value||'0')/100))} /></div>
            <div><Label>CMED (%)</Label><Input type="number" value={(cmed*100).toFixed(2)} onChange={(e)=>setCmed(Math.max(0, parseFloat(e.target.value||'0')/100))} /></div>
            <div><Label>Part. Meds (%)</Label><Input type="number" value={(partMedicamentos*100).toFixed(1)} onChange={(e)=>setPartMedicamentos(clamp01(parseFloat(e.target.value||'0')/100))} /></div>
            <div><Label>Crescimento (%)</Label><Input type="number" value={(crescimento*100).toFixed(2)} onChange={(e)=>setCrescimento(parseFloat(e.target.value||'0')/100)} /></div>
          </div>
          <div className="text-sm">Meta anual (simulada): <strong>{br(metaAnual)}</strong> • Índice ano: <strong>{pct(taxaComposta)}</strong></div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" onClick={()=>setStep(7)}>Voltar</Button>
            <Button onClick={consolidarPasso8} style={{ background: "#5ee100", color:"#111" }}>Consolidar (travar)</Button>
            <Button variant="outline" onClick={()=>setStep(9)}>Ver consolidação</Button>
          </div>
        </CardContent></Card>
      )}

      {step===9 && (
        <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
          <h4 className="font-semibold">9) Visualização consolidada (drilldown)</h4>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-sm">Meta anual: <strong>{br(metaAnual)}</strong> • Índice ano: <strong>{pct(taxaComposta)}</strong></div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Array.from({length:12},(_,i)=>i+1).map(m=>(
                <div key={m} className="rounded-xl border p-3 bg-white">
                  <div className="font-medium">{mesesNomes[m-1]}</div>
                  <div className="text-xs text-muted-foreground">Meta mês</div>
                  <div className="text-sm font-semibold">{br(metaMensal[m]||0)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setStep(8)}>Voltar</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
