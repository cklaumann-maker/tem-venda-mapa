"use client";
import React, { useState } from "react";
import VendasView from "@/components/vendas/VendasView";
import { ShieldCheck, Target, CalendarRange, ShoppingBasket, PiggyBank, Users, Heart, Brain, BarChart4, Cog, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Tile from "@/components/common/Tile";
import SectionTitle from "@/components/common/SectionTitle";
import MetasView from "@/components/metas/MetasView";
import { brand } from "@/lib/brand";

const todayStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function Placeholder({title}:{title:string}){
  return (
    <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">
      {title} — em breve.
    </CardContent></Card>
  )
}

const views = [{ key: "metas", title: "Metas", icon: Target, desc: "Defina o quanto quer vender", component: <MetasView /> },
  ,
  { key: "vendas", title: "Vendas", icon: ShoppingBasket, desc: "Acompanhe o movimento da loja", component: <VendasView /> },
  ,
  { key: "campanhas", title: "Campanhas", icon: CalendarRange, desc: "Planeje seus momentos de venda", component: <Placeholder title="Campanhas" /> },
  ,
  { key: "financeiro", title: "Financeiro", icon: PiggyBank, desc: "Veja se está sobrando dinheiro", component: <Placeholder title="Financeiro" /> },
  ,
  ,
  { key: "clientes", title: "Clientes", icon: Heart, desc: "Descubra se estão voltando", component: <Placeholder title="Clientes" /> },
  ,
  { key: "insights", title: "Insights e Ações", icon: Brain, desc: "Transforme números em decisões", component: <Placeholder title="Insights e Ações" /> },
  ,
  { key: "relatorios", title: "Relatórios", icon: BarChart4, desc: "Compare seu crescimento", component: <Placeholder title="Relatórios" /> }];

export default function Page(){
  const [active, setActive] = useState("metas");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
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
            {views.find((v)=>v && v.key===active)?.component}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold" style={{ color: brand.dark }}> TEM VENDA</span>
      </footer>
    </div>
  );
}
