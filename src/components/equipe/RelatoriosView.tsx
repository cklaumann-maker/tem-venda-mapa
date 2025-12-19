"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart4, Download, Calendar, Users, Clock, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";

type ReportData = {
  period: string;
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  terminations: number;
  totalShifts: number;
  totalHours: number;
  totalOvertime: number;
  pendingVacations: number;
  approvedVacations: number;
  pendingOvertime: number;
  approvedOvertime: number;
  averagePerformance: number;
};

export default function RelatoriosView() {
  const { getStoreIdsForQuery, viewMode } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<string>("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadReportData();
  }, [getStoreIdsForQuery, viewMode, period, startDate, endDate]);

  const loadReportData = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setReportData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let dateStart: Date;
      let dateEnd = new Date(endDate);

      switch (period) {
        case "today":
          dateStart = new Date();
          dateEnd = new Date();
          break;
        case "week":
          dateStart = new Date();
          dateStart.setDate(dateStart.getDate() - dateStart.getDay());
          dateEnd = new Date(dateStart);
          dateEnd.setDate(dateStart.getDate() + 6);
          break;
        case "month":
          dateStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          dateEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
          break;
        case "custom":
          dateStart = new Date(startDate);
          dateEnd = new Date(endDate);
          break;
        default:
          dateStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          dateEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      }

      const startStr = dateStart.toISOString().split("T")[0];
      const endStr = dateEnd.toISOString().split("T")[0];

      // Contar colaboradores
      const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds);

      const { count: activeEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active");

      // Novas admissões
      const { count: newHires } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .gte("hire_date", startStr)
        .lte("hire_date", endStr);

      // Rescisões
      const { count: terminations } = await supabase
        .from("terminations")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .gte("termination_date", startStr)
        .lte("termination_date", endStr);

      // Escalas
      const { count: totalShifts } = await supabase
        .from("employee_shifts")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .gte("shift_date", startStr)
        .lte("shift_date", endStr);

      // Horas trabalhadas e extras
      const { data: timeRecords } = await supabase
        .from("time_records")
        .select("total_hours, overtime_hours")
        .in("store_id", storeIds)
        .gte("record_date", startStr)
        .lte("record_date", endStr);

      const totalHours = timeRecords?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0;
      const totalOvertime = timeRecords?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0;

      // Férias
      const { count: pendingVacations } = await supabase
        .from("vacations")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "requested")
        .gte("start_date", startStr)
        .lte("end_date", endStr);

      const { count: approvedVacations } = await supabase
        .from("vacations")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "approved")
        .gte("start_date", startStr)
        .lte("end_date", endStr);

      // Horas extras
      const { count: pendingOvertime } = await supabase
        .from("overtime_requests")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "pending")
        .gte("request_date", startStr)
        .lte("request_date", endStr);

      const { count: approvedOvertime } = await supabase
        .from("overtime_requests")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "approved")
        .gte("request_date", startStr)
        .lte("request_date", endStr);

      // Média de performance
      const { data: reviews } = await supabase
        .from("performance_reviews")
        .select("scores")
        .in("store_id", storeIds)
        .gte("review_date", startStr)
        .lte("review_date", endStr);

      let averagePerformance = 0;
      if (reviews && reviews.length > 0) {
        const averages = reviews.map((r) => {
          const scores = r.scores || {};
          const values = Object.values(scores).filter((v) => v > 0);
          return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
        });
        averagePerformance = averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
      }

      setReportData({
        period: period === "custom" ? `${startStr} a ${endStr}` : period,
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        newHires: newHires || 0,
        terminations: terminations || 0,
        totalShifts: totalShifts || 0,
        totalHours,
        totalOvertime,
        pendingVacations: pendingVacations || 0,
        approvedVacations: approvedVacations || 0,
        pendingOvertime: pendingOvertime || 0,
        approvedOvertime: approvedOvertime || 0,
        averagePerformance,
      });
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;

    const csv = [
      ["Relatório Gerencial - Gestão de Equipe"],
      ["Período", reportData.period],
      [""],
      ["Colaboradores"],
      ["Total de Colaboradores", reportData.totalEmployees],
      ["Colaboradores Ativos", reportData.activeEmployees],
      ["Novas Admissões", reportData.newHires],
      ["Rescisões", reportData.terminations],
      [""],
      ["Escalas e Ponto"],
      ["Total de Escalas", reportData.totalShifts],
      ["Total de Horas Trabalhadas", `${reportData.totalHours.toFixed(1)}h`],
      ["Total de Horas Extras", `${reportData.totalOvertime.toFixed(1)}h`],
      [""],
      ["Férias"],
      ["Férias Pendentes", reportData.pendingVacations],
      ["Férias Aprovadas", reportData.approvedVacations],
      [""],
      ["Horas Extras"],
      ["Solicitações Pendentes", reportData.pendingOvertime],
      ["Solicitações Aprovadas", reportData.approvedOvertime],
      [""],
      ["Performance"],
      ["Média de Avaliações", reportData.averagePerformance.toFixed(1)],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-equipe-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const storeIds = getStoreIdsForQuery();
  if (!storeIds || storeIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para visualizar relatórios.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div>
                  <Label htmlFor="start_date">Data Inicial</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Data Final</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full" disabled={!reportData || loading}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando relatório...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-4">
          {/* Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.activeEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.totalEmployees} total • {reportData.newHires} novos • {reportData.terminations}{" "}
                  rescisões
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.totalOvertime.toFixed(1)}h extras • {reportData.totalShifts} escalas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Férias</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.approvedVacations}</div>
                <p className="text-xs text-muted-foreground">{reportData.pendingVacations} pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.averagePerformance.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Média de avaliações</p>
              </CardContent>
            </Card>
          </div>

          {/* Detalhamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Movimentação de Pessoal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Novas Admissões</span>
                  <span className="font-semibold text-green-600">{reportData.newHires}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Rescisões</span>
                  <span className="font-semibold text-red-600">{reportData.terminations}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-semibold">Saldo</span>
                  <span className="font-bold">
                    {reportData.newHires - reportData.terminations > 0 ? "+" : ""}
                    {reportData.newHires - reportData.terminations}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solicitações Pendentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Férias Pendentes</span>
                  <span className="font-semibold text-yellow-600">{reportData.pendingVacations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Horas Extras Pendentes</span>
                  <span className="font-semibold text-yellow-600">{reportData.pendingOvertime}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-semibold">Total Pendente</span>
                  <span className="font-bold text-yellow-600">
                    {reportData.pendingVacations + reportData.pendingOvertime}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horas Trabalhadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Horas Normais</span>
                  <span className="font-semibold">{reportData.totalHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Horas Extras</span>
                  <span className="font-semibold text-orange-600">{reportData.totalOvertime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="font-bold">
                    {(reportData.totalHours + reportData.totalOvertime).toFixed(1)}h
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escalas e Cobertura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total de Escalas</span>
                  <span className="font-semibold">{reportData.totalShifts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Média por Colaborador</span>
                  <span className="font-semibold">
                    {reportData.activeEmployees > 0
                      ? (reportData.totalShifts / reportData.activeEmployees).toFixed(1)
                      : "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Taxa de Cobertura</span>
                  <span className="font-semibold text-green-600">
                    {reportData.activeEmployees > 0
                      ? ((reportData.totalShifts / (reportData.activeEmployees * 30)) * 100).toFixed(0)
                      : "0"}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

