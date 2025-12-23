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

  const currentCompany = companies.find((c) => c.id === currentCompanyId);
  const currentStore = stores.find((s) => s.id === currentStoreId);

  // Se não há empresas ou lojas, não mostrar o seletor
  if (companies.length === 0 || stores.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap max-w-full">
      {/* Seletor de Rede (apenas se houver mais de uma) */}
      {companies.length > 1 && (
        <div className="flex items-center gap-1 min-w-0">
          <Network className="hidden sm:block w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Select
            value={currentCompanyId ?? ""}
            onValueChange={(value) => setCurrentCompanyId(value)}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[160px] h-7 sm:h-8 text-xs">
              <SelectValue placeholder="Rede" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Seletor de Loja */}
      <div className="flex items-center gap-1 min-w-0">
        <Store className="hidden sm:block w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Select
          value={currentStoreId ?? ""}
          onValueChange={(value) => setCurrentStoreId(value)}
          disabled={stores.length === 0}
        >
          <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[160px] h-7 sm:h-8 text-xs">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            {isAdmin && stores.length > 0 && (
              <SelectItem value="all">Todas as lojas</SelectItem>
            )}
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

