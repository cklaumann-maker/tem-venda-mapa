"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, List, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";
import CriarFormularioView from "./CriarFormularioView";
import ListarFormulariosView from "./ListarFormulariosView";
import RespostasView from "./RespostasView";
import ResponderFormularioView from "./ResponderFormularioView";

export default function FormulariosView() {
  const { currentStore } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [activeTab, setActiveTab] = useState<string>("listar");
  const [respondingFormId, setRespondingFormId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalResponses: 0,
    pendingResponses: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadStats();
    }
  }, [currentStore, activeTab]);

  const loadStats = async () => {
    if (!currentStore) return;
    setLoadingStats(true);
    try {
      // Contar formulários
      const { count: totalForms } = await supabase
        .from("forms")
        .select("*", { count: "exact", head: true })
        .eq("store_id", currentStore.id);

      const { count: activeForms } = await supabase
        .from("forms")
        .select("*", { count: "exact", head: true })
        .eq("store_id", currentStore.id)
        .eq("is_active", true);

      // Contar respostas
      const { count: totalResponses } = await supabase
        .from("form_responses")
        .select("*", { count: "exact", head: true })
        .eq("store_id", currentStore.id);

      setStats({
        totalForms: totalForms || 0,
        activeForms: activeForms || 0,
        totalResponses: totalResponses || 0,
        pendingResponses: 0, // Pode ser calculado depois com lógica específica
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!currentStore) {
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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Formulários</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : stats.totalForms}
            </div>
            <p className="text-xs text-muted-foreground">{stats.activeForms} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Ativos</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loadingStats ? "..." : stats.activeForms}
            </div>
            <p className="text-xs text-muted-foreground">Disponíveis para resposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? "..." : stats.totalResponses}
            </div>
            <p className="text-xs text-muted-foreground">Respostas recebidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats
                ? "..."
                : stats.totalForms > 0
                ? `${Math.round((stats.totalResponses / stats.totalForms) * 10)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">Média por formulário</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="listar" className="space-y-4">
          {respondingFormId ? (
            <ResponderFormularioView
              formId={respondingFormId}
              onSuccess={() => {
                setRespondingFormId(null);
                loadStats();
              }}
              onCancel={() => setRespondingFormId(null)}
            />
          ) : (
            <ListarFormulariosView
              onEdit={(formId) => setActiveTab("criar")}
              onStatsChange={loadStats}
              onRespond={(formId) => setRespondingFormId(formId)}
            />
          )}
        </TabsContent>

        <TabsContent value="criar" className="space-y-4">
          <CriarFormularioView onSuccess={() => {
            setActiveTab("listar");
            loadStats();
          }} />
        </TabsContent>

        <TabsContent value="respostas" className="space-y-4">
          <RespostasView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

