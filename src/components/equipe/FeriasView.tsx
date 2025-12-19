"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle, XCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type Vacation = {
  id: string;
  employee_id: string;
  employee_name?: string;
  start_date: string;
  end_date: string;
  days: number;
  status: "requested" | "approved" | "rejected" | "taken" | "cancelled";
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requested_at: string;
  notes: string | null;
};

type Employee = {
  id: string;
  name: string;
};

export default function FeriasView() {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
    days: 0,
    notes: "",
  });

  useEffect(() => {
    loadEmployees();
    loadVacations();
  }, [getStoreIdsForQuery, viewMode, statusFilter]);

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

  const loadVacations = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setVacations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("vacations")
        .select(`
          *,
          employees!inner(name)
        `)
        .in("store_id", storeIds)
        .order("start_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const vacationsWithNames = (data || []).map((vac: any) => ({
        ...vac,
        employee_name: vac.employees?.name || "",
      }));

      setVacations(vacationsWithNames as Vacation[]);
    } catch (error) {
      console.error("Erro ao carregar férias:", error);
      setError("Não foi possível carregar as solicitações de férias.");
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
  };

  const handleDateChange = (field: "start_date" | "end_date", value: string) => {
    const newFormData = { ...formData, [field]: value };
    if (field === "start_date" && newFormData.end_date) {
      newFormData.days = calculateDays(value, newFormData.end_date);
    } else if (field === "end_date" && newFormData.start_date) {
      newFormData.days = calculateDays(newFormData.start_date, value);
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || !formData.employee_id) return;

    if (formData.days <= 0) {
      setError("O período de férias deve ser de pelo menos 1 dia.");
      return;
    }

    if (new Date(formData.start_date) < new Date()) {
      setError("A data de início não pode ser no passado.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("vacations").insert({
        employee_id: formData.employee_id,
        store_id: currentStoreId!,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days: formData.days,
        status: "requested",
        notes: formData.notes.trim() || null,
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        start_date: "",
        end_date: "",
        days: 0,
        notes: "",
      });
      await loadVacations();
    } catch (error: any) {
      console.error("Erro ao criar solicitação:", error);
      setError(error.message || "Não foi possível criar a solicitação de férias.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (vacationId: string) => {
    if (!user) return;

    setApprovingId(vacationId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("vacations")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", vacationId);

      if (updateError) throw updateError;
      await loadVacations();
    } catch (error: any) {
      console.error("Erro ao aprovar férias:", error);
      setError(error.message || "Não foi possível aprovar as férias.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (vacationId: string, reason: string) => {
    if (!user || !reason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }

    setRejectingId(vacationId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("vacations")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason.trim(),
        })
        .eq("id", vacationId);

      if (updateError) throw updateError;
      await loadVacations();
    } catch (error: any) {
      console.error("Erro ao rejeitar férias:", error);
      setError(error.message || "Não foi possível rejeitar as férias.");
    } finally {
      setRejectingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "taken":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "requested":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      requested: "Solicitada",
      approved: "Aprovada",
      rejected: "Rejeitada",
      taken: "Em Andamento",
      cancelled: "Cancelada",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const canManage = isAdmin || true;

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar férias.
        </CardContent>
      </Card>
    );
  }

  const filteredVacations = vacations;

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="requested">Solicitadas</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
              <SelectItem value="taken">Em Andamento</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              start_date: "",
              end_date: "",
              days: 0,
              notes: "",
            });
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Solicitação de Férias</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="days">Total de Dias</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.days}
                    readOnly
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculado automaticamente com base nas datas
                  </p>
                </div>
                <div>
                  <Label htmlFor="start_date">Data de Início *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleDateChange("start_date", e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Data de Término *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleDateChange("end_date", e.target.value)}
                    required
                    min={formData.start_date || new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações sobre as férias..."
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
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Férias */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Férias ({filteredVacations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredVacations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação de férias encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVacations.map((vacation) => {
                const isActive =
                  vacation.status === "taken" ||
                  (vacation.status === "approved" &&
                    new Date(vacation.start_date) <= new Date() &&
                    new Date(vacation.end_date) >= new Date());
                return (
                  <div
                    key={vacation.id}
                    className={`border rounded-lg p-4 ${
                      isActive ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {getStatusIcon(vacation.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{vacation.employee_name || "Colaborador"}</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                vacation.status === "approved" || vacation.status === "taken"
                                  ? "bg-green-100 text-green-800"
                                  : vacation.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {getStatusLabel(vacation.status)}
                            </span>
                            {isActive && (
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                Em Andamento
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(vacation.start_date).toLocaleDateString("pt-BR")} até{" "}
                              {new Date(vacation.end_date).toLocaleDateString("pt-BR")}
                            </div>
                            <div>
                              <strong>Duração:</strong> {vacation.days} {vacation.days === 1 ? "dia" : "dias"}
                            </div>
                            {vacation.notes && (
                              <div>
                                <strong>Observações:</strong> {vacation.notes}
                              </div>
                            )}
                            {vacation.rejection_reason && (
                              <div className="text-red-600">
                                <strong>Motivo da rejeição:</strong> {vacation.rejection_reason}
                              </div>
                            )}
                            <div className="text-xs">
                              Solicitada em: {new Date(vacation.requested_at).toLocaleString("pt-BR")}
                              {vacation.approved_at &&
                                ` • ${vacation.status === "approved" ? "Aprovada" : "Rejeitada"} em: ${new Date(vacation.approved_at).toLocaleString("pt-BR")}`}
                            </div>
                          </div>
                        </div>
                      </div>
                      {canManage && vacation.status === "requested" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(vacation.id)}
                            disabled={approvingId === vacation.id || rejectingId === vacation.id}
                          >
                            {approvingId === vacation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              const reason = prompt("Informe o motivo da rejeição:");
                              if (reason) handleReject(vacation.id, reason);
                            }}
                            disabled={approvingId === vacation.id || rejectingId === vacation.id}
                          >
                            {rejectingId === vacation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeitar
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredVacations.filter((v) => v.status === "requested").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredVacations.filter((v) => v.status === "approved" || v.status === "taken").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredVacations.filter(
                (v) =>
                  v.status === "taken" ||
                  (v.status === "approved" &&
                    new Date(v.start_date) <= new Date() &&
                    new Date(v.end_date) >= new Date())
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dias Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredVacations
                .filter((v) => v.status === "approved" || v.status === "taken")
                .reduce((sum, v) => sum + v.days, 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

