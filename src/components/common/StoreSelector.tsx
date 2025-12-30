"use client";

import React from "react";
import { useStore } from "@/contexts/StoreContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, Store, Network, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StoreSelector() {
  const {
    loading,
    companies,
    stores,
    currentCompanyId,
    currentStoreId,
    isAdmin,
    setCurrentCompanyId,
    setCurrentStoreId,
  } = useStore();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  // Filtrar lojas pela rede selecionada (se houver)
  const storesForCurrentNetwork = currentCompanyId
    ? stores.filter((s) => (s.networkId || s.companyId) === currentCompanyId)
    : stores;

  const currentCompany = companies.find((c) => c.id === currentCompanyId);
  const currentStore = storesForCurrentNetwork.find((s) => s.id === currentStoreId);

  // Para admins, sempre mostrar os seletores (mesmo sem redes/lojas)
  // Para outros, mostrar apenas se houver empresas
  if (companies.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap max-w-full">
      {/* Seletor de Rede - sempre mostrar para admins, ou se houver redes */}
      {(companies.length > 0 || isAdmin) && (
        <div className="flex items-center gap-1 min-w-0">
          <Network className="hidden sm:block w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Select
            value={currentCompanyId || undefined}
            onValueChange={(value) => {
              if (value && value !== "__empty__") {
                setCurrentCompanyId(value);
              }
            }}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[160px] h-7 sm:h-8 text-xs">
              <SelectValue placeholder={currentCompany?.name ?? (companies.length === 0 ? "Nenhuma rede" : "Selecione a rede")} />
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty__" disabled>
                  Nenhuma rede disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Seletor de Loja - sempre mostrar para admins, ou se houver lojas */}
      {(stores.length > 0 || isAdmin) && (
        <div className="flex items-center gap-1 min-w-0">
          <Store className="hidden sm:block w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Select
            value={currentStoreId || undefined}
            onValueChange={(value) => {
              if (value && value !== "__empty__") {
                setCurrentStoreId(value);
              }
            }}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[160px] h-7 sm:h-8 text-xs">
              <SelectValue placeholder={
                currentStoreId === "all" 
                  ? "Todas as lojas" 
                  : currentStore?.name ?? (storesForCurrentNetwork.length === 0 ? "Nenhuma loja" : "Selecione a loja")
              } />
            </SelectTrigger>
            <SelectContent>
              {storesForCurrentNetwork.length > 0 ? (
                <>
                  {isAdmin && currentCompanyId && (
                    <SelectItem value="all">Todas as lojas</SelectItem>
                  )}
                  {storesForCurrentNetwork.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </>
              ) : (
                <SelectItem value="__empty__" disabled>
                  Nenhuma loja disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

