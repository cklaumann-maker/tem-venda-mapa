
"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";

type LinhaMeta = { ano:number; mes:number; loja:string; cidade?:string; estado?:string; venda_total:number };
type LinhaVenda = { data:string; loja:string; cidade?:string; estado?:string; venda_total:number };

const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const br = (n:number)=> "R$ " + (n||0).toLocaleString("pt-BR");

function parseCSV(text:string){
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(",").map(h=>h.trim().toLowerCase());
  return { header, lines };
}

function downloadText(filename:string, content:string){
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
}

export default function VendasView(){
  // Escopo e chave
  const [escopo, setEscopo] = useState<"empresa"|"loja"|"cidade"|"estado">("empresa");
  const [chave, setChave] = useState<string>("");

  // Dados
  const [metas, setMetas] = useState<LinhaMeta[]>([]);
  const [vendas, setVendas] = useState<LinhaVenda[]>([]);
  const [carregandoBanco, setCarregandoBanco] = useState(false);

  // Upload metas CSV
  function importarMetas(file: File){
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const { header, lines } = parseCSV(text);
      if (!header) return;
      const idxAno = header.indexOf("ano");
      const idxMes = header.indexOf("mes");
      const idxLoja = header.indexOf("loja");
      const idxCidade = header.indexOf("cidade");
      const idxEstado = header.indexOf("estado");
      const idxVenda = header.indexOf("venda_total");
      const arr: LinhaMeta[] = [];
      for (const line of lines){
        const c = line.split(",");
        const row: LinhaMeta = {
          ano: parseInt(c[idxAno]||"0"),
          mes: parseInt(c[idxMes]||"0"),
          loja: (c[idxLoja]||"").trim(),
          cidade: idxCidade>=0 ? (c[idxCidade]||"").trim() : undefined,
          estado: idxEstado>=0 ? (c[idxEstado]||"").trim() : undefined,
          venda_total: parseFloat((c[idxVenda]||"0").replace(/\./g,"").replace(",", ".")),
        };
        if (row.ano && row.mes && row.loja) arr.push(row);
      }
      setMetas(arr);
    };
    reader.readAsText(file);
  }

  // Upload vendas diárias
  function importarVendas(file: File){
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const { header, lines } = parseCSV(text);
      if (!header) return;
      const idxData = header.indexOf("data");
      const idxLoja = header.indexOf("loja");
      const idxCidade = header.indexOf("cidade");
      const idxEstado = header.indexOf("estado");
      const idxVenda = header.indexOf("venda_total");
      const arr: LinhaVenda[] = [];
      for (const line of lines){
        const c = line.split(",");
        const row: LinhaVenda = {
          data: (c[idxData]||"").trim(),
          loja: (c[idxLoja]||"").trim(),
          cidade: idxCidade>=0 ? (c[idxCidade]||"").trim() : undefined,
          estado: idxEstado>=0 ? (c[idxEstado]||"").trim() : undefined,
          venda_total: parseFloat((c[idxVenda]||"0").replace(/\./g,"").replace(",", ".")),
        };
        if (row.data && row.loja) arr.push(row);
      }
      setVendas(arr);
    };
    reader.readAsText(file);
  }

  // Carregar metas do Supabase (ano mais recente)
  async function carregarMetasDoBanco(){
    try{
      setCarregandoBanco(true);
      const supa = supabaseClient();
      // Busca tudo e decide o ano mais recente no cliente
      const { data, error } = await supa
        .from("metas_mensais")
        .select("ano,mes,meta,lojas:loja_id(nome,cidade,estado)");
      if (error) throw error;
      const rows = (data||[]).filter((r:any)=>r.lojas && r.lojas.nome);
      if (!rows.length){ alert("Nenhuma meta encontrada no banco."); return; }
      const anos = Array.from(new Set(rows.map((r:any)=> r.ano))).sort((a:number,b:number)=>a-b);
      const anoMaisRecente = anos[anos.length-1];

      const arr: LinhaMeta[] = rows
        .filter((r:any)=> r.ano === anoMaisRecente)
        .map((r:any)=> ({
          ano: r.ano,
          mes: r.mes,
          loja: r.lojas.nome as string,
          cidade: r.lojas.cidade || undefined,
          estado: r.lojas.estado || undefined,
          venda_total: r.meta as number, // meta -> venda_total para compatibilidade
        }));

      if (!arr.length){ alert(`Não há metas para o ano ${anoMaisRecente}.`); return; }
      setMetas(arr);
      alert(`Metas carregadas do banco para o ano ${anoMaisRecente}.`);
    } catch(e:any){
      console.error(e);
      alert("Erro ao carregar metas do banco. Veja o console.");
    } finally{
      setCarregandoBanco(false);
    }
  }

  const anoAtivo = useMemo(()=>{
    if (metas.length){
      const anos = [...new Set(metas.map(m=>m.ano))].sort((a,b)=>a-b);
      return anos[anos.length-1];
    }
    return new Date().getFullYear();
  },[metas]);

  // chaves para seletor
  const chaves = useMemo(()=>{
    if (escopo==="empresa") return [];
    const base = escopo==="loja" ? metas.map(m=>m.loja) : escopo==="cidade" ? metas.map(m=>m.cidade||"") : metas.map(m=>m.estado||"");
    return [...new Set(base)].filter(Boolean).sort();
  },[escopo, metas]);

  // filtros
  function matchEscopoMeta(m: LinhaMeta){
    if (escopo==="empresa") return m.ano===anoAtivo;
    if (escopo==="loja")   return m.ano===anoAtivo && m.loja===chave;
    if (escopo==="cidade") return m.ano===anoAtivo && (m.cidade||"")===chave;
    return m.ano===anoAtivo && (m.estado||"")===chave;
  }
  function matchEscopoVenda(v: LinhaVenda){
    const ano = parseInt(v.data.slice(0,4)||"0");
    if (escopo==="empresa") return ano===anoAtivo;
    if (escopo==="loja")   return ano===anoAtivo && v.loja===chave;
    if (escopo==="cidade") return ano===anoAtivo && (v.cidade||"")===chave;
    return ano===anoAtivo && (v.estado||"")===chave;
  }

  const kpiMeta = useMemo(()=> metas.filter(matchEscopoMeta).reduce((s,m)=>s+m.venda_total,0), [metas, escopo, chave, anoAtivo]);
  const kpiReal = useMemo(()=> vendas.filter(matchEscopoVenda).reduce((s,v)=>s+v.venda_total,0), [vendas, escopo, chave, anoAtivo]);
  const kpiGap = kpiReal - kpiMeta;
  const kpiPct = kpiMeta ? (kpiReal / kpiMeta) : 0;

  // Mensal: soma meta (de metas) e realizado (de vendas) por mês
  const mensal = useMemo(()=>{
    const metaPorMes: Record<number, number> = {};
    const realPorMes: Record<number, number> = {};
    for (let m=1;m<=12;m++){ metaPorMes[m]=0; realPorMes[m]=0; }
    metas.filter(matchEscopoMeta).forEach(m=>{ metaPorMes[m.mes] += m.venda_total; });
    vendas.filter(matchEscopoVenda).forEach(v=>{
      const mes = parseInt(v.data.slice(5,7)||"0");
      if (mes>=1 && mes<=12) realPorMes[mes] += v.venda_total;
    });
    return { metaPorMes, realPorMes };
  },[metas, vendas, escopo, chave, anoAtivo]);

  const exemploMetas = `ano,mes,loja,cidade,estado,venda_total
${new Date().getFullYear()},1,Loja Central,São Paulo,SP,90000
${new Date().getFullYear()},1,Filial 1,Campinas,SP,70000
${new Date().getFullYear()},2,Loja Central,São Paulo,SP,88000
${new Date().getFullYear()},2,Filial 1,Campinas,SP,68000
`;
  const exemploVendas = `data,loja,cidade,estado,venda_total
${new Date().getFullYear()}-01-01,Loja Central,São Paulo,SP,3500
${new Date().getFullYear()}-01-01,Filial 1,Campinas,SP,2700
${new Date().getFullYear()}-01-02,Loja Central,São Paulo,SP,4200
${new Date().getFullYear()}-01-02,Filial 1,Campinas,SP,2900
`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Escopo</Label>
          <Select value={escopo} onValueChange={(v:any)=>{ setEscopo(v); setChave(""); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="loja">Loja</SelectItem>
              <SelectItem value="cidade">Cidade</SelectItem>
              <SelectItem value="estado">Estado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {escopo!=="empresa" && (
          <div>
            <Label>{escopo[0].toUpperCase()+escopo.slice(1)}</Label>
            <Select value={chave} onValueChange={setChave}>
              <SelectTrigger className="w-60"><SelectValue placeholder={`Selecione ${escopo}`} /></SelectTrigger>
              <SelectContent>
                {chaves.map(c=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
        <h4 className="font-semibold">Importar / Carregar metas</h4>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label>Metas (CSV) — formato: ano,mes,loja,cidade,estado,venda_total</Label>
            <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importarMetas(f); }} />
            <div className="mt-2"><Button variant="outline" onClick={()=>downloadText("exemplo_metas.csv", exemploMetas)}>Baixar exemplo</Button></div>
          </div>
          <div className="flex items-end">
            <Button onClick={carregarMetasDoBanco} disabled={carregandoBanco}>
              {carregandoBanco ? "Carregando..." : "Carregar metas do banco (Supabase)"}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div>
            <Label>Vendas diárias (CSV) — formato: data,loja,cidade,estado,venda_total</Label>
            <Input type="file" accept=".csv" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importarVendas(f); }} />
            <div className="mt-2"><Button variant="outline" onClick={()=>downloadText("exemplo_vendas_diarias.csv", exemploVendas)}>Baixar exemplo</Button></div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Ano ativo: <strong>{anoAtivo}</strong></div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-3">KPIs (ano)</h4>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-muted-foreground">Meta</div>
            <div className="text-lg font-semibold">{br(kpiMeta)}</div>
          </div>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-muted-foreground">Realizado</div>
            <div className="text-lg font-semibold">{br(kpiReal)}</div>
          </div>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-muted-foreground">Δ vs Meta</div>
            <div className="text-lg font-semibold">{br(kpiGap)}</div>
          </div>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-muted-foreground">% Atingimento</div>
            <div className="text-lg font-semibold">{(kpiPct*100).toFixed(1)}%</div>
          </div>
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-3">Meta × Realizado por mês</h4>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {Array.from({length:12},(_,i)=>i+1).map(m=>{
            const meta = mensal.metaPorMes[m]||0;
            const real = mensal.realPorMes[m]||0;
            const pct = meta ? (real/meta) : 0;
            return (
              <div key={m} className="rounded-lg border p-3 bg-white">
                <div className="text-sm font-medium">{meses[m-1]}</div>
                <div className="text-xs text-muted-foreground">Meta</div>
                <div className="font-semibold">{br(meta)}</div>
                <div className="text-xs text-muted-foreground mt-1">Realizado</div>
                <div className="font-semibold">{br(real)}</div>
                <div className="text-xs text-muted-foreground mt-1">% Ating.</div>
                <div className="font-semibold">{(pct*100).toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Lançamentos diários</h4>
        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Data","Loja","Cidade","Estado","Valor (R$)"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendas.filter(matchEscopoVenda).map((v,i)=>(
                <tr key={i} className="odd:bg-white even:bg-gray-50/60">
                  <td className="px-4 py-3">{v.data}</td>
                  <td className="px-4 py-3">{v.loja}</td>
                  <td className="px-4 py-3">{v.cidade}</td>
                  <td className="px-4 py-3">{v.estado}</td>
                  <td className="px-4 py-3">{br(v.venda_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}

