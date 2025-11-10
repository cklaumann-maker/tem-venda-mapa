"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Target,
  CalendarRange,
  ShoppingBasket,
  PiggyBank,
  Users,
  Heart,
  Brain,
  BarChart4,
  Cog,
  Download,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users2,
  Activity,
  PackageSearch,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import UserMenu from "@/components/auth/UserMenu";
import Logo from "@/components/common/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";

// Lazy-load das views para evitar qualquer efeito colateral na montagem da HOME
const MetasView = dynamic(() => import("@/components/metas/MetasView"), { ssr: false });
const VendasView = dynamic(() => import("@/components/vendas/VendasView"), { ssr: false });
const EquipeView = dynamic(() => import("@/components/equipe/EquipeView"), { ssr: false });

// Paleta
const brand = { primary: "#16a34a", dark: "#14532d" };

const storeHeroBackgrounds: Record<string, string> = {
  teste1:
    "https://ltsbfcnlfpzsbfqwmazx.supabase.co/storage/v1/object/public/company-logos/bc70940d-8995-4669-91a7-94f86b22cf6d/1762636517805.jpg",
  teste2:
    "https://ltsbfcnlfpzsbfqwmazx.supabase.co/storage/v1/object/public/company-logos/63447f3f-0496-4851-8321-fb1bbdc47a55/1762636717822.jpg",
};

const storeBrandColorOverrides: Record<string, { primary: string; secondary: string }> = {
  "ac farma": {
    primary: "#1479C1",
    secondary: "#2B9AE6",
  },
  "sempre real": {
    primary: "#6F1AA5",
    secondary: "#9D4ED8",
  },
};

