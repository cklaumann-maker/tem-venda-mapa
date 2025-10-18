"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Target, CalendarRange, ShoppingBasket, PiggyBank, Users,
  Heart, Brain, BarChart4, Cog, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Lazy-load das views para evitar qualquer efeito colateral na montagem da HOME
const MetasView = dynamic(() => import("@/components/metas/MetasView"), { ssr: false });
const VendasView = dynamic(() => import("@/components/vendas/VendasView"), { ssr: false });

// Paleta
const brand = { primary: "#5ee100", dark: "#373736" };
const todayStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// Placeholder simples para telas ainda não implementadas
function Placeholder({ title }: { title: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 text-sm text-muted-foreground">
        {title} — em breve.
      </CardContent>
    </Card>
  );
}

// Definição das views
const views = [
  { key: "metas", title: "Metas", icon: Target, desc: "Defina o quanto quer vender", component: <MetasView /> },
  { key: "vendas", title: "Vendas", icon: ShoppingBasket, desc: "Acompanhe o movimento da loja", component: <VendasView /> },
  { key: "campanhas", title: "Campanhas", icon: CalendarRange, desc: "Planeje seus momentos de venda", component: <Placeholder title="Campanhas" /> },
  { key: "financeiro", title: "Financeiro", icon: PiggyBank, desc: "Veja se está sobrando dinheiro", component: <Placeholder title="Financeiro" /> },
  { key: "equipe", title: "Equipe", icon: Users, desc: "Entenda quem mais vende", component: <Placeholder title="Equipe" /> },
  { key: "clientes", title: "Clientes", icon: Heart, desc: "Descubra se estão voltando", component: <Placeholder title="Clientes" /> },
  { key: "insights", title: "Insights e Ações", icon: Brain, desc: "Transforme números em decisões", component: <Placeholder title="Insights e Ações" /> },
  { key: "relatorios", title: "Relatórios", icon: BarChart4, desc: "Compare seu crescimento", component: <Placeholder title="Relatórios" /> },
];

export default function Page() {
  const router = useRouter();

  // 1) Valor inicial fixo: HOME
  const [active, setActive] = useState<string>("home");

  // 2) Na primeira montagem, remove qualquer query (ex.: ?view=metas) e garante "/"
  useEffect(() => {
    // Se a URL não é exatamente "/", substitui por "/"
    if (typeof window !== "undefined") {
      const hasQuery = window.location.search && window.location.search.length > 0;
      const notRoot = window.location.pathname !== "/";
      if (hasQuery || notRoot) {
        router.replace("/"); // força URL limpa e não adiciona histórico
      }
      // Garante state = home (mesmo que algum fast-refresh preserve)
      setActive("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // roda só uma vez

  // Troca de view via UI (atualiza estado e URL)
  const allowedKeys = useMemo(() => new Set(["home", ...views.map(v => v.key)]), []);
  function go(key: string) {
    const k = allowedKeys.has(key) ? key : "home";
    setActive(k);
    // Mantemos a URL sempre limpa; se quiser que apareça ?view=, troque por router.replace(`/?view=${k}`)
    router.replace(k === "home" ? "/" : "/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      {/* HEADER */}
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
            <Button variant="outline" className="gap-2"><Cog className="w-4 h-4" />Configurações</Button>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Exportar relatório</Button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {active === "home" ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Mapa de Estruturação Comercial</h1>
              <p className="text-sm text-muted-foreground">Clique em um bloco para começar. Interface simples, letras grandes e campos claros.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {views.map((v) => (
                <button
                  key={v.key}
                  onClick={() => go(v.key)}
                  className="group rounded-3xl border bg-white/50 hover:bg-white transition shadow-sm hover:shadow-md p-6 text-left w-full focus:outline-none focus:ring-4"
                  style={{ borderColor: "#e5e7eb" }}
                  aria-label={`Abrir ${v.title}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ background: `${brand.primary}22` }}>
                      <v.icon className="w-7 h-7" style={{ color: brand.primary }} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{v.title}</div>
                      <div className="text-sm text-muted-foreground">{v.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => go("home")} className="mb-2">← Voltar</Button>
            {views.find((v) => v.key === active)?.component}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold" style={{ color: brand.dark }}> TEM VENDA</span>
      </footer>
    </div>
  );
}


