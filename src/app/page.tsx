"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  BarChart4,
  Brain,
  CalendarRange,
  Cog,
  Download,
  FileSpreadsheet,
  Heart,
  LayoutGrid,
  LineChart,
  PiggyBank,
  ShieldCheck,
  ShoppingBasket,
  Target,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// -----------------------------------------
// Utilidades
// -----------------------------------------
const todayStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const brand = {
  primary: "#5ee100",
  dark: "#373736",
};

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl" style={{ background: brand.primary + "22" }}>
          <Icon className="w-6 h-6" style={{ color: brand.primary }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, title, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border bg-white/50 hover:bg-white transition shadow-sm hover:shadow-md p-6 text-left w-full focus:outline-none focus:ring-4"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl" style={{ background: brand.primary + "22" }}>
          <span className="sr-only">{title}</span>
          <Icon className="w-7 h-7" style={{ color: brand.primary }} />
        </div>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
    </button>
  );
}

// -----------------------------------------
// Dados mock
// -----------------------------------------
const metasMock = [
  { loja: "Central", categoria: "Medicamentos", meta: 80000, responsavel: "João", inicio: "2025-10-01", fim: "2025-10-31", obs: "Reforçar genéricos" },
  { loja: "Central", categoria: "Perfumaria", meta: 25000, responsavel: "Maria", inicio: "2025-10-01", fim: "2025-10-31", obs: "Ação Dia das Crianças" },
  { loja: "Filial 1", categoria: "Genéricos", meta: 60000, responsavel: "Carlos", inicio: "2025-10-01", fim: "2025-10-31", obs: "Campanha foco genéricos" },
];

const vendasDiaMock = [
  { data: "2025-10-01", entraram: 220, compraram: 160, total: 9800, medicamentos: 4500, genericos: 2000, perfumaria: 3000 },
  { data: "2025-10-02", entraram: 210, compraram: 150, total: 9300, medicamentos: 4200, genericos: 1800, perfumaria: 2900 },
  { data: "2025-10-03", entraram: 240, compraram: 170, total: 10200, medicamentos: 4700, genericos: 2100, perfumaria: 3200 },
];

const rankingMock = [
  { vendedor: "Maria", vendas: 38000, conversao: 0.76 },
  { vendedor: "João", vendas: 32000, conversao: 0.71 },
  { vendedor: "Carlos", vendas: 28000, conversao: 0.69 },
  { vendedor: "Ana", vendas: 21000, conversao: 0.65 },
];

const categoriasMesMock = [
  { name: "Medicamentos", value: 145000 },
  { name: "Genéricos", value: 78000 },
  { name: "Perfumaria", value: 62000 },
  { name: "OTC", value: 41000 },
];

const COLORS = [brand.primary, "#9CA3AF", "#111827", "#E5E7EB"]; // cores neutras + primária