function hexToRgba(hex: string, alpha = 1) {
  if (!hex) return `rgba(94, 225, 0, ${alpha})`;
  let sanitized = hex.replace("#", "");
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (sanitized.length !== 6) return `rgba(94, 225, 0, ${alpha})`;
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgbObject(hex: string) {
  let sanitized = hex.replace("#", "");
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (sanitized.length !== 6) return { r: 255, g: 255, b: 255 };
  const bigint = parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function lightenColor(hex: string, amount = 0.2) {
  const { r, g, b } = hexToRgbObject(hex);
  const lighten = (channel: number) => Math.min(255, Math.floor(channel + (255 - channel) * amount));
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
}

function darkenColor(hex: string, amount = 0.2) {
  const { r, g, b } = hexToRgbObject(hex);
  const darken = (channel: number) => Math.max(0, Math.floor(channel * (1 - amount)));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
}

function getReadableTextColor(hex: string) {
  const { r, g, b } = hexToRgbObject(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

// Placeholder simples para telas ainda não implementadas
function Placeholder({ title }: { title: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 text-sm text-muted-foreground">{title} — em breve.</CardContent>
    </Card>
  );
}

type ExtraRoute = {
  title: string;
  component: React.ReactNode;
  path: string;
};

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

type DashboardPageProps = {
  initialView?: string;
  extraRoutes?: Record<string, ExtraRoute>;
};

export function DashboardPage({ initialView = "home", extraRoutes }: DashboardPageProps) {
  return <DashboardShell initialView={initialView} extraRoutes={extraRoutes} />;
}

export default function Page() {
  return <DashboardShell initialView="home" />;
}

type DashboardShellProps = {
  initialView?: string;
  extraRoutes?: Record<string, ExtraRoute>;
};

function DashboardShell({ initialView = "home", extraRoutes }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: storeLoading, stores, currentStore, setCurrentStoreId, isAdmin } = useStore();
  const [active, setActive] = useState<string>(initialView);
  const [dateTimeLabel, setDateTimeLabel] = useState(() => formatDateTime());

  const viewRoutes = useMemo(() => {
    const baseRoutes: Record<string, string> = {
      home: "/",
      metas: "/metas",
      vendas: "/vendas",
      campanhas: "/campanhas",
      financeiro: "/financeiro",
      equipe: "/equipe",
      clientes: "/clientes",
      insights: "/insights",
      relatorios: "/relatorios",
      configuracoes: "/configuracoes",
      "painel-classico": "/painel-classico",
    };

    if (extraRoutes) {
      Object.entries(extraRoutes).forEach(([key, route]) => {
        baseRoutes[key] = route.path;
      });
    }

    return baseRoutes;
  }, [extraRoutes]);

  useEffect(() => {
    const matchEntry = Object.entries(viewRoutes).find(([, path]) => path === pathname);
    if (matchEntry) {
      setActive(matchEntry[0]);
    } else {
      setActive(initialView);
    }
  }, [pathname, initialView, viewRoutes]);

  function formatDateTime() {
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDateTimeLabel(formatDateTime());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const storeTitle = currentStore?.name ?? "Sem loja";
  const canSelectStore = isAdmin || stores.length > 1;

  const allowedKeys = useMemo(() => {
    const keys = new Set<string>(["home", "configuracoes", "painel-classico", ...views.map((v) => v.key)]);
    if (extraRoutes) {
      Object.keys(extraRoutes).forEach((key) => keys.add(key));
    }
    return keys;
  }, [extraRoutes]);

  const go = useCallback(
    (key: string) => {
      const k = allowedKeys.has(key) ? key : "home";
      setActive(k);
      const targetRoute = viewRoutes[k as keyof typeof viewRoutes];
      if (targetRoute && pathname !== targetRoute) {
        router.push(targetRoute);
      }
    },
    [allowedKeys, viewRoutes, pathname, router]
  );

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

  const storeKey = currentStore?.name?.trim().toLowerCase() ?? "";
  const coverImageUrl =
    storeHeroBackgrounds[storeKey] ??
    currentStore?.branding?.coverImageUrl ??
    currentStore?.logoUrl ??
    null;

  const primaryColor = brand.primary;
  const secondaryColor = "#166534";
  const heroTitle = "Mapa de Estruturação Comercial";
  const heroSubtitle =
    "Organize metas, acompanhe vendas e impulsione o desempenho da sua empresa em uma única experiência personalizada.";

  const primarySurface = hexToRgba(primaryColor, 0.12);
  const primaryBorder = hexToRgba(primaryColor, 0.3);
  const heroPrimaryColor = currentStore?.branding?.primaryColor ?? primaryColor;
  const heroSecondaryColor =
    currentStore?.branding?.secondaryColor ?? lightenColor(heroPrimaryColor, 0.35);
  const heroTextColor = getReadableTextColor(heroPrimaryColor);
  const heroAccentColor = heroTextColor === "#ffffff" ? lightenColor("#ffffff", 0) : darkenColor(heroPrimaryColor, 0.35);
  const heroGradient = heroPrimaryColor;

  const heroBackground = coverImageUrl
    ? `linear-gradient(0deg, rgba(14, 23, 32, 0.58), rgba(14, 23, 32, 0.58)), url(${coverImageUrl})`
    : heroGradient;

  const metrics = [
    {
      label: "Vendas de hoje",
      value: "R$ 48.200",
      helper: "Meta diária R$ 52.000",
      delta: "+8,4%",
      trend: "up" as const,
      deltaTooltip: "Comparativo com o mesmo dia da semana passada",
    },
    {
      label: "Ticket médio",
      value: "R$ 72,40",
      helper: "Ontem: R$ 68,10",
      delta: "+6,3%",
      trend: "up" as const,
      deltaTooltip: "Variação em relação ao ticket médio de ontem",
    },
    {
      label: "Clientes atendidos",
      value: "642",
      helper: "Meta diária 680 clientes",
      delta: "-5,6%",
      trend: "down" as const,
      deltaTooltip: "Diferença versus meta diária de clientes",
    },
    {
      label: "Meta mensal",
      value: "72% atingidos",
      helper: "Faltam R$ 120.000 para o objetivo",
      delta: "+12,1%",
      trend: "up" as const,
      deltaTooltip: "Evolução comparada ao mesmo período do mês anterior",
    },
  ];

  const alerts = [
    {
      title: "Meta de novembro",
      description: "Faltam R$ 120.000 para atingir 100% — foco em genéricos e perfumaria.",
      icon: Target,
      tone: "info" as const,
    },
    {
      title: "Estoque crítico",
      description: "3 SKUs essenciais abaixo do mínimo. Revise pedido da distribuidora.",
      icon: PackageSearch,
      tone: "alert" as const,
    },
    {
      title: "Equipe",
      description: "Reforçar campanha OTC com o time do turno B no pico das 17h.",
      icon: Users2,
      tone: "info" as const,
    },
  ];

  const quickActionViews = views.filter((view) => view.key !== "home");

  const currentHour = new Date().getHours();
  const greetingBase =
    currentHour >= 5 && currentHour < 12
      ? "Bom dia"
      : currentHour >= 12 && currentHour < 18
      ? "Boa tarde"
      : "Boa noite";
  const greetingMessage = `${greetingBase}, ${storeTitle}!`;

  const legacyHome = (
    <>
      <div
        className="mb-10 relative overflow-hidden rounded-3xl border shadow-sm px-6 py-8 sm:px-10 sm:py-12 text-white"
        style={{
          background: heroBackground,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderColor: primaryBorder,
          boxShadow: `0 20px 45px ${hexToRgba(primaryColor, 0.22)}`,
        }}
      >
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
            {storeTitle}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{heroTitle}</h1>
          <p className="text-base sm:text-lg text-white/85">{heroSubtitle}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Acesso seguro e filtrado por loja
            </span>
            <span className="inline-flex items-center gap-2">
              <BarChart4 className="w-4 h-4" />
              Insights guiados pelos seus números
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickActionViews.map((v) => (
          <button
            key={v.key}
            onClick={() => go(v.key)}
            className="group rounded-2xl border-2 border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-300 shadow-sm hover:shadow-lg p-4 lg:p-6 text-left w-full focus:outline-none focus:ring-4 focus:ring-emerald-100 transform hover:scale-[1.01]"
            aria-label={`Abrir ${v.title}`}
          >
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="p-3 lg:p-4 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                <v.icon className="w-6 h-6 lg:w-8 lg:h-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-lg lg:text-xl font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                  {v.title}
                </div>
                <div className="text-xs lg:text-sm text-gray-600 mt-1">{v.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );

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
          <Button
            onClick={() => go("home")}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const currentView = views.find((v) => v.key === active);
  const customRoute = extraRoutes?.[active];
  const isLegacyHome = active === "painel-classico";
  const currentTitle = isLegacyHome
    ? "Painel clássico"
    : currentView?.title ?? customRoute?.title ?? "Configurações";
  const currentContent = isLegacyHome ? legacyHome : currentView?.component ?? customRoute?.component ?? null;
  const backHref =
    active === "configuracoes" ? "/" : active.startsWith("configuracoes") ? "/configuracoes" : "/";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              type="button"
              onClick={() => go("home")}
              className="focus:outline-none"
              aria-label="Ir para home"
            >
              <Logo width={32} height={32} />
            </button>
            <div
              className="w-9 h-9 rounded-full border bg-white flex items-center justify-center overflow-hidden"
              style={{ borderColor: primaryBorder }}
            >
              {currentStore?.logoUrl ? (
                <Image src={currentStore.logoUrl} alt={storeTitle} width={36} height={36} className="object-cover" />
              ) : (
                <span className="font-semibold" style={{ color: primaryColor }}>
                  {storeTitle[0] ?? "?"}
                </span>
              )}
            </div>
            {canSelectStore ? (
              <div className="flex items-center gap-2">
                <Select
                  value={currentStore?.id}
                  onValueChange={(value) => {
                    void setCurrentStoreId(value);
                  }}
                >
                  <SelectTrigger className="w-48 bg-white h-9">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {storeRoleLabel && <span className="hidden sm:inline text-xs text-muted-foreground">{storeRoleLabel}</span>}
              </div>
            ) : (
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-gray-900 truncate">{storeTitle}</span>
                {storeRoleLabel && <span className="text-xs text-muted-foreground">{storeRoleLabel}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold border mx-auto sm:mx-0 whitespace-nowrap"
              style={{
                backgroundColor: primarySurface,
                color: primaryColor,
                borderColor: primaryBorder,
              }}
            >
              {dateTimeLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => {
                if (pathname !== "/configuracoes") {
                  router.push("/configuracoes");
                }
              }}
              aria-label="Abrir configurações"
            >
              <Cog className="w-5 h-5" />
            </Button>
            <div className="hidden md:flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (pathname !== "/configuracoes") {
                    router.push("/configuracoes");
                  }
                }}
              >
                <Cog className="w-4 h-4" /> Configurações
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {active === "home" ? (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-3xl border shadow-lg" style={{ color: "#0f172a" }}>
              {currentStore?.logoUrl ? (
                <>
                  <div
                    className="absolute inset-0 opacity-[0.75] pointer-events-none select-none"
                    style={{
                      backgroundImage: `url(${currentStore.logoUrl})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </>
              ) : (
                coverImageUrl && (
                  <>
                    <div
                      className="absolute inset-0 opacity-[0.75] pointer-events-none select-none"
                      style={{
                        backgroundImage: `url(${coverImageUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  </>
                )
              )}
              <div className="relative z-10 flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-4 max-w-xl bg-white/80 rounded-2xl p-6 shadow-sm backdrop-blur">
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight flex items-center gap-3 text-slate-900">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                    {greetingMessage}
                  </h1>
              <p className="text-sm lg:text-base text-slate-900/80">
                    Última atualização em <span className="font-semibold">{dateTimeLabel}</span>. Acompanhe indicadores
                    críticos, alertas e ative rapidamente as iniciativas do dia.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      asChild
                      className="hover:opacity-95 border"
                      style={{
                        backgroundColor: heroTextColor,
                        color: heroPrimaryColor,
                        borderColor: hexToRgba(heroPrimaryColor, 0.45),
                      }}
                    >
                      <Link href="/metas">
                        Planejar metas
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-2xl p-4 shadow-inner backdrop-blur bg-white/85 text-slate-900">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Meta mensal</p>
                    <p className="text-2xl font-semibold text-slate-900">R$ 2,4M</p>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <TrendingUp className="w-3 h-3 text-emerald-500" /> +12% vs. ano passado
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Meta da semana</p>
                    <p className="text-2xl font-semibold text-slate-900">R$ 580 mil</p>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <Clock className="w-3 h-3 text-emerald-500" /> Faltam 3 dias úteis
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.label} className="border border-emerald-50 shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {metric.label}
                      </CardTitle>
                      <div className="text-2xl font-semibold text-gray-900 mt-2">{metric.value}</div>
                    </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    metric.trend === "up"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                  title={metric.deltaTooltip}
                >
                      {metric.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {metric.delta}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{metric.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Radar semanal de vendas</CardTitle>
                  <CardDescription>
                    Conecte seu ERP ou atualize o CSV diário para visualizar evolução por categoria e canal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 flex flex-col items-center justify-center text-sm text-emerald-700">
                    <Activity className="w-8 h-8 mb-3" />
                    <p className="font-medium">Integre suas vendas para ativar este gráfico.</p>
                    <p className="text-xs text-emerald-800/80 mt-2">
                      Aceitamos integração direta via Supabase, API Z-API ou importação manual de CSV.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Alertas rápidos</CardTitle>
                  <CardDescription>Priorize ações que mantêm o dia saudável.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.title}
                      className={`rounded-2xl border p-3 flex gap-3 ${
                        alert.tone === "alert"
                          ? "border-rose-100 bg-rose-50"
                          : "border-emerald-100 bg-emerald-50"
                      }`}
                    >
                      <div
                        className={`mt-1 rounded-full p-2 ${
                          alert.tone === "alert" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <alert.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Ações rápidas</CardTitle>
                  <CardDescription>Abra módulos essenciais com um clique.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickActionViews.map((view) => {
                    const targetRoute = viewRoutes[view.key as keyof typeof viewRoutes] ?? "/";
                    return (
                      <Button
                        key={view.key}
                        asChild
                        variant="ghost"
                        className="w-full justify-start gap-2 text-sm hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Link href={targetRoute}>
                          <view.icon className="w-4 h-4" />
                          {view.title}
                          <ArrowUpRight className="w-4 h-4 ml-auto opacity-60" />
                        </Link>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Ritmo das metas</CardTitle>
                  <CardDescription>Preencha dados reais para acompanhar cenário A e B.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Genéricos", progress: 78, color: "emerald" },
                    { label: "Perfumaria", progress: 64, color: "sky" },
                    { label: "Campanhas", progress: 52, color: "amber" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{item.label}</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${
                            item.color === "emerald"
                              ? "bg-emerald-500"
                              : item.color === "sky"
                              ? "bg-sky-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-gray-900">Pulso da equipe</CardTitle>
                  <CardDescription>Monitore ritmo de vendedores e gargalos de atendimento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-emerald-100 p-3 bg-emerald-50/40 text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    92% da escala de hoje já marcou presença.
                  </div>
                  <div className="space-y-3 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Turno A · manhã</span>
                      <span className="font-semibold text-emerald-600">Atingimento 78%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Turno B · tarde</span>
                      <span className="font-semibold text-amber-600">Reforçar campanha OTC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Farmacêutico responsável</span>
                      <span className="font-semibold text-emerald-600">Presente</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/equipe">
                      Ver escala completa
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <button onClick={() => go("home")} className="hover:text-green-600 transition-colors flex items-center gap-1">
                🏠 Home
              </button>
              <span>›</span>
              <span className="font-medium text-gray-900">{currentTitle}</span>
            </div>

            <Button
              variant="outline"
              asChild
              className="mb-4 transition-colors hover:opacity-80"
              style={{ borderColor: primaryBorder, color: primaryColor }}
            >
              <Link href={backHref}>
                ← Voltar
              </Link>
            </Button>
            {currentContent}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-100 bg-white/60">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10 justify-between">
          <div className="flex items-center gap-3">
            <Logo width={48} height={18} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">Sessão ativa</span>
              <span className="text-sm text-muted-foreground">
                {storeTitle}
                {storeRoleLabel ? ` · ${storeRoleLabel}` : ""}
              </span>
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3 lg:text-center" style={{ color: primaryColor }}>
              Navegação rápida
            </h4>
            <div className="flex flex-wrap gap-2">
              {views.map((view) => (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => go(view.key)}
                  className="text-sm text-muted-foreground rounded-full px-4 py-2 border transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: primaryBorder,
                    backgroundColor: hexToRgba(primaryColor, 0.06),
                    color: "#475569",
                  }}
                >
                  {view.title}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} TEM VENDA · Sistema de Gestão Comercial</span>
            <span>
              Powered by <span className="font-semibold" style={{ color: brand.dark }}>
                TEM VENDA
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

