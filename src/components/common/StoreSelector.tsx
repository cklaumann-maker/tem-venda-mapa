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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Seletor de Empresa (apenas se houver mais de uma) */}
      {companies.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select
            value={currentCompanyId ?? ""}
            onValueChange={(value) => setCurrentCompanyId(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione a empresa" />
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
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4 text-muted-foreground" />
        <Select
          value={currentStoreId ?? ""}
          onValueChange={(value) => setCurrentStoreId(value)}
          disabled={stores.length === 0}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione a loja" />
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
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            type="button"
            variant={viewMode === "store" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("store")}
            className={cn(
              "h-7 px-3 text-xs",
              viewMode === "store" && "bg-primary text-primary-foreground"
            )}
          >
            <Store className="w-3 h-3 mr-1" />
            Loja
          </Button>
          <Button
            type="button"
            variant={viewMode === "network" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("network")}
            className={cn(
              "h-7 px-3 text-xs",
              viewMode === "network" && "bg-primary text-primary-foreground"
            )}
          >
            <Network className="w-3 h-3 mr-1" />
            Rede
          </Button>
        </div>
      )}

      {/* Indicador de modo atual */}
      {viewMode === "network" && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Network className="w-3 h-3" />
          <span>Visualizando todas as lojas de {currentCompany?.name}</span>
        </div>
      )}
    </div>
  );
}




