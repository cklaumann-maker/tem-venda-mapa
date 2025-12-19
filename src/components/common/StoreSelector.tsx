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
    viewMode,
    canViewNetwork,
    setCurrentCompanyId,
    setCurrentStoreId,
    setViewMode,
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
      {/* Seletor de Empresa (apenas se houver mais de uma) */}
      {companies.length > 1 && (
        <div className="flex items-center gap-1 min-w-0">
          <Building2 className="hidden sm:block w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Select
            value={currentCompanyId ?? ""}
            onValueChange={(value) => setCurrentCompanyId(value)}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[160px] h-7 sm:h-8 text-xs">
              <SelectValue placeholder="Empresa" />
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
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggle de Modo de Visualização (apenas para gerentes/admins) */}
      {canViewNetwork && stores.length > 1 && (
        <div className="flex items-center gap-0.5 border rounded-md p-0.5 flex-shrink-0">
          <Button
            type="button"
            variant={viewMode === "store" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("store")}
            className={cn(
              "h-6 sm:h-7 px-1.5 sm:px-2 text-xs",
              viewMode === "store" && "bg-primary text-primary-foreground"
            )}
          >
            <Store className="w-3 h-3" />
            <span className="hidden md:inline ml-1">Loja</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "network" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("network")}
            className={cn(
              "h-6 sm:h-7 px-1.5 sm:px-2 text-xs",
              viewMode === "network" && "bg-primary text-primary-foreground"
            )}
          >
            <Network className="w-3 h-3" />
            <span className="hidden md:inline ml-1">Rede</span>
          </Button>
        </div>
      )}

      {/* Indicador de modo atual - oculto em mobile */}
      {viewMode === "network" && (
        <div className="hidden xl:flex text-xs text-muted-foreground items-center gap-1 min-w-0">
          <Network className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Visualizando todas as lojas de {currentCompany?.name}</span>
        </div>
      )}
    </div>
  );
}

