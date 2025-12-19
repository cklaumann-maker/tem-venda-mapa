"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type StoreBranding = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  tagline?: string | null;
  coverImageUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
};

type CompanySummary = {
  id: string;
  name: string;
};

type StoreSummary = {
  id: string;
  name: string;
  companyId?: string | null;
  companyName?: string | null;
  logoUrl?: string | null;
  storeRole?: string | null;
  isActive?: boolean;
  branding?: StoreBranding;
};

type ProfileInfo = {
  full_name: string | null;
  role: string | null;
  default_store_id: string | null;
  org_id: string | null;
};

type ViewMode = "network" | "store";

type StoreContextValue = {
  loading: boolean;
  companies: CompanySummary[];
  stores: StoreSummary[];
  currentCompanyId: string | null;
  currentStoreId: string | null;
  currentStore: StoreSummary | null;
  viewMode: ViewMode;
  profileRole: string | null;
  isAdmin: boolean;
  isManager: boolean;
  canViewNetwork: boolean;
  setCurrentCompanyId: (id: string | null) => Promise<void>;
  setCurrentStoreId: (id: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  refresh: () => Promise<void>;
  getStoreIdsForQuery: () => string[] | null;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("store");
  const supabase = useMemo(() => supabaseClient(), []);

  const loadData = async () => {
    if (!user) {
      setCompanies([]);
      setStores([]);
      setProfileRole(null);
      setCurrentCompanyId(null);
      setCurrentStoreIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, default_store_id, org_id")
        .eq("id", user.id)
        .maybeSingle<ProfileInfo>();

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role ?? null;
      setProfileRole(role);

      let companyRows: CompanySummary[] = [];
      let storeRows: StoreSummary[] = [];
      let userCompanyId: string | null = null;

      if (role === "admin") {
        // Admin vê todas as empresas e lojas
        const { data: companiesData, error: companiesError } = await supabase
          .from("orgs")
          .select("id, name")
          .order("name", { ascending: true });
        if (companiesError) throw companiesError;
        companyRows = (companiesData ?? []).map((row) => ({
          id: row.id,
          name: row.name,
        }));

        const { data: storesData, error: storesError } = await supabase
          .from("stores")
          .select(
            "id, name, org_id, logo_url, is_active, brand_primary_color, brand_secondary_color, brand_tagline, brand_cover_url, brand_support_email, brand_support_phone"
          )
          .order("name", { ascending: true });
        if (storesError) throw storesError;

        // Buscar nomes das empresas para as lojas
        const orgIds = [...new Set((storesData ?? []).map((s) => s.org_id).filter(Boolean))];
        const { data: orgsData } = await supabase
          .from("orgs")
          .select("id, name")
          .in("id", orgIds);
        const orgMap = new Map((orgsData ?? []).map((o) => [o.id, o.name]));

        storeRows = (storesData ?? [])
          .filter((row) => row.is_active ?? true)
          .map((row) => ({
            id: row.id,
            name: row.name,
            companyId: row.org_id,
            companyName: orgMap.get(row.org_id) ?? null,
            logoUrl: row.logo_url,
            storeRole: "admin",
            isActive: row.is_active ?? true,
            branding: {
              primaryColor: row.brand_primary_color,
              secondaryColor: row.brand_secondary_color,
              tagline: row.brand_tagline,
              coverImageUrl: row.brand_cover_url,
              supportEmail: row.brand_support_email,
              supportPhone: row.brand_support_phone,
            },
          }));
      } else {
        // Usuários não-admin veem apenas suas empresas/lojas
        const { data: memberData, error: memberError } = await supabase
          .from("store_members")
          .select("store_id, role, active")
          .eq("user_id", user.id);
        if (memberError) throw memberError;

        const memberRows = (memberData ?? []).filter((row) => row.active ?? true);
        const storeIds = memberRows.map((row) => row.store_id).filter(Boolean);

        if (storeIds.length > 0) {
          const { data: storesData, error: storesError } = await supabase
            .from("stores")
            .select(
              "id, name, org_id, logo_url, is_active, brand_primary_color, brand_secondary_color, brand_tagline, brand_cover_url, brand_support_email, brand_support_phone"
            )
            .in("id", storeIds);
          if (storesError) throw storesError;

          // Buscar empresas das lojas do usuário
          const orgIds = [...new Set((storesData ?? []).map((s) => s.org_id).filter(Boolean))];
          const { data: orgsData } = await supabase
            .from("orgs")
            .select("id, name")
            .in("id", orgIds);
          companyRows = (orgsData ?? []).map((row) => ({
            id: row.id,
            name: row.name,
          }));

          // Se o usuário tem org_id no perfil, usar como empresa padrão
          userCompanyId = profile?.org_id ?? orgIds[0] ?? null;

          const orgMap = new Map((orgsData ?? []).map((o) => [o.id, o.name]));

          const storeMap = new Map<
            string,
            {
              name: string;
              companyId: string | null;
              companyName: string | null;
              logoUrl: string | null;
              branding: StoreBranding | undefined;
            }
          >();
          (storesData ?? []).forEach((row) => {
            storeMap.set(row.id, {
              name: row.name,
              companyId: row.org_id,
              companyName: orgMap.get(row.org_id) ?? null,
              logoUrl: row.logo_url,
              isActive: row.is_active ?? true,
              branding: {
                primaryColor: row.brand_primary_color,
                secondaryColor: row.brand_secondary_color,
                tagline: row.brand_tagline,
                coverImageUrl: row.brand_cover_url,
                supportEmail: row.brand_support_email,
                supportPhone: row.brand_support_phone,
              },
            });
          });

          storeRows = memberRows
            .map((row) => {
              const meta = storeMap.get(row.store_id);
              if (!meta?.isActive) return null;
              return {
                id: row.store_id,
                name: meta?.name ?? "Loja",
                companyId: meta?.companyId ?? null,
                companyName: meta?.companyName ?? null,
                logoUrl: meta?.logoUrl ?? null,
                storeRole: row.role,
                isActive: meta?.isActive ?? true,
                branding: meta?.branding,
              };
            })
            .filter((row): row is StoreSummary => row !== null);
          storeRows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        }
      }

      setCompanies(companyRows);
      setStores(storeRows);

      // Definir empresa atual
      const preferredCompanyId = userCompanyId ?? companyRows[0]?.id ?? null;
      setCurrentCompanyIdState(preferredCompanyId);

      // Filtrar lojas pela empresa selecionada
      const storesForCompany = preferredCompanyId
        ? storeRows.filter((s) => s.companyId === preferredCompanyId)
        : storeRows;

      // Definir loja atual
      const preferredStoreId = profile?.default_store_id;
      const fallbackStoreId = storesForCompany[0]?.id ?? null;
      const resolvedStoreId =
        preferredStoreId && storesForCompany.some((store) => store.id === preferredStoreId)
          ? preferredStoreId
          : fallbackStoreId;

      setCurrentStoreIdState(resolvedStoreId);

      // Definir modo de visualização padrão
      // Gerentes podem ver rede, outros apenas loja
      const isManager = role === "manager" || role === "owner";
      setViewModeState(isManager ? "store" : "store");
    } catch (error) {
      console.error("Erro ao carregar contexto de lojas:", error);
      setCompanies([]);
      setStores([]);
      setCurrentCompanyId(null);
      setCurrentStoreIdState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const handleChangeCompany = async (id: string | null) => {
    if (currentCompanyId === id) return;
    setCurrentCompanyIdState(id);

    // Filtrar lojas pela nova empresa
    const storesForCompany = id
      ? stores.filter((s) => s.companyId === id)
      : stores;

    // Se a loja atual não pertence à nova empresa, mudar para a primeira loja disponível
    const currentStoreBelongsToCompany = id
      ? storesForCompany.some((s) => s.id === currentStoreId)
      : true;

    if (!currentStoreBelongsToCompany && storesForCompany.length > 0) {
      await handleChangeStore(storesForCompany[0].id);
    }
  };

  const handleChangeStore = async (id: string) => {
    if (currentStoreId === id) return;
    setCurrentStoreIdState(id);
    if (!user) return;

    try {
      await supabase
        .from("profiles")
        .update({ default_store_id: id })
        .eq("id", user.id);
    } catch (error) {
      console.error("Erro ao atualizar loja padrão:", error);
      // Recarrega dados para evitar estado inconsistente
      await loadData();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewModeState(mode);
  };

  // Helper para obter store IDs baseado no modo de visualização
  const getStoreIdsForQuery = (): string[] | null => {
    if (viewMode === "network") {
      // Modo rede: todas as lojas da empresa atual
      if (!currentCompanyId) return null;
      return stores.filter((s) => s.companyId === currentCompanyId).map((s) => s.id);
    } else {
      // Modo loja: apenas a loja selecionada
      return currentStoreId ? [currentStoreId] : null;
    }
  };

  // Lojas filtradas pela empresa atual
  const storesForCurrentCompany = currentCompanyId
    ? stores.filter((s) => s.companyId === currentCompanyId)
    : stores;

  const isManager = profileRole === "manager" || profileRole === "owner";
  const canViewNetwork = isManager || profileRole === "admin";

  const value: StoreContextValue = {
    loading,
    companies,
    stores: storesForCurrentCompany,
    currentCompanyId,
    currentStoreId,
    currentStore: currentStoreId
      ? storesForCurrentCompany.find((store) => store.id === currentStoreId) ?? null
      : null,
    viewMode,
    profileRole,
    isAdmin: profileRole === "admin",
    isManager,
    canViewNetwork,
    setCurrentCompanyId: handleChangeCompany,
    setCurrentStoreId: handleChangeStore,
    setViewMode: handleViewModeChange,
    refresh: loadData,
    getStoreIdsForQuery,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore deve ser usado dentro de um StoreProvider");
  }
  return context;
}


