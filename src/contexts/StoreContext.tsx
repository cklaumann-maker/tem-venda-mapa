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

type NetworkSummary = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type StoreSummary = {
  id: string;
  name: string;
  networkId?: string | null; // Nova: network_id
  networkName?: string | null; // Nova: nome da rede
  companyId?: string | null; // Compatibilidade: mantém org_id/company_id temporariamente
  companyName?: string | null; // Compatibilidade: mantém nome da empresa temporariamente
  logoUrl?: string | null;
  storeRole?: string | null;
  isActive?: boolean;
  branding?: StoreBranding;
};

type ProfileInfo = {
  full_name: string | null;
  role: string | null;
  default_store_id: string | null;
  org_id: string | null; // Compatibilidade: manter temporariamente
  network_id: string | null; // Nova: network_id
};

type ViewMode = "network" | "store";

type StoreContextValue = {
  loading: boolean;
  networks: NetworkSummary[]; // Nova: networks
  companies: NetworkSummary[]; // Compatibilidade: alias para networks
  stores: StoreSummary[];
  currentNetworkId: string | null; // Nova: network_id
  currentCompanyId: string | null; // Compatibilidade: alias para currentNetworkId
  currentStoreId: string | null;
  currentStore: StoreSummary | null;
  viewMode: ViewMode;
  profileRole: string | null;
  isAdmin: boolean;
  isManager: boolean;
  canViewNetwork: boolean;
  setCurrentNetworkId: (id: string | null) => Promise<void>; // Nova
  setCurrentCompanyId: (id: string | null) => Promise<void>; // Compatibilidade
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
  const [networks, setNetworks] = useState<NetworkSummary[]>([]);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [currentNetworkId, setCurrentNetworkIdState] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("store");
  const supabase = useMemo(() => supabaseClient(), []);

  const loadData = async () => {
    if (!user) {
      setNetworks([]);
      setStores([]);
      setProfileRole(null);
      setCurrentNetworkIdState(null);
      setCurrentStoreIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, default_store_id, org_id, network_id")
        .eq("id", user.id)
        .maybeSingle<ProfileInfo>();

      if (profileError) {
        throw profileError;
      }

      let role = profile?.role ?? null;
      setProfileRole(role);

      console.log("📋 Perfil do usuário:", {
        userId: user.id,
        userEmail: user.email,
        role,
        defaultStoreId: profile?.default_store_id,
        orgId: profile?.org_id,
        networkId: profile?.network_id,
      });

      // Se o usuário não tem role, criar perfil com role padrão
      if (!role) {
        console.warn("⚠️ Usuário sem role definido. Criando perfil com role 'seller' por padrão.");
        // Tentar criar/atualizar perfil com role padrão
        const { error: updateError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            role: "seller",
            full_name: profile?.full_name || user.email?.split("@")[0] || "Usuário",
          }, {
            onConflict: "id"
          });
        
        if (updateError) {
          console.error("❌ Erro ao atualizar perfil:", updateError);
          throw new Error("Usuário sem perfil configurado. Entre em contato com o administrador.");
        }
        
        // Recarregar perfil
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .select("full_name, role, default_store_id, org_id, network_id")
          .eq("id", user.id)
          .maybeSingle<ProfileInfo>();
        
        if (updatedProfile?.role) {
          role = updatedProfile.role;
          setProfileRole(role);
          // Atualizar profile também para usar os dados atualizados
          profile = updatedProfile;
        } else {
          throw new Error("Não foi possível criar perfil para o usuário.");
        }
      }

      let networkRows: NetworkSummary[] = [];
      let storeRows: StoreSummary[] = [];
      let userNetworkId: string | null = null;

      if (role === "admin") {
        // Admin vê todas as redes e lojas
        // Tentar buscar de networks primeiro, fallback para orgs (compatibilidade)
        const { data: networksData, error: networksError } = await supabase
          .from("networks")
          .select("id, name, logo_url")
          .eq("is_active", true)
          .order("name", { ascending: true });
        
        if (networksError && networksError.code !== "PGRST116") {
          // Se não for erro de tabela não existir, tentar orgs
          const { data: orgsData, error: orgsError } = await supabase
            .from("orgs")
            .select("id, name, logo_url")
            .order("name", { ascending: true });
          if (orgsError) throw orgsError;
          networkRows = (orgsData ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            logoUrl: row.logo_url ?? null,
          }));
        } else if (networksData) {
          networkRows = (networksData ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            logoUrl: row.logo_url ?? null,
          }));
        }

        // Criar mapas de logo de todas as redes (não apenas as que têm lojas)
        let networkMap = new Map<string, string>();
        let networkLogoMap = new Map<string, string | null>();
        networkRows.forEach((network) => {
          networkMap.set(network.id, network.name);
          networkLogoMap.set(network.id, network.logoUrl ?? null);
        });

        const { data: storesData, error: storesError } = await supabase
          .from("stores")
          .select(
            "id, name, network_id, org_id, logo_url, is_active, brand_primary_color, brand_secondary_color, brand_tagline, brand_cover_url, brand_support_email, brand_support_phone"
          )
          .order("name", { ascending: true });
        if (storesError) throw storesError;

        storeRows = (storesData ?? [])
          .filter((row) => row.is_active ?? true)
          .map((row) => {
            const networkId = row.network_id || row.org_id;
            const networkLogo = networkLogoMap.get(networkId || "") ?? null;
            return {
              id: row.id,
              name: row.name,
              networkId: row.network_id || null,
              networkName: networkMap.get(networkId || "") ?? null,
              companyId: row.org_id || row.network_id || null,
              companyName: networkMap.get(networkId || "") ?? null,
              logoUrl: networkLogo,
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
            };
          });
      } else {
        // Usuários não-admin veem apenas suas redes/lojas
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
              "id, name, network_id, org_id, logo_url, is_active, brand_primary_color, brand_secondary_color, brand_tagline, brand_cover_url, brand_support_email, brand_support_phone"
            )
            .in("id", storeIds);
          if (storesError) throw storesError;

          const networkIds = [...new Set((storesData ?? []).map((s) => s.network_id || s.org_id).filter(Boolean))];
          
          let networkMap = new Map<string, string>();
          let networkLogoMap = new Map<string, string | null>();
          
          if (networkIds.length > 0) {
            const { data: networksData } = await supabase
              .from("networks")
              .select("id, name, logo_url")
              .eq("is_active", true)
              .in("id", networkIds);
            if (networksData) {
              networkMap = new Map((networksData ?? []).map((n) => [n.id, n.name]));
              networkLogoMap = new Map((networksData ?? []).map((n) => [n.id, n.logo_url ?? null]));
            }
            
            if (networkMap.size === 0) {
              const { data: orgsData } = await supabase
                .from("orgs")
                .select("id, name, logo_url")
                .in("id", networkIds);
              if (orgsData) {
                networkMap = new Map((orgsData ?? []).map((o) => [o.id, o.name]));
                networkLogoMap = new Map((orgsData ?? []).map((o) => [o.id, o.logo_url ?? null]));
                networkRows = (orgsData ?? []).map((row) => ({
                  id: row.id,
                  name: row.name,
                }));
              }
            } else {
              networkRows = (networksData ?? []).map((row) => ({
                id: row.id,
                name: row.name,
              }));
            }
          }

          // Se o usuário tem network_id no perfil, usar como rede padrão
          userNetworkId = profile?.network_id || profile?.org_id || networkIds[0] ?? null;

          const storeMap = new Map<
            string,
            {
              name: string;
              networkId: string | null;
              networkName: string | null;
              companyId: string | null;
              companyName: string | null;
              logoUrl: string | null;
              isActive: boolean;
              branding: StoreBranding | undefined;
            }
          >();
          (storesData ?? []).forEach((row) => {
            const networkId = row.network_id || row.org_id;
            const networkLogo = networkLogoMap.get(networkId || "") ?? null;
            storeMap.set(row.id, {
              name: row.name,
              networkId: row.network_id || null,
              networkName: networkMap.get(networkId || "") ?? null,
              companyId: row.org_id || row.network_id || null,
              companyName: networkMap.get(networkId || "") ?? null,
              logoUrl: networkLogo,
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
              if (!meta || !meta.isActive) return null;
              const storeSummary: StoreSummary = {
                id: row.store_id,
                name: meta.name ?? "Loja",
                networkId: meta.networkId ?? null,
                networkName: meta.networkName ?? null,
                companyId: meta.companyId ?? null, // Compatibilidade
                companyName: meta.companyName ?? null, // Compatibilidade
                logoUrl: meta.logoUrl ?? null,
                storeRole: row.role,
                isActive: meta.isActive,
                branding: meta.branding,
              };
              return storeSummary;
            })
            .filter((row): row is StoreSummary => row !== null);
          storeRows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        }
      }

      console.log("📊 Dados carregados:", {
        networksCount: networkRows.length,
        storesCount: storeRows.length,
        networkNames: networkRows.map(n => n.name),
        storeNames: storeRows.map(s => s.name),
      });

      setNetworks(networkRows);
      setStores(storeRows);

      // Definir rede atual
      const preferredNetworkId = userNetworkId ?? networkRows[0]?.id ?? null;
      console.log("🔗 Rede selecionada:", preferredNetworkId);
      setCurrentNetworkIdState(preferredNetworkId);

      // Filtrar lojas pela rede selecionada
      const storesForNetwork = preferredNetworkId
        ? storeRows.filter((s) => (s.networkId || s.companyId) === preferredNetworkId)
        : storeRows;

      // Definir loja atual
      // Se for admin, começar com "Todas as lojas" se houver lojas na rede
      if (role === "admin" && storesForNetwork.length > 0) {
        setCurrentStoreIdState("all");
      } else {
        const preferredStoreId = profile?.default_store_id;
        const fallbackStoreId = storesForNetwork[0]?.id ?? null;
        const resolvedStoreId =
          preferredStoreId && storesForNetwork.some((store) => store.id === preferredStoreId)
            ? preferredStoreId
            : fallbackStoreId;
        setCurrentStoreIdState(resolvedStoreId);
      }

      // Definir modo de visualização padrão
      // Gerentes podem ver rede, outros apenas loja
      const isManager = role === "manager" || role === "owner";
      setViewModeState(isManager ? "store" : "store");
    } catch (error) {
      console.error("❌ Erro ao carregar contexto de lojas:", error);
      console.error("❌ Detalhes do erro:", JSON.stringify(error, null, 2));
      setNetworks([]);
      setStores([]);
      setCurrentNetworkIdState(null);
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

  const handleChangeNetwork = async (id: string | null) => {
    if (currentNetworkId === id) return;
    setCurrentNetworkIdState(id);

    // Filtrar lojas pela nova rede
    const storesForNetwork = id
      ? stores.filter((s) => (s.networkId || s.companyId) === id)
      : stores;

    // Se estava vendo "Todas as lojas", manter "Todas as lojas" da nova rede
    if (currentStoreId === "all") {
      // Manter "all" mas garantir que está na nova rede
      return;
    }

    // Se a loja atual não pertence à nova rede, ajustar
    const currentStoreBelongsToNetwork = id
      ? storesForNetwork.some((s) => s.id === currentStoreId)
      : true;

    // Se é admin e a loja atual não pertence à rede, permitir escolher "Todas as lojas" ou primeira loja
    if (!currentStoreBelongsToNetwork) {
      const isAdmin = profileRole === "admin";
      if (isAdmin && storesForNetwork.length > 0) {
        // Admin pode escolher "Todas as lojas" automaticamente, ou primeira loja
        await handleChangeStore("all");
      } else if (storesForNetwork.length > 0) {
        // Não-admin: selecionar primeira loja da rede
        await handleChangeStore(storesForNetwork[0].id);
      }
    }
  };

  // Compatibilidade: alias para handleChangeNetwork
  const handleChangeCompany = handleChangeNetwork;

  const handleChangeStore = async (id: string) => {
    if (currentStoreId === id) return;
    setCurrentStoreIdState(id);
    if (!user) return;

    // Se selecionou "Todas as lojas", não salvar no perfil (é apenas visualização)
    if (id === "all") {
      return;
    }

    try {
      await supabase
        .from("profiles")
        .update({ default_store_id: id })
        .eq("id", user.id);
    } catch (error) {
      console.error("Erro ao atualizar loja padrão:", error);
      await loadData();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewModeState(mode);
  };

  // Helper para obter store IDs baseado no modo de visualização
  const getStoreIdsForQuery = (): string[] | null => {
    if (currentStoreId === "all") {
      if (!currentNetworkId) return null;
      return stores.filter((s) => (s.networkId || s.companyId) === currentNetworkId).map((s) => s.id);
    }
    if (viewMode === "network") {
      if (!currentNetworkId) return null;
      return stores.filter((s) => (s.networkId || s.companyId) === currentNetworkId).map((s) => s.id);
    } else {
      return currentStoreId ? [currentStoreId] : null;
    }
  };

  // Lojas filtradas pela rede atual
  const storesForCurrentNetwork = currentNetworkId
    ? stores.filter((s) => (s.networkId || s.companyId) === currentNetworkId)
    : stores;

  const isManager = profileRole === "manager" || profileRole === "owner";
  const canViewNetwork = isManager || profileRole === "admin";

  // Quando "todas as lojas" está selecionado, criar um store fictício com logo da rede
  const getCurrentStore = (): StoreSummary | null => {
    if (currentStoreId === "all") {
      const currentNetwork = networks.find((n) => n.id === currentNetworkId);
      if (currentNetworkId && currentNetwork) {
        // Usar logo da rede diretamente (não precisa buscar de loja)
        const networkLogoUrl = currentNetwork.logoUrl ?? null;
        // Se não houver logo na rede, tentar buscar de uma loja da rede como fallback
        const networkStore = storesForCurrentNetwork.find((s) => (s.networkId || s.companyId) === currentNetworkId);
        return {
          id: "all",
          name: "Todas as lojas",
          networkId: currentNetworkId,
          networkName: currentNetwork.name,
          companyId: currentNetworkId,
          companyName: currentNetwork.name,
          logoUrl: networkLogoUrl ?? networkStore?.logoUrl ?? null,
          storeRole: "admin",
          isActive: true,
        };
      }
      return null;
    }
    return currentStoreId
      ? storesForCurrentNetwork.find((store) => store.id === currentStoreId) ?? null
      : null;
  };

  const value: StoreContextValue = {
    loading,
    networks,
    companies: networks, // Compatibilidade: alias para networks
    stores: storesForCurrentNetwork,
    currentNetworkId,
    currentCompanyId: currentNetworkId, // Compatibilidade: alias para currentNetworkId
    currentStoreId,
    currentStore: getCurrentStore(),
    viewMode,
    profileRole,
    isAdmin: profileRole === "admin",
    isManager,
    canViewNetwork,
    setCurrentNetworkId: handleChangeNetwork,
    setCurrentCompanyId: handleChangeCompany, // Compatibilidade
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


