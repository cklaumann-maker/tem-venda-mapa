"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Target, CalendarRange, ShoppingBasket, PiggyBank, Users,
  Heart, Brain, BarChart4, Cog, Download, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import UserMenu from "@/components/auth/UserMenu";
import Logo from "@/components/common/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StoreProvider, useStore } from "@/contexts/StoreContext";

// Lazy-load das views para evitar qualquer efeito colateral na montagem da HOME
const MetasView = dynamic(() => import("@/components/metas/MetasView"), { ssr: false });
const VendasView = dynamic(() => import("@/components/vendas/VendasView"), { ssr: false });
const EquipeView = dynamic(() => import("@/components/equipe/EquipeView"), { ssr: false });

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
  { key: "equipe", title: "Equipe", icon: Users, desc: "Sistema de formulários e gestão", component: <EquipeView /> },
  { key: "clientes", title: "Clientes", icon: Heart, desc: "Descubra se estão voltando", component: <Placeholder title="Clientes" /> },
  { key: "insights", title: "Insights e Ações", icon: Brain, desc: "Transforme números em decisões", component: <Placeholder title="Insights e Ações" /> },
  { key: "relatorios", title: "Relatórios", icon: BarChart4, desc: "Compare seu crescimento", component: <Placeholder title="Relatórios" /> },
];

export default function Page() {
  return (
    <ProtectedRoute>
      <StoreProvider>
        <DashboardShell />
      </StoreProvider>
    </ProtectedRoute>
  );
}

function DashboardShell() {
  const router = useRouter();
  const { loading: storeLoading, stores, currentStore, setCurrentStoreId, isAdmin } = useStore();

  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasQuery = window.location.search && window.location.search.length > 0;
      const notRoot = window.location.pathname !== "/";
      if (hasQuery || notRoot) {
        router.replace("/");
      }
      setActive("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowedKeys = useMemo(() => new Set(["home", ...views.map((v) => v.key)]), []);

  function go(key: string) {
    const k = allowedKeys.has(key) ? key : "home";
    setActive(k);
    router.replace(k === "home" ? "/" : "/");
  }

  const storeRoleLabel = currentStore?.storeRole
    ? currentStore.storeRole === "manager"
      ? "Gerente"
      : currentStore.storeRole === "leader"
      ? "Líder"
      : currentStore.storeRole === "seller"
      ? "Vendedor"
      : currentStore.storeRole === "finance"
      ? "Financeiro"
      : currentStore.storeRole === "admin"
      ? "Admin"
      : "Colaborador"
    : isAdmin
    ? "Administrador"
    : null;

  if (storeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border bg-white shadow-sm">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando lojas disponíveis...</p>
        </div>
      </div>
    );
  }

  if (!stores.length || !currentStore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-md text-center space-y-3 bg-white border rounded-2xl p-8 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-xl font-semibold">Acesso em configuração</h2>
          <p className="text-sm text-muted-foreground">
            Não encontramos nenhuma loja vinculada ao seu usuário. Peça ao administrador ou gerente responsável para concluir o cadastro.
          </p>
          <Button onClick={() => go("home")} className="bg-green-600 hover:bg-green-700 text-white">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex items-center gap-4 lg:gap-6">
            <Logo width={120} height={48} className="lg:w-[140px] lg:h-[56px]" />
            <div className="hidden sm:block">
              <div className="font-semibold text-base lg:text-lg">Sistema de Gestão Comercial</div>
              <div className="text-xs lg:text-sm text-muted-foreground">Selecione a loja para visualizar os dados</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium w-full sm:w-auto text-center sm:text-left">
                {todayStr}
              </div>
              <div className="hidden md:flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 hover:bg-green-50 hover:border-green-200 transition-colors">
                  <Cog className="w-4 h-4" />Configurações
                </Button>
                <Button variant="outline" size="sm" className="gap-2 hover:bg-green-50 hover:border-green-200 transition-colors">
                  <Download className="w-4 h-4" />Exportar
                </Button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Loja selecionada</div>
              {stores.length > 1 || isAdmin ? (
                <Select
                  value={currentStore.id}
                  onValueChange={(value) => {
                    void setCurrentStoreId(value);
                  }}
                >
                  <SelectTrigger className="w-full md:w-64 bg-white">
                    <SelectValue placeholder="Escolha a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 bg-white border rounded-lg text-sm font-medium">
                  {currentStore.name}
                </div>
              )}
              {storeRoleLabel && (
                <div className="text-xs text-muted-foreground text-center md:text-left">
                  Permissão: <span className="font-semibold text-gray-900">{storeRoleLabel}</span>
                </div>
              )}
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {active === "home" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Mapa de Estruturação Comercial</h1>
              <p className="text-base text-muted-foreground mb-6">
                Clique em um bloco para começar. Interface simples, letras grandes e campos claros.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">R$ 2.4M</div>
                      <div className="text-sm text-gray-600">Meta Anual</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <ShoppingBasket className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">R$ 1.8M</div>
                      <div className="text-sm text-gray-600">Realizado</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <BarChart4 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">75%</div>
                      <div className="text-sm text-gray-600">Atingimento</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">12</div>
                      <div className="text-sm text-gray-600">Lojas Ativas</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {views.map((v) => (
                <button
                  key={v.key}
                  onClick={() => go(v.key)}
                  className="group rounded-2xl border-2 border-gray-100 bg-white hover:border-green-200 hover:bg-green-50 transition-all duration-300 shadow-sm hover:shadow-lg p-4 lg:p-6 text-left w-full focus:outline-none focus:ring-4 focus:ring-green-100 transform hover:scale-105"
                  aria-label={`Abrir ${v.title}`}
                >
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div className="p-3 lg:p-4 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                      <v.icon className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg lg:text-xl font-bold text-gray-900 group-hover:text-green-800 transition-colors">
                        {v.title}
                      </div>
                      <div className="text-xs lg:text-sm text-gray-600 mt-1">{v.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <button
                onClick={() => go("home")}
                className="hover:text-green-600 transition-colors flex items-center gap-1"
              >
                🏠 Home
              </button>
              <span>›</span>
              <span className="font-medium text-gray-900">
                {views.find((v) => v.key === active)?.title}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => go("home")}
              className="mb-4 hover:bg-green-50 hover:border-green-200 transition-colors"
            >
              ← Voltar para Home
            </Button>
            {views.find((v) => v.key === active)?.component}
          </div>
        )}
      </main>

      <footer className="py-8 text-center border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo width={80} height={32} />
              <span className="text-sm text-muted-foreground">Sistema de Gestão Comercial</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold" style={{ color: brand.dark }}> TEM VENDA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

