"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type StoreSummary = {
  id: string;
  name: string;
  storeRole?: string | null;
};

type ProfileInfo = {
  full_name: string | null;
  role: string | null;
  default_store_id: string | null;
};

type StoreContextValue = {
  loading: boolean;
  stores: StoreSummary[];
  currentStoreId: string | null;
  currentStore: StoreSummary | null;
  profileRole: string | null;
  isAdmin: boolean;
  setCurrentStoreId: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const supabase = useMemo(() => supabaseClient(), []);

  const loadData = async () => {
    if (!user) {
      setStores([]);
      setProfileRole(null);
      setCurrentStoreIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, default_store_id")
        .eq("id", user.id)
        .maybeSingle<ProfileInfo>();

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role ?? null;
      setProfileRole(role);

      let storeRows: StoreSummary[] = [];

      if (role === "admin") {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        storeRows = (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          storeRole: "admin",
        }));
      } else {
        const { data: memberData, error: memberError } = await supabase
          .from("store_members")
          .select("store_id, role")
          .eq("user_id", user.id);
        if (memberError) throw memberError;

        const memberRows = memberData ?? [];
        const storeIds = memberRows.map((row) => row.store_id).filter(Boolean);

        if (storeIds.length > 0) {
          const { data: storesData, error: storesError } = await supabase
            .from("stores")
            .select("id, name")
            .in("id", storeIds);
          if (storesError) throw storesError;

          const storeMap = new Map<string, string>();
          (storesData ?? []).forEach((row) => {
            storeMap.set(row.id, row.name);
          });

          storeRows = memberRows.map((row) => ({
            id: row.store_id,
            name: storeMap.get(row.store_id) ?? "Loja",
            storeRole: row.role,
          }));
          storeRows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        } else {
          storeRows = [];
        }
      }

      setStores(storeRows);

      const preferredId = profile?.default_store_id;
      const fallbackId = storeRows[0]?.id ?? null;
      const resolvedId =
        preferredId && storeRows.some((store) => store.id === preferredId)
          ? preferredId
          : fallbackId;

      setCurrentStoreIdState(resolvedId);
    } catch (error) {
      console.error("Erro ao carregar contexto de lojas:", error);
      setStores([]);
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

  const value: StoreContextValue = {
    loading,
    stores,
    currentStoreId,
    currentStore: currentStoreId
      ? stores.find((store) => store.id === currentStoreId) ?? null
      : null,
    profileRole,
    isAdmin: profileRole === "admin",
    setCurrentStoreId: handleChangeStore,
    refresh: loadData,
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


