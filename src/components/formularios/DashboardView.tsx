"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Download,
  Calendar
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";

type Form = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  allow_multiple_responses: boolean;
  requires_authentication: boolean;
  questions: any[];
  created_at: string;
};

type FormResponse = {
  id: string;
  form_id: string;
  employee_id: string | null;
  employee_name?: string;
  responses: Record<string, any>;
  submitted_at: string;
};

type FormStats = {
  form: Form;
  totalResponses: number;
  uniqueRespondents: number;
  totalEmployees: number;
  responseRate: number;
  lastResponseDate: string | null;
  responsesByQuestion: Record<string, any>;
  responsesOverTime: Array<{ date: string; count: number }>;
  nonRespondents: Array<{ id: string; name: string }>;
};

const COLORS = {
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
  primary: "#3b82f6",
  gray: "#6b7280",
};

export default function DashboardView() {
  const { getStoreIdsForQuery, viewMode } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState({
    totalActiveForms: 0,
    averageResponsesPerDay: 0,
    totalResponses: 0,
    lastResponseDate: null as string | null,
  });
  const [formStats, setFormStats] = useState<FormStats | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);

  useEffect(() => {
    loadData();
  }, [getStoreIdsForQuery, viewMode, periodFilter]);

  useEffect(() => {
    if (selectedFormId !== "all" && forms.length > 0) {
      loadFormStats(selectedFormId);
    } else {
      setFormStats(null);
    }
  }, [selectedFormId, forms, periodFilter]);

  const loadData = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setForms([]);
      setOverview({
        totalActiveForms: 0,
        averageResponsesPerDay: 0,
        totalResponses: 0,
        lastResponseDate: null,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Carregar formulários ativos
      const { data: formsData, error: formsError } = await supabase
        .from("forms")
        .select("*")
        .in("store_id", storeIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (formsError) throw formsError;
      setForms((formsData || []) as Form[]);

      // Contar colaboradores ativos
      const { count: employeesCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active");

      setTotalEmployees(employeesCount || 0);

      // Calcular overview
      const startDate = getStartDate(parseInt(periodFilter));
      const { data: allResponses } = await supabase
        .from("form_responses")
        .select("form_id, employee_id, submitted_at")
        .in("store_id", storeIds)
        .gte("submitted_at", startDate);

      const activeForms = formsData || [];
      const totalResponses = allResponses?.length || 0;
      
      // Calcular média de respostas por dia
      const periodDays = parseInt(periodFilter);
      const averageResponsesPerDay = periodDays > 0 
        ? totalResponses / periodDays 
        : 0;

      // Última resposta
      const { data: lastResponse } = await supabase
        .from("form_responses")
        .select("submitted_at")
        .in("store_id", storeIds)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setOverview({
        totalActiveForms: activeForms.length,
        averageResponsesPerDay: averageResponsesPerDay,
        totalResponses,
        lastResponseDate: lastResponse?.submitted_at || null,
      });

      // Se houver apenas um formulário, selecionar automaticamente
      if (activeForms.length === 1 && selectedFormId === "all") {
        setSelectedFormId(activeForms[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      setError("Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadFormStats = async (formId: string) => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setFormStats(null);
      return;
    }

    setLoading(true);

    try {
      const form = forms.find(f => f.id === formId);
      if (!form) return;

      // Buscar total de colaboradores ativos
      const { count: employeesCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active");

      const startDate = getStartDate(parseInt(periodFilter));

      // Carregar todas as respostas do formulário
      const { data: responsesData, error: responsesError } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .in("store_id", storeIds)
        .gte("submitted_at", startDate)
        .order("submitted_at", { ascending: false });

      if (responsesError) throw responsesError;

      const responses = (responsesData || []) as FormResponse[];

      // Buscar nomes dos colaboradores
      const responsesWithNames = await Promise.all(
        responses.map(async (resp) => {
          if (resp.employee_id) {
            const { data: employeeData } = await supabase
              .from("employees")
              .select("name")
              .eq("id", resp.employee_id)
              .maybeSingle();
            return {
              ...resp,
              employee_name: employeeData?.name || "Colaborador não encontrado",
            };
          }
          return { ...resp, employee_name: "Anônimo" };
        })
      );

      // Calcular estatísticas
      const totalResponses = responses.length;
      const uniqueRespondents = new Set(
        responses.map(r => r.employee_id).filter(Boolean)
      ).size;
      
      const formTotalEmployees = form.requires_authentication 
        ? (employeesCount || 0)
        : totalResponses; // Se não requer autenticação, usar total de respostas como referência

      const responseRate = formTotalEmployees > 0 
        ? (uniqueRespondents / formTotalEmployees) * 100 
        : 0;

      // Análise de respostas por pergunta
      const responsesByQuestion: Record<string, any> = {};
      
      form.questions.forEach((question: any) => {
        const questionId = question.id;
        const questionResponses = responsesWithNames
          .map(r => r.responses[questionId])
          .filter(Boolean);

        if (question.type === "radio" || question.type === "select") {
          // Contar opções selecionadas
          const optionCounts: Record<string, number> = {};
          questionResponses.forEach((response: any) => {
            const value = String(response);
            optionCounts[value] = (optionCounts[value] || 0) + 1;
          });
          responsesByQuestion[questionId] = {
            type: question.type,
            title: question.title,
            options: Object.entries(optionCounts).map(([value, count]) => ({
              value,
              count,
              percentage: (count / questionResponses.length) * 100,
            })),
            total: questionResponses.length,
          };
        } else if (question.type === "checkbox") {
          // Contar opções marcadas
          const optionCounts: Record<string, number> = {};
          questionResponses.forEach((response: any) => {
            if (Array.isArray(response)) {
              response.forEach((value: any) => {
                const strValue = String(value);
                optionCounts[strValue] = (optionCounts[strValue] || 0) + 1;
              });
            }
          });
          responsesByQuestion[questionId] = {
            type: question.type,
            title: question.title,
            options: Object.entries(optionCounts).map(([value, count]) => ({
              value,
              count,
              percentage: (count / questionResponses.length) * 100,
            })),
            total: questionResponses.length,
          };
        } else if (question.type === "number") {
          // Estatísticas numéricas
          const numbers = questionResponses
            .map((r: any) => parseFloat(r))
            .filter((n: number) => !isNaN(n));
          
          if (numbers.length > 0) {
            const sum = numbers.reduce((a, b) => a + b, 0);
            const sorted = [...numbers].sort((a, b) => a - b);
            responsesByQuestion[questionId] = {
              type: question.type,
              title: question.title,
              average: sum / numbers.length,
              median: sorted[Math.floor(sorted.length / 2)],
              min: Math.min(...numbers),
              max: Math.max(...numbers),
              total: numbers.length,
            };
          }
        } else {
          // Texto, textarea, etc.
          responsesByQuestion[questionId] = {
            type: question.type,
            title: question.title,
            total: questionResponses.length,
            sample: questionResponses.slice(0, 5).map((r: any) => String(r)),
          };
        }
      });

      // Respostas ao longo do tempo
      const responsesByDate: Record<string, number> = {};
      responses.forEach((resp) => {
        const date = new Date(resp.submitted_at).toISOString().split("T")[0];
        responsesByDate[date] = (responsesByDate[date] || 0) + 1;
      });

      const responsesOverTime = Object.entries(responsesByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Colaboradores que não responderam
      const respondentIds = new Set(
        responses.map(r => r.employee_id).filter(Boolean)
      );
      
      let nonRespondents: Array<{ id: string; name: string }> = [];
      if (form.requires_authentication) {
        const { data: allEmployees } = await supabase
          .from("employees")
          .select("id, name")
          .in("store_id", storeIds)
          .eq("status", "active");

        nonRespondents = (allEmployees || [])
          .filter(emp => !respondentIds.has(emp.id))
          .map(emp => ({ id: emp.id, name: emp.name }));
      }

      const lastResponse = responses.length > 0 ? responses[0].submitted_at : null;

      setFormStats({
        form,
        totalResponses,
        uniqueRespondents,
        totalEmployees: formTotalEmployees,
        responseRate,
        lastResponseDate: lastResponse,
        responsesByQuestion,
        responsesOverTime,
        nonRespondents,
      });
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas do formulário:", error);
      setError("Não foi possível carregar as estatísticas do formulário.");
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const getResponseRateColor = (rate: number): string => {
    if (rate >= 80) return COLORS.success;
    if (rate >= 50) return COLORS.warning;
    return COLORS.danger;
  };

  const getResponseRateIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (rate >= 50) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const storeIds = getStoreIdsForQuery();
  if (!storeIds || storeIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para visualizar o dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : overview.totalActiveForms}
            </div>
            <p className="text-xs text-muted-foreground">Total de formulários</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas por Dia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${overview.averageResponsesPerDay.toFixed(1)}`}
            </div>
            <p className="text-xs text-muted-foreground">Média no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : overview.totalResponses}
            </div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sm">
              {loading ? "..." : overview.lastResponseDate 
                ? new Date(overview.lastResponseDate).toLocaleDateString("pt-BR")
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.lastResponseDate 
                ? new Date(overview.lastResponseDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : "Sem respostas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Selecionar Formulário</label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um formulário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários (visão geral)</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise Individual do Formulário */}
      {selectedFormId !== "all" && formStats && (
        <div className="space-y-6">
          {/* Status do Formulário */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getResponseRateIcon(formStats.responseRate)}
                  <div>
                    <CardTitle>{formStats.form.title}</CardTitle>
                    {formStats.form.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formStats.form.description}
                      </p>
                    )}
                  </div>
                </div>
                <div 
                  className="px-4 py-2 rounded-lg text-white font-bold"
                  style={{ backgroundColor: getResponseRateColor(formStats.responseRate) }}
                >
                  {formStats.responseRate.toFixed(1)}%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Respostas</p>
                  <p className="text-2xl font-bold">{formStats.totalResponses}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Colaboradores Únicos</p>
                  <p className="text-2xl font-bold">{formStats.uniqueRespondents}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Colaboradores</p>
                  <p className="text-2xl font-bold">{formStats.totalEmployees}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Resposta</p>
                  <p className="text-lg font-semibold">
                    {formStats.lastResponseDate
                      ? new Date(formStats.lastResponseDate).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Gráfico de Taxa de Resposta */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Taxa de Resposta</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Responderam</span>
                    <span className="font-semibold">
                      {formStats.uniqueRespondents} / {formStats.totalEmployees}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{
                        width: `${Math.min((formStats.uniqueRespondents / formStats.totalEmployees) * 100, 100)}%`,
                        backgroundColor: getResponseRateColor(formStats.responseRate),
                      }}
                    >
                      {formStats.responseRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Respostas */}
          {formStats.responsesOverTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Respostas ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formStats.responsesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      name="Respostas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Análise por Pergunta */}
          {Object.keys(formStats.responsesByQuestion).length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Análise por Pergunta</h2>
              {Object.entries(formStats.responsesByQuestion).map(([questionId, stats]: [string, any]) => (
                <Card key={questionId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{stats.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stats.total} resposta{stats.total !== 1 ? "s" : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {stats.type === "radio" || stats.type === "select" ? (
                      <div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stats.options}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="value" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill={COLORS.primary} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                          {stats.options.map((opt: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{opt.value}</span>
                              <span className="font-semibold">
                                {opt.count} ({opt.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : stats.type === "checkbox" ? (
                      <div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stats.options}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="value" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill={COLORS.primary} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                          {stats.options.map((opt: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{opt.value}</span>
                              <span className="font-semibold">
                                {opt.count} ({opt.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : stats.type === "number" ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Média</p>
                          <p className="text-2xl font-bold">{stats.average.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mediana</p>
                          <p className="text-2xl font-bold">{stats.median.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mínimo</p>
                          <p className="text-2xl font-bold">{stats.min}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Máximo</p>
                          <p className="text-2xl font-bold">{stats.max}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Exemplos de respostas:</p>
                        <div className="space-y-2">
                          {stats.sample.map((sample: string, idx: number) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                              {sample.length > 200 ? `${sample.substring(0, 200)}...` : sample}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Colaboradores que Não Responderam */}
          {formStats.nonRespondents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Colaboradores que Não Responderam</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formStats.nonRespondents.length} colaborador{formStats.nonRespondents.length !== 1 ? "es" : ""} pendente{formStats.nonRespondents.length !== 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formStats.nonRespondents.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">{emp.name}</span>
                      <Button variant="outline" size="sm" disabled>
                        Enviar Lembrete (em breve)
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {loading && selectedFormId !== "all" && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando estatísticas...</p>
        </div>
      )}

      {selectedFormId === "all" && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Selecione um formulário para ver análises detalhadas</p>
            <p className="text-sm mt-2">
              Escolha um formulário no filtro acima para visualizar estatísticas individuais, 
              gráficos de respostas e análises por pergunta.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

