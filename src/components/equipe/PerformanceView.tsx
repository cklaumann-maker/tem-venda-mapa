"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Plus, Star, TrendingUp, Loader2, AlertCircle, Target } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type PerformanceReview = {
  id: string;
  employee_id: string;
  employee_name?: string;
  review_period: string;
  review_date: string;
  scores: Record<string, number>;
  comments: string | null;
  strengths: string | null;
  improvement_areas: string | null;
  development_plan: Record<string, any>;
  reviewer_id: string | null;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
};

const REVIEW_CRITERIA = [
  { key: "sales_performance", label: "Desempenho em Vendas", max: 10 },
  { key: "customer_service", label: "Atendimento ao Cliente", max: 10 },
  { key: "technical_knowledge", label: "Conhecimento Técnico", max: 10 },
  { key: "punctuality", label: "Pontualidade", max: 10 },
  { key: "teamwork", label: "Trabalho em Equipe", max: 10 },
  { key: "initiative", label: "Iniciativa", max: 10 },
  { key: "communication", label: "Comunicação", max: 10 },
  { key: "problem_solving", label: "Resolução de Problemas", max: 10 },
];

const REVIEW_PERIODS = [
  { value: "Q1", label: "1º Trimestre" },
  { value: "Q2", label: "2º Trimestre" },
  { value: "Q3", label: "3º Trimestre" },
  { value: "Q4", label: "4º Trimestre" },
  { value: "annual", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

export default function PerformanceView() {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    employee_id: "",
    review_period: "Q1",
    review_date: new Date().toISOString().split("T")[0],
    scores: {} as Record<string, number>,
    comments: "",
    strengths: "",
    improvement_areas: "",
  });

  useEffect(() => {
    loadEmployees();
    loadReviews();
  }, [getStoreIdsForQuery, viewMode, periodFilter]);

  const loadEmployees = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setEmployees([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("id, name")
        .in("store_id", storeIds)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadReviews = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("performance_reviews")
        .select(`
          *,
          employees!inner(name)
        `)
        .in("store_id", storeIds)
        .order("review_date", { ascending: false });

      if (periodFilter !== "all") {
        query = query.eq("review_period", periodFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const reviewsWithNames = (data || []).map((rev: any) => ({
        ...rev,
        employee_name: rev.employees?.name || "",
        scores: rev.scores || {},
      }));

      setReviews(reviewsWithNames as PerformanceReview[]);
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
      setError("Não foi possível carregar as avaliações de performance.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStoreId || !user || !formData.employee_id) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("performance_reviews").insert({
        employee_id: formData.employee_id,
        store_id: currentStoreId!,
        review_period: formData.review_period,
        review_date: formData.review_date,
        scores: formData.scores,
        comments: formData.comments.trim() || null,
        strengths: formData.strengths.trim() || null,
        improvement_areas: formData.improvement_areas.trim() || null,
        development_plan: {},
        reviewer_id: user.id,
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        review_period: "Q1",
        review_date: new Date().toISOString().split("T")[0],
        scores: {},
        comments: "",
        strengths: "",
        improvement_areas: "",
      });
      await loadReviews();
    } catch (error: any) {
      console.error("Erro ao salvar avaliação:", error);
      setError(error.message || "Não foi possível salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  };

  const calculateAverage = (scores: Record<string, number>) => {
    const values = Object.values(scores).filter((v) => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar avaliações de performance.
        </CardContent>
      </Card>
    );
  }

  const canManage = isAdmin || true;

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-800 hover:text-red-900"
            >
              ✕
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {REVIEW_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setFormData({
                employee_id: "",
                review_period: "Q1",
                review_date: new Date().toISOString().split("T")[0],
                scores: {},
                comments: "",
                strengths: "",
                improvement_areas: "",
              });
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Avaliação
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Avaliação de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="employee">Colaborador *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="review_period">Período *</Label>
                  <Select
                    value={formData.review_period}
                    onValueChange={(value) => setFormData({ ...formData, review_period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="review_date">Data da Avaliação *</Label>
                  <Input
                    id="review_date"
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Critérios de Avaliação */}
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Critérios de Avaliação (0-10)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REVIEW_CRITERIA.map((criterion) => (
                    <div key={criterion.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={criterion.key}>{criterion.label}</Label>
                        <span className="text-sm text-muted-foreground">
                          {formData.scores[criterion.key] || 0} / {criterion.max}
                        </span>
                      </div>
                      <Input
                        id={criterion.key}
                        type="number"
                        min="0"
                        max={criterion.max}
                        step="0.5"
                        value={formData.scores[criterion.key] || ""}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            scores: {
                              ...formData.scores,
                              [criterion.key]: Math.min(Math.max(0, value), criterion.max),
                            },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
                {Object.keys(formData.scores).length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Média Geral:</span>
                      <span className={`text-lg font-bold ${getScoreColor(calculateAverage(formData.scores), 10)}`}>
                        {calculateAverage(formData.scores).toFixed(1)} / 10
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label htmlFor="strengths">Pontos Fortes</Label>
                  <Textarea
                    id="strengths"
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    placeholder="Descreva os pontos fortes do colaborador..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="improvement_areas">Áreas de Melhoria</Label>
                  <Textarea
                    id="improvement_areas"
                    value={formData.improvement_areas}
                    onChange={(e) => setFormData({ ...formData, improvement_areas: e.target.value })}
                    placeholder="Descreva as áreas que precisam de desenvolvimento..."
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="comments">Comentários Gerais</Label>
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    placeholder="Comentários adicionais sobre a avaliação..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Avaliação"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            Nenhuma avaliação de performance encontrada.
          </div>
        ) : (
          reviews.map((review) => {
            const average = calculateAverage(review.scores);
            return (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{review.employee_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-lg font-bold ${getScoreColor(average, 10)}`}>
                        {average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {REVIEW_PERIODS.find((p) => p.value === review.review_period)?.label} •{" "}
                    {new Date(review.review_date).toLocaleDateString("pt-BR")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scores */}
                  <div className="space-y-2">
                    {REVIEW_CRITERIA.map((criterion) => {
                      const score = review.scores[criterion.key] || 0;
                      return (
                        <div key={criterion.key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{criterion.label}</span>
                            <span className={getScoreColor(score, criterion.max)}>
                              {score} / {criterion.max}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${(score / criterion.max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {review.strengths && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold text-green-700">Pontos Fortes</Label>
                      <p className="text-sm text-muted-foreground mt-1">{review.strengths}</p>
                    </div>
                  )}

                  {review.improvement_areas && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold text-yellow-700">Áreas de Melhoria</Label>
                      <p className="text-sm text-muted-foreground mt-1">{review.improvement_areas}</p>
                    </div>
                  )}

                  {review.comments && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold">Comentários</Label>
                      <p className="text-sm text-muted-foreground mt-1">{review.comments}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Avaliado em: {new Date(review.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resumo */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviews.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(
                  reviews.reduce((sum, r) => sum + calculateAverage(r.scores), 0) / reviews.length
                ).toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Melhor Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(...reviews.map((r) => calculateAverage(r.scores))).toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pior Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {Math.min(...reviews.map((r) => calculateAverage(r.scores))).toFixed(1)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

