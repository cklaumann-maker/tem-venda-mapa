"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ShieldCheck, Target, CalendarRange, ShoppingBasket, PiggyBank, Users,
  Heart, Brain, BarChart4, Cog, Download, Loader2, Image as ImageIcon
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
import { supabaseClient } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Lazy-load das views para evitar qualquer efeito colateral na montagem da HOME
const MetasView = dynamic(() => import("@/components/metas/MetasView"), { ssr: false });
const VendasView = dynamic(() => import("@/components/vendas/VendasView"), { ssr: false });
const EquipeView = dynamic(() => import("@/components/equipe/EquipeView"), { ssr: false });

// Paleta
const brand = { primary: "#5ee100", dark: "#373736" };

const storeBrandingOverrides: Record<
  string,
  {
    primary: string;
    secondary: string;
    tagline: string;
    cover: string | null;
  }
> = {
  teste1: {
    primary: "#5FA8C4",
    secondary: "#C53A4A",
    tagline: "TEM VENDA",
    cover:
      "https://ltsbfcnlfpzsbfqwmazx.supabase.co/storage/v1/object/public/company-logos/bc70940d-8995-4669-91a7-94f86b22cf6d/1762636517805.jpg",
  },
  teste2: {
    primary: "#F3C96A",
    secondary: "#D5574A",
    tagline: "TEM VENDA",
    cover:
      "https://ltsbfcnlfpzsbfqwmazx.supabase.co/storage/v1/object/public/company-logos/63447f3f-0496-4851-8321-fb1bbdc47a55/1762636717822.jpg",
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
  const { loading: storeLoading, stores, currentStore, setCurrentStoreId, isAdmin, refresh } = useStore();
  const [active, setActive] = useState<string>("home");
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoStoreId, setLogoStoreId] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dateTimeLabel, setDateTimeLabel] = useState(() => formatDateTime());
  const supabase = useMemo(() => supabaseClient(), []);
  const configMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (currentStore?.id) setLogoStoreId(currentStore.id);
  }, [currentStore?.id]);

  useEffect(() => {
    if (!showConfigMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (configMenuRef.current && !configMenuRef.current.contains(event.target as Node)) {
        setShowConfigMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConfigMenu]);

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

  const handleStepChange = useCallback(
    (next: string) => {
      setActive(next);
      router.replace(next === "home" ? "/" : "/");
    },
    [router]
  );

  const handleLogoConfig = useCallback(() => {
    if (!isAdmin) return;
    setShowConfigMenu(false);
    setShowLogoModal(true);
  }, [isAdmin]);

  const handleUploadLogo = useCallback(async () => {
    if (!logoFile || !logoStoreId) {
      alert("Selecione a empresa e uma imagem antes de salvar.");
      return;
    }
    try {
      setUploadingLogo(true);
      const extension = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${logoStoreId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Não foi possível obter o link público da imagem.");
      const { error: updateError } = await supabase
        .from("stores")
        .update({ logo_url: publicUrl })
        .eq("id", logoStoreId);
      if (updateError) throw updateError;
      await refresh();
      setShowLogoModal(false);
      setLogoFile(null);
      alert("Logo atualizada com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar a logo. Verifique o console para detalhes.");
    } finally {
      setUploadingLogo(false);
    }
  }, [logoFile, logoStoreId, supabase, refresh]);

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

  const storeKey = currentStore?.name?.trim().toLowerCase() ?? "";
  const overrideBrand = storeBrandingOverrides[storeKey];

  const primaryColor =
    overrideBrand?.primary ?? currentStore?.branding?.primaryColor ?? brand.primary;
  const secondaryColor =
    overrideBrand?.secondary ?? currentStore?.branding?.secondaryColor ?? "#16a34a";
  const tagline =
    overrideBrand?.tagline ?? currentStore?.branding?.tagline ?? "Sistema de Gestão Comercial";
  const coverImageUrl = overrideBrand?.cover ?? currentStore?.branding?.coverImageUrl ?? null;
  const supportEmail = overrideBrand ? null : currentStore?.branding?.supportEmail ?? null;
  const supportPhone = overrideBrand ? null : currentStore?.branding?.supportPhone ?? null;

  const primarySurface = hexToRgba(primaryColor, 0.12);
  const primaryBorder = hexToRgba(primaryColor, 0.3);
  const heroBackground = coverImageUrl
    ? `linear-gradient(0deg, rgba(14, 23, 32, 0.58), rgba(14, 23, 32, 0.58)), url(${coverImageUrl})`
    : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
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
                {storeRoleLabel && (
                  <span className="hidden sm:inline text-xs text-muted-foreground">{storeRoleLabel}</span>
                )}
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
            <div className="hidden md:flex gap-2 items-center" ref={configMenuRef}>
              <div className="relative">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowConfigMenu((prev) => !prev)}>
                  <Cog className="w-4 h-4" /> Configurações
                </Button>
                {showConfigMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg z-20 p-2 space-y-2">
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={handleLogoConfig}
                      >
                        <ImageIcon className="w-4 h-4" /> Logos das empresas
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground px-2">Nenhuma configuração disponível.</div>
                    )}
                  </div>
                )}
              </div>
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
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{tagline}</h1>
                <p className="text-base sm:text-lg text-white/85">
                  Organize metas, acompanhe vendas e impulsione o desempenho da sua empresa em uma única experiência
                  personalizada.
                </p>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: hexToRgba(primaryColor, 0.15), color: primaryColor }}
                  >
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">R$ 2.4M</div>
                    <div className="text-sm text-gray-600">Meta Anual</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor }}
                  >
                    <ShoppingBasket className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">R$ 1.8M</div>
                    <div className="text-sm text-gray-600">Realizado</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: hexToRgba(primaryColor, 0.15), color: primaryColor }}
                  >
                    <BarChart4 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">75%</div>
                    <div className="text-sm text-gray-600">Atingimento</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor }}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-gray-600">Lojas Ativas</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {views.map((v) => (
                <button
                  key={v.key}
                  onClick={() => go(v.key)}
                  className="group rounded-2xl bg-white transition-all duration-300 shadow-sm hover:shadow-xl p-4 lg:p-6 text-left w-full focus:outline-none focus:ring-4 transform hover:-translate-y-1"
                  style={{
                    border: `2px solid ${primaryBorder}`,
                    boxShadow: `0 10px 30px ${hexToRgba(primaryColor, 0.14)}`,
                  }}
                  aria-label={`Abrir ${v.title}`}
                >
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div
                      className="p-3 lg:p-4 rounded-xl transition-colors"
                      style={{
                        backgroundColor: hexToRgba(primaryColor, 0.12),
                      }}
                    >
                      <v.icon className="w-6 h-6 lg:w-8 lg:h-8" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg lg:text-xl font-bold text-gray-900" style={{ color: primaryColor }}>
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
              className="mb-4 transition-colors hover:opacity-80"
              style={{ borderColor: primaryBorder, color: primaryColor }}
            >
              ← Voltar para Home
            </Button>
            {views.find((v) => v.key === active)?.component}
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
            <h4
              className="text-xs font-semibold uppercase tracking-wide mb-3 lg:text-center"
              style={{ color: primaryColor }}
            >
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

          {(supportEmail || supportPhone) && (
            <div className="w-full lg:w-auto text-sm text-muted-foreground space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: primaryColor }}>
                Contato da empresa
              </h4>
              {supportEmail && (
                <p>
                  E-mail:{" "}
                  <a href={`mailto:${supportEmail}`} className="font-medium" style={{ color: primaryColor }}>
                    {supportEmail}
                  </a>
                </p>
              )}
              {supportPhone && (
                <p>
                  Telefone:{" "}
                  <a href={`tel:${supportPhone}`} className="font-medium" style={{ color: primaryColor }}>
                    {supportPhone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} TEM VENDA · Sistema de Gestão Comercial</span>
            <span>
              Powered by <span className="font-semibold" style={{ color: brand.dark }}>TEM VENDA</span>
            </span>
          </div>
        </div>
      </footer>

      {showLogoModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Logo das empresas</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowLogoModal(false)}>
                  Fechar
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={logoStoreId} onValueChange={setLogoStoreId}>
                  <SelectTrigger className="bg-white">
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
              </div>
              <div className="space-y-2">
                <Label>Arquivo da logo</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/heic"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                {logoFile && (
                  <p className="text-xs text-gray-500">Selecionado: {logoFile.name}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowLogoModal(false); setLogoFile(null); }}>
                  Cancelar
                </Button>
                <Button onClick={handleUploadLogo} disabled={!logoFile || !logoStoreId || uploadingLogo}>
                  {uploadingLogo ? "Enviando..." : "Salvar logo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

