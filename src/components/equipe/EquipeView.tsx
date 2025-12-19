"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Clock, Clock3, FileText, UserPlus, Plane, FileX, BarChart3, BarChart4 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";
import ColaboradoresView from "./ColaboradoresView";
import EscalasView from "./EscalasView";
import PontoView from "./PontoView";
import HorasExtrasView from "./HorasExtrasView";
import AdmissaoView from "./AdmissaoView";
import DocumentosView from "./DocumentosView";
import FeriasView from "./FeriasView";
import RescisaoView from "./RescisaoView";
import PerformanceView from "./PerformanceView";
import RelatoriosView from "./RelatoriosView";

export default function EquipeView() {
  const { getStoreIdsForQuery, viewMode } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [activeTab, setActiveTab] = useState<string>("colaboradores");
  const [metrics, setMetrics] = useState({
    activeEmployees: 0,
    monthlyShifts: 0,
    monthlyOvertime: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const loadMetrics = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setMetrics({
        activeEmployees: 0,
        monthlyShifts: 0,
        monthlyOvertime: 0,
      });
      setLoadingMetrics(false);
      return;
    }

    setLoadingMetrics(true);
    try {
      // Contar colaboradores ativos
      const { count: employeesCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active");

      // Contar escalas do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const { count: shiftsCount } = await supabase
        .from("employee_shifts")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .gte("shift_date", startOfMonth)
        .lte("shift_date", endOfMonth);

      // Somar horas extras do mês
      const { data: overtimeData } = await supabase
        .from("time_records")
        .select("overtime_hours")
        .in("store_id", storeIds)
        .gte("record_date", startOfMonth)
        .lte("record_date", endOfMonth);

      const totalOvertime =
        overtimeData?.reduce((sum, record) => sum + (record.overtime_hours || 0), 0) || 0;

      setMetrics({
        activeEmployees: employeesCount || 0,
        monthlyShifts: shiftsCount || 0,
        monthlyOvertime: totalOvertime,
      });
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStoreIdsForQuery, viewMode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Equipe</h1>
          <p className="text-gray-600 mt-2">Gerencie colaboradores, escalas e ponto</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingMetrics ? "..." : metrics.activeEmployees}
            </div>
            <p className="text-xs text-muted-foreground">Total de funcionários</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalas do Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingMetrics ? "..." : metrics.monthlyShifts}
            </div>
            <p className="text-xs text-muted-foreground">Escalas cadastradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingMetrics ? "..." : `${metrics.monthlyOvertime.toFixed(1)}h`}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10 gap-1">
          <TabsTrigger value="colaboradores" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Colaboradores</span>
          </TabsTrigger>
          <TabsTrigger value="escalas" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Escalas</span>
          </TabsTrigger>
          <TabsTrigger value="ponto" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Ponto</span>
          </TabsTrigger>
          <TabsTrigger value="horas-extras" className="flex items-center gap-2">
            <Clock3 className="w-4 h-4" />
            <span className="hidden sm:inline">Horas Extras</span>
          </TabsTrigger>
          <TabsTrigger value="admissao" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Admissão</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="ferias" className="flex items-center gap-2">
            <Plane className="w-4 h-4" />
            <span className="hidden sm:inline">Férias</span>
          </TabsTrigger>
          <TabsTrigger value="rescisao" className="flex items-center gap-2">
            <FileX className="w-4 h-4" />
            <span className="hidden sm:inline">Rescisão</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2">
            <BarChart4 className="w-4 h-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores" className="space-y-4">
          <ColaboradoresView />
        </TabsContent>

        <TabsContent value="escalas" className="space-y-4">
          <EscalasView />
        </TabsContent>

        <TabsContent value="ponto" className="space-y-4">
          <PontoView />
        </TabsContent>

        <TabsContent value="horas-extras" className="space-y-4">
          <HorasExtrasView />
        </TabsContent>

        <TabsContent value="admissao" className="space-y-4">
          <AdmissaoView />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <DocumentosView />
        </TabsContent>

        <TabsContent value="ferias" className="space-y-4">
          <FeriasView />
        </TabsContent>

        <TabsContent value="rescisao" className="space-y-4">
          <RescisaoView />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceView />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <RelatoriosView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