// -----------------------------------------
// Views
// -----------------------------------------
function MetasView() {
  const [metas, setMetas] = useState(metasMock);

  function addLinha() {
    setMetas((m) => [
      ...m,
      { loja: "Nova Loja", categoria: "Medicamentos", meta: 10000, responsavel: "—", inicio: "2025-10-01", fim: "2025-10-31", obs: "" },
    ]);
  }

  function exportCSV() {
    const headers = ["Loja", "Categoria", "Meta (R$)", "Responsável", "Início", "Fim", "Observações"]; 
    const rows = metas.map((r) => [r.loja, r.categoria, r.meta, r.responsavel, r.inicio, r.fim, r.obs]);
    const csv = [headers, ...rows].map((r) => r.join(";"));
    const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metas_temvenda.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Target} title="Metas" subtitle="Defina o quanto quer vender" />

      <div className="flex items-center gap-2">
        <Select defaultValue="categoria">
          <SelectTrigger className="w-56"><SelectValue placeholder="Tipo de meta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="categoria">Por categoria</SelectItem>
            <SelectItem value="vendedor">Por vendedor</SelectItem>
            <SelectItem value="loja">Por loja</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={addLinha} variant="default" style={{ background: brand.primary, color: "#111" }}>Adicionar linha</Button>
        <Button onClick={exportCSV} variant="outline" className="gap-2"><Download className="w-4 h-4"/>Exportar CSV</Button>
      </div>

      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Loja","Categoria","Meta (R$)","Responsável","Início","Fim","Observações"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metas.map((r, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50/60">
                <td className="px-4 py-3"><Input defaultValue={r.loja} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.categoria} /></td>
                <td className="px-4 py-3"><Input type="number" defaultValue={r.meta} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.responsavel} /></td>
                <td className="px-4 py-3"><Input type="date" defaultValue={r.inicio} /></td>
                <td className="px-4 py-3"><Input type="date" defaultValue={r.fim} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.obs} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>
            <strong>Por que desdobrar metas?</strong> Metas claras criam foco. Quando você define por loja, categoria ou vendedor, fica
            simples medir o progresso e ajustar o esforço certo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CampanhasView() {
  const [itens, setItens] = useState([
    { mes: "2025-10", nome: "Dia das Crianças", foco: "Perfumaria", meta: 25000, responsavel: "Maria", status: "Planejada" },
    { mes: "2025-11", nome: "Black Friday", foco: "Todas", meta: 40000, responsavel: "César", status: "Pendente" },
  ]);

  function addCampanha() {
    setItens((v) => [...v, { mes: "2025-12", nome: "Natal", foco: "Dermocosméticos", meta: 30000, responsavel: "Equipe", status: "Planejada" }]);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={CalendarRange} title="Calendário de Campanhas" subtitle="Planeje seus momentos de venda" />
      <div className="flex items-center gap-2">
        <Button onClick={addCampanha} style={{ background: brand.primary, color: "#111" }}>Adicionar campanha</Button>
        <Button variant="outline" className="gap-2"><FileSpreadsheet className="w-4 h-4"/>Exportar planilha</Button>
      </div>

      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Mês","Campanha","Categoria foco","Meta (R$)","Responsável","Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((r, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50/60">
                <td className="px-4 py-3"><Input type="month" defaultValue={r.mes} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.nome} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.foco} /></td>
                <td className="px-4 py-3"><Input type="number" defaultValue={r.meta} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.responsavel} /></td>
                <td className="px-4 py-3"><Input defaultValue={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VendasView() {
  const [tab, setTab] = useState("diario");

  const conversaoDia = useMemo(() => vendasDiaMock.map((d) => ({ data: d.data.slice(8,10)+"/10", conversao: Math.round((d.compraram/d.entraram)*100) })), []);
  const metaVsReal = useMemo(() => [
    { name: "Meta", value: 210000 },
    { name: "Realizado", value: 186000 },
  ], []);

  return (
    <div className="space-y-4">
      <SectionTitle icon={ShoppingBasket} title="Vendas" subtitle="Acompanhe o movimento da loja" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="anual">Anual</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="rounded-2xl"><CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Conversão por dia</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={conversaoDia}>
                  <XAxis dataKey="data"/>
                  <YAxis/>
                  <ReTooltip/>
                  <Bar dataKey="conversao" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>

            <Card className="rounded-2xl md:col-span-2"><CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Lançamentos do dia</h4>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Data","Entraram","Compraram","Conversão","Total (R$)","Medicamentos","Genéricos","Perfumaria"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vendasDiaMock.map((d) => (
                      <tr key={d.data} className="odd:bg-white even:bg-gray-50/60">
                        <td className="px-4 py-3">{d.data}</td>
                        <td className="px-4 py-3">{d.entraram}</td>
                        <td className="px-4 py-3">{d.compraram}</td>
                        <td className="px-4 py-3">{Math.round((d.compraram/d.entraram)*100)}%</td>
                        <td className="px-4 py-3">R$ {d.total.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3">R$ {d.medicamentos.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3">R$ {d.genericos.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3">R$ {d.perfumaria.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="mensal" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="rounded-2xl"><CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Meta x Realizado (R$)</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={metaVsReal}>
                  <XAxis dataKey="name"/>
                  <YAxis/>
                  <ReTooltip/>
                  <Bar dataKey="value" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>

            <Card className="rounded-2xl md:col-span-2"><CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Participação por categoria</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoriasMesMock} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {categoriasMesMock.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}
                  </Pie>
                  <Legend/>
                  <ReTooltip/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </div>

          <Card className="rounded-2xl mt-4"><CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Ranking de vendedores (mês)</h4>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Vendedor","Vendas (R$)","Conversão"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingMock.map((r) => (
                    <tr key={r.vendedor} className="odd:bg-white even:bg-gray-50/60">
                      <td className="px-4 py-3">{r.vendedor}</td>
                      <td className="px-4 py-3">R$ {r.vendas.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">{Math.round(r.conversao*100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="anual" className="mt-4">
          <Card className="rounded-2xl"><CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Evolução anual de faturamento</h4>
            <ResponsiveContainer width="100%" height={220}>
              <RLineChart data={[{mes:"Jan", v:120},{mes:"Fev", v:130},{mes:"Mar", v:110},{mes:"Abr", v:150},{mes:"Mai", v:170},{mes:"Jun", v:160}] }>
                <XAxis dataKey="mes"/>
                <YAxis/>
                <ReTooltip/>
                <Line type="monotone" dataKey="v" strokeWidth={3} dot={false} />
              </RLineChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinanceiroView() {
  const [modo, setModo] = useState("simplificado");
  const [vars, setVars] = useState({ EI: 30000, Compras: 80000, EF: 25000, Vendas: 150000, Despesas: 5000, PMEs: 30, PMR: 28, PMP: 21 });

  const CMV = vars.EI + vars.Compras - vars.EF; // simplificado
  const margemBruta = ((vars.Vendas - CMV) / vars.Vendas) || 0;
  const cicloCaixa = vars.PMEs + vars.PMR - vars.PMP;

  const estoqueMedio = (vars.EI + vars.EF) / 2;
  const giroEstoque = estoqueMedio > 0 ? CMV / estoqueMedio : 0;

  function onVarChange(key: keyof typeof vars, value: number) {
    setVars((v) => ({ ...v, [key]: isNaN(value) ? 0 : value }));
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={PiggyBank} title="Financeiro" subtitle="Veja se está sobrando dinheiro no final do mês" />

      <div className="flex items-center gap-2">
        <Select value={modo} onValueChange={setModo}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="simplificado">Modo simplificado</SelectItem>
            <SelectItem value="completo">Modo completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-2xl"><CardContent className="p-4 grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label>Estoque Inicial</Label>
          <Input type="number" value={vars.EI} onChange={(e)=>onVarChange("EI", parseFloat(e.target.value))} />
          <Label>Compras no período</Label>
          <Input type="number" value={vars.Compras} onChange={(e)=>onVarChange("Compras", parseFloat(e.target.value))} />
          <Label>Estoque Final</Label>
          <Input type="number" value={vars.EF} onChange={(e)=>onVarChange("EF", parseFloat(e.target.value))} />
          <Label>Vendas líquidas</Label>
          <Input type="number" value={vars.Vendas} onChange={(e)=>onVarChange("Vendas", parseFloat(e.target.value))} />
          {modo === "completo" && (
            <>
              <Label>Despesas acessórias (frete, impostos s/compra etc.)</Label>
              <Input type="number" value={vars.Despesas} onChange={(e)=>onVarChange("Despesas", parseFloat(e.target.value))} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>PMEs</Label>
                  <Input type="number" value={vars.PMEs} onChange={(e)=>onVarChange("PMEs", parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>PMR</Label>
                  <Input type="number" value={vars.PMR} onChange={(e)=>onVarChange("PMR", parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>PMP</Label>
                  <Input type="number" value={vars.PMP} onChange={(e)=>onVarChange("PMP", parseFloat(e.target.value))} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-gray-50">
            <div className="text-sm">CMV estimado</div>
            <div className="text-2xl font-semibold">R$ {CMV.toLocaleString("pt-BR")}</div>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50">
            <div className="text-sm">Margem Bruta</div>
            <div className="text-2xl font-semibold">{(margemBruta*100).toFixed(1)}%</div>
          </div>
          {modo === "completo" && (
            <>
              <div className="p-4 rounded-2xl bg-gray-50">
                <div className="text-sm">Giro de Estoque</div>
                <div className="text-2xl font-semibold">{giroEstoque.toFixed(2)}x</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <div className="text-sm">Ciclo de Caixa</div>
                <div className="text-2xl font-semibold">{cicloCaixa.toFixed(0)} dias</div>
              </div>
            </>
          )}
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>Preencha as variáveis para entender <strong>onde ajustar</strong>. O sistema não apenas calcula: ele educa.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function EquipeView() {
  return (
    <div className="space-y-4">
      <SectionTitle icon={Users} title="Equipe" subtitle="Entenda quem mais vende e quem precisa de ajuda" />
      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Vendedor","Vendas (R$)","Conversão","Ticket Médio","Absenteísmo"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankingMock.map((r) => (
              <tr key={r.vendedor} className="odd:bg-white even:bg-gray-50/60">
                <td className="px-4 py-3">{r.vendedor}</td>
                <td className="px-4 py-3">R$ {r.vendas.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3">{Math.round(r.conversao*100)}%</td>
                <td className="px-4 py-3">R$ {(r.vendas/120).toFixed(0)}</td>
                <td className="px-4 py-3">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientesView() {
  return (
    <div className="space-y-4">
      <SectionTitle icon={Heart} title="Clientes" subtitle="Descubra se os clientes estão voltando" />
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardContent className="p-4">
          <Label>NPS (0 a 100)</Label>
          <Input type="number" defaultValue={72} />
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <Label>Índice de recompra (%)</Label>
          <Input type="number" defaultValue={38} />
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <Label>Tempo médio entre compras (dias)</Label>
          <Input type="number" defaultValue={27} />
        </CardContent></Card>
      </div>
    </div>
  );
}

function InsightsAcoesView() {
  const [acoes, setAcoes] = useState([
    { id: 1, titulo: "Renegociar perfumaria", status: "Pendente", responsavel: "João", prazo: "2025-10-20" },
    { id: 2, titulo: "Treinar script OTC", status: "Em andamento", responsavel: "Maria", prazo: "2025-10-12" },
  ]);

  function addAcao() {
    setAcoes((a) => [...a, { id: Date.now(), titulo: "Nova ação", status: "Pendente", responsavel: "—", prazo: "2025-10-30" }]);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Brain} title="Insights & Ações" subtitle="Transforme números em decisões" />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">🟡 Conversão caiu 5% vs mês anterior</div>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">🟢 Ticket médio subiu 8%</div>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">🔴 CMV acima de 70% em Perfumaria</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={addAcao} style={{ background: brand.primary, color: "#111" }}>Adicionar ação</Button>
        <Button variant="outline" className="gap-2"><Download className="w-4 h-4"/>Exportar ações</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { col: "Pendente", color: "bg-red-50" },
          { col: "Em andamento", color: "bg-yellow-50" },
          { col: "Concluído", color: "bg-green-50" },
        ].map((c) => (
          <div key={c.col} className={`rounded-2xl border ${c.color} p-3`}>
            <div className="font-semibold mb-2">{c.col}</div>
            <div className="space-y-2">
              {acoes.filter((a) => a.status === c.col).map((a) => (
                <div key={a.id} className="rounded-xl bg-white p-3 shadow-sm border">
                  <div className="font-medium">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground">Resp.: {a.responsavel} • Prazo: {a.prazo}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAcoes((as)=> as.map(x=> x.id===a.id?{...x,status:"Em andamento"}:x))}>Mover → Andamento</Button>
                    <Button size="sm" variant="outline" onClick={() => setAcoes((as)=> as.map(x=> x.id===a.id?{...x,status:"Concluído"}:x))}>Concluir</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatoriosView() {
  return (
    <div className="space-y-4">
      <SectionTitle icon={BarChart4} title="Relatórios & Histórico" subtitle="Compare seu crescimento" />
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">Relatório mensal em PDF</div>
          <Button variant="outline" className="mt-3 w-full">Gerar PDF</Button>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">Exportar dados (XLSX)</div>
          <Button variant="outline" className="mt-3 w-full">Exportar XLSX</Button>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4">
          <div className="text-sm">Importar histórico (até 2 anos)</div>
          <Button variant="outline" className="mt-3 w-full">Importar arquivo</Button>
        </CardContent></Card>
      </div>
    </div>
  );
}

// -----------------------------------------
// App principal
// -----------------------------------------
const views = [
  { key: "metas", title: "Metas", icon: Target, desc: "Defina o quanto quer vender", component: <MetasView /> },
  { key: "campanhas", title: "Campanhas", icon: CalendarRange, desc: "Planeje seus momentos de venda", component: <CampanhasView /> },
  { key: "vendas", title: "Vendas", icon: ShoppingBasket, desc: "Acompanhe o movimento da loja", component: <VendasView /> },
  { key: "financeiro", title: "Financeiro", icon: PiggyBank, desc: "Veja se está sobrando dinheiro", component: <FinanceiroView /> },
  { key: "equipe", title: "Equipe", icon: Users, desc: "Entenda quem mais vende", component: <EquipeView /> },
  { key: "clientes", title: "Clientes", icon: Heart, desc: "Descubra se estão voltando", component: <ClientesView /> },
  { key: "insights", title: "Insights e Ações", icon: Brain, desc: "Transforme números em decisões", component: <InsightsAcoesView /> },
  { key: "relatorios", title: "Relatórios", icon: BarChart4, desc: "Compare seu crescimento", component: <RelatoriosView /> },
];

export default function TemVendaDashboard() {
  const [active, setActive] = useState("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: brand.primary }}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">Farmácia Exemplo</div>
              <div className="text-xs text-muted-foreground">Cuidar de você é o que nos move</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <div className="text-muted-foreground">{todayStr}</div>
            <Button variant="outline" className="gap-2"><Cog className="w-4 h-4"/>Configurações</Button>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4"/>Exportar relatório</Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {active === "home" ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Mapa de Estruturação Comercial</h1>
              <p className="text-sm text-muted-foreground">Clique em um bloco para começar. Interface simples, letras grandes e campos claros.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {views.map((v) => (
                <Tile key={v.key} icon={v.icon} title={v.title} desc={v.desc} onClick={()=>setActive(v.key)} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" onClick={()=>setActive("home")} className="mb-2">← Voltar</Button>
            {views.find((v)=>v.key===active)?.component}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold" style={{ color: brand.dark }}> TEM VENDA</span>
      </footer>
    </div>
  );
}

