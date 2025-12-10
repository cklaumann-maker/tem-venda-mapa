"use client";

import React, { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
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
  Activity,
  PackageSearch,
  Sparkles,
  CheckCircle2,
  ListTodo,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import UserMenu from "@/components/auth/UserMenu";
import Logo from "@/components/common/Logo";
import { StoreSelector } from "@/components/common/StoreSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

// Lazy-load das views para evitar qualquer efeito colateral na montagem da HOME
const MetasView = dynamic(() => import("@/components/metas/MetasView"), { ssr: false });
const VendasView = dynamic(() => import("@/components/vendas/VendasView"), { ssr: false });
const EquipeView = dynamic(() => import("@/components/equipe/EquipeView"), { ssr: false });
const FormulariosView = dynamic(() => import("@/components/formularios/FormulariosView"), { ssr: false });
const PendingFormsWidget = dynamic(() => import("@/components/formularios/PendingFormsWidget"), { ssr: false });

type DashboardView = {
  key: string;
  title: string;
  icon: typeof Target;
  desc: string;
  component: ReactNode;
  preload?: () => Promise<void>;
};

type StoreTaskRecord = {
  id: string;
  store_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
};

function preloadComponent(component: unknown): Promise<void> {
  const maybe = component as { preload?: () => Promise<unknown> } | null | undefined;
  if (maybe && typeof maybe.preload === "function") {
    return Promise.resolve(maybe.preload()).then(() => undefined);
  }
  return Promise.resolve();
}


type TasksPanelProps = {
  isAdmin: boolean;
  stores: { id: string; name: string }[];
  selectedStoreId: string | null;
  onStoreChange: (storeId: string) => void;
  tasks: StoreTaskRecord[];
  loading: boolean;
  saving: boolean;
  completingId: string | null;
  deletingId: string | null;
  error: string | null;
  onAddTask: (title: string) => Promise<boolean>;
  onCompleteTask: (taskId: string) => Promise<boolean>;
  onDeleteTask: (taskId: string) => Promise<boolean>;
  currentStoreName: string | null;
};

function TasksPanel({
  isAdmin,
  stores,
  selectedStoreId,
  onStoreChange,
  tasks,
  loading,
  saving,
  completingId,
  deletingId,
  error,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  currentStoreName,
}: TasksPanelProps) {
  const [newTask, setNewTask] = useState("");
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = newTask.trim();
      if (!value || saving || !selectedStoreId) return;
      const success = await onAddTask(value);
      if (success) {
        setNewTask("");
      }
    },
    [newTask, onAddTask, saving, selectedStoreId]
  );

  const hasStores = isAdmin ? stores.length > 0 : !!selectedStoreId;

  return (
    <Card className="bg-white/85 backdrop-blur border border-white/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-emerald-600" />
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Tarefas pendentes</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Registre pendências críticas e acompanhe a execução pelo time.
                </CardDescription>
              </div>
            </div>
            {isAdmin ? (
              <Select
                value={selectedStoreId ?? ""}
                onValueChange={(value) => {
                  onStoreChange(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-56 h-9 bg-white/80" disabled={stores.length === 0}>
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
            ) : (
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {currentStoreName ?? "Sem loja selecionada"}
              </span>
            )}
          </div>
          {!hasStores && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Nenhuma empresa disponível para atribuir tarefas.
            </div>
          )}
          {error ? (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedStoreId ? (
          <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center">
            {isAdmin
              ? "Selecione uma empresa para visualizar e registrar tarefas."
              : "Selecione uma loja para acompanhar as tarefas do dia."}
          </p>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando tarefas...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-sm text-slate-600 border border-dashed border-emerald-200 rounded-lg px-4 py-5 bg-white/70 text-center">
                Nenhuma tarefa pendente. Registre a próxima iniciativa.
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          void onCompleteTask(task.id);
                        }}
                        disabled={completingId === task.id || deletingId === task.id}
                        className="mt-0.5 text-emerald-600 hover:text-emerald-700"
                        aria-label="Concluir tarefa"
                      >
                        {completingId === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="flex-1 text-sm text-slate-700 leading-snug pt-1">
                        <div>{task.title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {(() => {
                            const createdDate = new Date(task.created_at);
                            const createdLabel = Number.isNaN(createdDate.getTime())
                              ? null
                              : createdDate.toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                            const creator = task.created_by_email ?? null;
                            if (!createdLabel && !creator) return "Criada recentemente";
                            if (createdLabel && creator) return `Criada em ${createdLabel} por ${creator}`;
                            if (createdLabel) return `Criada em ${createdLabel}`;
                            return `Criada por ${creator}`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        void onDeleteTask(task.id);
                      }}
                      disabled={deletingId === task.id || completingId === task.id}
                      className="mt-0.5 text-rose-600 hover:text-rose-700"
                      aria-label="Excluir tarefa"
                    >
                      {deletingId === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
              <Input
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="Adicionar nova tarefa para hoje"
                disabled={saving || !selectedStoreId}
              />
              <Button type="submit" disabled={saving || !selectedStoreId || !newTask.trim()} className="sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
const views: DashboardView[] = [
  {
    key: "metas",
    title: "Metas",
    icon: Target,
    desc: "Defina o quanto quer vender",
    component: <MetasView />,
    preload: () => preloadComponent(MetasView),
  },
  {
    key: "vendas",
    title: "Vendas",
    icon: ShoppingBasket,
    desc: "Acompanhe o movimento da loja",
    component: <VendasView />,
    preload: () => preloadComponent(VendasView),
  },
  { key: "campanhas", title: "Campanhas", icon: CalendarRange, desc: "Planeje seus momentos de venda", component: <Placeholder title="Campanhas" /> },
  { key: "financeiro", title: "Financeiro", icon: PiggyBank, desc: "Veja se está sobrando dinheiro", component: <Placeholder title="Financeiro" /> },
  {
    key: "equipe",
    title: "Equipe",
    icon: Users,
    desc: "Gerencie colaboradores, escalas e ponto",
    component: <EquipeView />,
    preload: () => preloadComponent(EquipeView),
  },
  {
    key: "formularios",
    title: "Formulários",
    icon: FileText,
    desc: "Crie e gerencie formulários para sua equipe",
    component: <FormulariosView />,
    preload: () => preloadComponent(FormulariosView),
  },
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
  const { user } = useAuth();
  const { loading: storeLoading, stores, currentStore, setCurrentStoreId, isAdmin } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [active, setActive] = useState<string>(initialView);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [dateTimeLabel, setDateTimeLabel] = useState(() => formatDateTime());
  const [tasksStoreId, setTasksStoreId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<StoreTaskRecord[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const viewRoutes = useMemo(() => {
    const baseRoutes: Record<string, string> = {
      home: "/",
      metas: "/metas",
      vendas: "/vendas",
      campanhas: "/campanhas",
      financeiro: "/financeiro",
      equipe: "/equipe",
      formularios: "/formularios",
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

  const viewMap = useMemo(() => {
    const map = new Map<string, DashboardView>();
    views.forEach((view) => {
      map.set(view.key, view);
    });
    return map;
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setTasksStoreId(currentStore?.id ?? null);
    }
  }, [isAdmin, currentStore?.id]);

  useEffect(() => {
    if (isAdmin) {
      if (!tasksStoreId) {
        const fallback = currentStore?.id ?? stores[0]?.id ?? null;
        if (fallback && fallback !== tasksStoreId) {
          setTasksStoreId(fallback);
        }
      }
    }
  }, [isAdmin, currentStore?.id, stores, tasksStoreId]);

  useEffect(() => {
    setTasksError(null);
  }, [tasksStoreId]);

  const completeNavigation = useCallback(() => {
    setIsNavigating(false);
    setPendingRoute(null);
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    const matchEntry = Object.entries(viewRoutes).find(([, path]) => path === pathname);
    if (matchEntry) {
      setActive(matchEntry[0]);
    } else {
      setActive(initialView);
    }
  }, [pathname, initialView, viewRoutes]);

  useEffect(() => {
    if (pendingRoute && pathname === pendingRoute) {
      completeNavigation();
    }
  }, [pathname, pendingRoute, completeNavigation]);

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

  const fetchTasks = useCallback(
    async (storeId: string) => {
      setTasksLoading(true);
      setTasksError(null);
      try {
        const { data, error } = await supabase
          .from("store_tasks")
          .select("id, store_id, title, completed, created_at, created_by, created_by_email")
          .eq("store_id", storeId)
          .eq("completed", false)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const rows = (data ?? []) as StoreTaskRecord[];
        setTasks(rows);
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        setTasks([]);
        setTasksError("Não foi possível carregar as tarefas pendentes.");
      } finally {
        setTasksLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!tasksStoreId) {
      setTasks([]);
      return;
    }
    void fetchTasks(tasksStoreId);
  }, [tasksStoreId, fetchTasks]);

  const handleAddTask = useCallback(
    async (title: string) => {
      const storeId = tasksStoreId;
      const trimmed = title.trim();
      if (!storeId || !trimmed) return false;
      setTaskSaving(true);
      setTasksError(null);
      try {
        const { data, error } = await supabase
          .from("store_tasks")
          .insert({
            store_id: storeId,
            title: trimmed,
            completed: false,
            created_by: user?.id ?? null,
            created_by_email: user?.email ?? null,
          })
          .select("id, store_id, title, completed, created_at, created_by, created_by_email")
          .single<StoreTaskRecord>();
        if (error) throw error;
        const inserted = data as StoreTaskRecord;
        setTasks((prev) =>
          [...prev, inserted].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
        return true;
      } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        setTasksError("Não foi possível adicionar a tarefa. Tente novamente.");
        return false;
      } finally {
        setTaskSaving(false);
      }
    },
    [supabase, tasksStoreId, user?.id]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId);
      setTasksError(null);
      try {
        const { error } = await supabase
          .from("store_tasks")
          .update({ completed: true })
          .eq("id", taskId);
        if (error) throw error;
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        return true;
      } catch (error) {
        console.error("Erro ao concluir tarefa:", error);
        setTasksError("Não foi possível concluir a tarefa. Tente novamente.");
        return false;
      } finally {
        setCompletingTaskId(null);
      }
    },
    [supabase]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setDeletingTaskId(taskId);
      setTasksError(null);
      try {
        const { error } = await supabase.from("store_tasks").delete().eq("id", taskId);
        if (error) throw error;
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        return true;
      } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
        setTasksError("Não foi possível excluir a tarefa. Tente novamente.");
        return false;
      } finally {
        setDeletingTaskId(null);
      }
    },
    [supabase]
  );

  const navigateToKey = useCallback(
    async (key: string) => {
      const k = allowedKeys.has(key) ? key : "home";
      const targetRoute = viewRoutes[k as keyof typeof viewRoutes];

      if (k === active && (!targetRoute || targetRoute === pathname)) {
        return;
      }

      if (pendingRoute && targetRoute && pendingRoute === targetRoute) {
        return;
      }

      setIsNavigating(true);
      document.body.style.cursor = "progress";

      const targetView = viewMap.get(k);
      if (targetView?.preload) {
        try {
          await targetView.preload();
        } catch (error) {
          console.error("Erro ao pré-carregar view:", error);
        }
      }

      if (!targetRoute || targetRoute === pathname) {
        setActive(k);
        completeNavigation();
        return;
      }

      setPendingRoute(targetRoute);
      router.push(targetRoute);
    },
    [allowedKeys, viewRoutes, viewMap, pathname, router, completeNavigation, active, pendingRoute]
  );

  const go = useCallback(
    (key: string) => {
      void navigateToKey(key);
    },
    [navigateToKey]
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

  const heroSummary = [
    {
      label: "Meta mensal",
      value: "R$ 2,4M",
      helper: "+12% vs. ano passado",
      icon: TrendingUp,
      accent: "emerald" as const,
    },
    {
      label: "Meta da semana",
      value: "R$ 580 mil",
      helper: "Faltam 3 dias úteis",
      icon: Clock,
      accent: "sky" as const,
    },
    {
      label: "Meta diária",
      value: "82% atingido",
      helper: "R$ 48,2 mil de R$ 58,5 mil",
      icon: Activity,
      accent: "amber" as const,
    },
  ];

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
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" aria-label="Carregando" />
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
      <div
        className={`fixed inset-0 z-40 pointer-events-none transition-opacity duration-200 ease-out ${isNavigating ? "opacity-80" : "opacity-0"}`}
        style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
        aria-hidden="true"
      />
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo e nome da empresa */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  go("home");
                }}
                className="group flex items-center gap-2 rounded-md px-1 sm:px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 transition flex-shrink-0"
                aria-label="Ir para a página inicial"
                title="Ir para a página inicial"
              >
                <Logo width={32} height={32} className="sm:w-9 sm:h-9 transition-transform duration-200 group-hover:scale-105 flex-shrink-0" />
                <div className="hidden sm:flex flex-col leading-tight min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide truncate" style={{ color: primaryColor }}>
                    Tem Venda
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">Página inicial</span>
                </div>
              </Link>
              
              {/* Logo da loja */}
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border bg-white flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ borderColor: primaryBorder }}
              >
                {currentStore?.logoUrl ? (
                  <Image src={currentStore.logoUrl} alt={storeTitle} width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: primaryColor }}>
                    {storeTitle[0] ?? "?"}
                  </span>
                )}
              </div>

              {/* Seletor de Empresa/Loja e Modo de Visualização */}
              <div className="min-w-0 flex-1 hidden md:block">
                <StoreSelector />
              </div>
            </div>

            {/* Menu direito - Data/Hora e ações */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
              {/* Data/Hora - oculta em mobile muito pequeno */}
              <span
                className="hidden sm:inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border whitespace-nowrap"
                style={{
                  backgroundColor: primarySurface,
                  color: primaryColor,
                  borderColor: primaryBorder,
                }}
              >
                <span className="hidden lg:inline">{dateTimeLabel}</span>
                <span className="lg:hidden">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
              
              {/* Botão de configuração mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 md:hidden"
                onClick={() => {
                  if (pathname !== "/configuracoes") {
                    router.push("/configuracoes");
                  }
                }}
                aria-label="Abrir configurações"
              >
                <Cog className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              {/* Botões desktop */}
              <div className="hidden md:flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  onClick={() => {
                    if (pathname !== "/configuracoes") {
                      router.push("/configuracoes");
                    }
                  }}
                >
                  <Cog className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                  <span className="hidden lg:inline">Configurações</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                  <span className="hidden lg:inline">Exportar</span>
                </Button>
              </div>
              
              <UserMenu />
            </div>
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
              <div className="relative z-10 flex flex-col gap-5 p-8">
                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                  <div className="flex-1 flex items-center justify-center rounded-2xl bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight flex items-center gap-2 sm:gap-3 text-slate-900">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                      <span className="break-words">{greetingMessage}</span>
                    </h1>
                  </div>
                  <div className="flex-shrink-0 w-full lg:w-auto">
                    <PendingFormsWidget />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {heroSummary.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/60 bg-white/85 backdrop-blur px-4 py-3 shadow-sm flex flex-col gap-1"
                      >
                        <span className="text-xs uppercase tracking-wide text-slate-500">{item.label}</span>
                        <span className="text-xl font-semibold text-slate-900">{item.value}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <item.icon
                            className={`w-3 h-3 ${
                              item.accent === "emerald"
                                ? "text-emerald-500"
                                : item.accent === "sky"
                                ? "text-sky-500"
                                : "text-amber-500"
                            }`}
                          />
                          {item.helper}
                        </span>
                      </div>
                    ))}
                  </div>
                  <TasksPanel
                    isAdmin={isAdmin}
                    stores={stores}
                    selectedStoreId={tasksStoreId}
                    onStoreChange={setTasksStoreId}
                    tasks={tasks}
                    loading={tasksLoading}
                    saving={taskSaving}
                    completingId={completingTaskId}
                    deletingId={deletingTaskId}
                    error={tasksError}
                    onAddTask={handleAddTask}
                    onCompleteTask={handleCompleteTask}
                    onDeleteTask={handleDeleteTask}
                    currentStoreName={storeTitle}
                  />
                </div>
              </div>
            </section>

            {/* Menu Principal - Barra de navegação horizontal */}
            <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-semibold text-gray-900">Menu principal</h2>
                  <span className="text-xs text-gray-500 hidden sm:inline">Tudo que você precisa, em um só lugar</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-3">
                {quickActionViews.map((view) => {
                  const targetRoute = viewRoutes[view.key as keyof typeof viewRoutes] ?? "/";
                  return (
                    <Link
                      key={view.key}
                      href={targetRoute}
                      onClick={(event) => {
                        event.preventDefault();
                        go(view.key);
                      }}
                      className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-emerald-100 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 hover:shadow-md hover:scale-105"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                        <view.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 group-hover:text-emerald-700 text-center leading-tight">
                        {view.title}
                      </span>
                    </Link>
                  );
                })}
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

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Link
                href={backHref}
                onClick={(event) => {
                  event.preventDefault();
                  const match = Object.entries(viewRoutes).find(([, path]) => path === backHref);
                  const targetKey = match ? match[0] : "home";
                  go(targetKey);
                }}
              >
                ← Voltar
              </Link>
            </Button>
            {currentContent}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-100 bg-white/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm font-medium text-center" style={{ color: primaryColor }}>
              Tudo que você precisa, em um só lugar
            </p>
          </div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10 justify-between">
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

