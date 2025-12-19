"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, BarChart3, BarChart, Calendar } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import CriarFormularioView from "./CriarFormularioView";
import ListarFormulariosView from "./ListarFormulariosView";
import RespostasView from "./RespostasView";
import ResponderFormularioView from "./ResponderFormularioView";
import DashboardView from "./DashboardView";
import CalendarView from "./CalendarView";

export default function FormulariosView() {
  const { getStoreIdsForQuery } = useStore();
  const [activeTab, setActiveTab] = useState<string>("listar");
  const [respondingFormId, setRespondingFormId] = useState<string | null>(null);

  const storeIds = getStoreIdsForQuery();
  if (!storeIds || storeIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar formulários.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formulários</h1>
          <p className="text-gray-600 mt-2">Crie e gerencie formulários para sua equipe</p>
        </div>
        <Button
          onClick={() => setActiveTab("criar")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Formulário
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="listar" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Meus Formulários
          </TabsTrigger>
          <TabsTrigger value="criar" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Criar Formulário
          </TabsTrigger>
          <TabsTrigger value="respostas" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Respostas
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Dashboards
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listar" className="space-y-4">
          {respondingFormId ? (
            <ResponderFormularioView
              formId={respondingFormId}
              onSuccess={() => {
                setRespondingFormId(null);
              }}
              onCancel={() => setRespondingFormId(null)}
            />
          ) : (
            <ListarFormulariosView
              onEdit={(formId) => setActiveTab("criar")}
              onRespond={(formId) => setRespondingFormId(formId)}
            />
          )}
        </TabsContent>

        <TabsContent value="criar" className="space-y-4">
          <CriarFormularioView onSuccess={() => {
            setActiveTab("listar");
          }} />
        </TabsContent>

        <TabsContent value="respostas" className="space-y-4">
          <RespostasView />
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <DashboardView />
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

