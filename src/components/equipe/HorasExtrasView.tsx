"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, CheckCircle, XCircle, AlertCircle, Loader2, Calendar } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type OvertimeRequest = {
  id: string;
  employee_id: string;
  employee_name?: string;
  request_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
};

export default function HorasExtrasView() {
  const { currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
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
    request_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    hours: 0,
    reason: "",
  });

  useEffect(() => {
    if (currentStore) {
      loadEmployees();
      loadRequests();
    }
  }, [currentStore, statusFilter]);

  const loadEmployees = async () => {
    if (!currentStore) return;
    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("store_id", currentStore.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadRequests = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("overtime_requests")
        .select(`
          *,
          employees!inner(name)
        `)
        .eq("store_id", currentStore.id)
        .order("request_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const requestsWithNames = (data || []).map((req: any) => ({
        ...req,
        employee_name: req.employees?.name || "",
        start_time: req.start_time,
        end_time: req.end_time,
      }));

      setRequests(requestsWithNames as OvertimeRequest[]);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      setError("Não foi possível carregar as solicitações de horas extras.");
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (start: string, end: string, date: string) => {
    if (!start || !end || !date) return 0;
    const startDateTime = new Date(`${date}T${start}`);
    const endDateTime = new Date(`${date}T${end}`);
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  const handleTimeChange = (field: "start_time" | "end_time", value: string) => {
    const newFormData = { ...formData, [field]: value };
    const hours = calculateHours(
      field === "start_time" ? value : newFormData.start_time,
      field === "end_time" ? value : newFormData.end_time,
      newFormData.request_date
    );
    setFormData({ ...newFormData, hours });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || !formData.employee_id) return;

    if (formData.hours <= 0) {
      setError("As horas devem ser maiores que zero.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const startDateTime = new Date(`${formData.request_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.request_date}T${formData.end_time}`);

      const { error: insertError } = await supabase.from("overtime_requests").insert({
        employee_id: formData.employee_id,
        store_id: currentStore.id,
        request_date: formData.request_date,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        hours: formData.hours,
        reason: formData.reason.trim(),
        status: "pending",
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        request_date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        hours: 0,
        reason: "",
      });
      await loadRequests();
    } catch (error: any) {
      console.error("Erro ao criar solicitação:", error);
      setError(error.message || "Não foi possível criar a solicitação de horas extras.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;

    setApprovingId(requestId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("overtime_requests")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;
      await loadRequests();
    } catch (error: any) {
      console.error("Erro ao aprovar solicitação:", error);
      setError(error.message || "Não foi possível aprovar a solicitação.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!user || !reason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }

    setRejectingId(requestId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("overtime_requests")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason.trim(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;
      await loadRequests();
    } catch (error: any) {
      console.error("Erro ao rejeitar solicitação:", error);
      setError(error.message || "Não foi possível rejeitar a solicitação.");
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
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      approved: "Aprovada",
      rejected: "Rejeitada",
      cancelled: "Cancelada",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar horas extras.
        </CardContent>
      </Card>
    );
  }

  const canManage = isAdmin || true; // Pode ser ajustado conforme permissões

  const filteredRequests = requests;

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
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              request_date: new Date().toISOString().split("T")[0],
              start_time: "",
              end_time: "",
              hours: 0,
              reason: "",
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
            <CardTitle>Nova Solicitação de Horas Extras</CardTitle>
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
                  <Label htmlFor="request_date">Data *</Label>
                  <Input
                    id="request_date"
                    type="date"
                    value={formData.request_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormData({ ...formData, request_date: newDate });
                      if (formData.start_time && formData.end_time) {
                        const hours = calculateHours(formData.start_time, formData.end_time, newDate);
                        setFormData((prev) => ({ ...prev, hours }));
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Horário de Início *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleTimeChange("start_time", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">Horário de Término *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleTimeChange("end_time", e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="hours">Total de Horas</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.hours.toFixed(1)}
                    readOnly
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculado automaticamente com base nos horários informados
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="reason">Motivo/Justificativa *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Descreva o motivo das horas extras..."
                    rows={3}
                    required
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

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Horas Extras ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação de horas extras encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {getStatusIcon(request.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{request.employee_name || "Colaborador"}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              request.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : request.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(request.request_date).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatDateTime(request.start_time)} - {formatDateTime(request.end_time)}
                          </div>
                          <div>
                            <strong>Total:</strong> {request.hours.toFixed(1)} horas
                          </div>
                          <div>
                            <strong>Motivo:</strong> {request.reason}
                          </div>
                          {request.rejection_reason && (
                            <div className="text-red-600">
                              <strong>Motivo da rejeição:</strong> {request.rejection_reason}
                            </div>
                          )}
                          {request.approved_at && (
                            <div className="text-xs text-muted-foreground">
                              {request.status === "approved" ? "Aprovada" : "Rejeitada"} em:{" "}
                              {new Date(request.approved_at).toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(request.id)}
                          disabled={approvingId === request.id || rejectingId === request.id}
                        >
                          {approvingId === request.id ? (
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
                            if (reason) handleReject(request.id, reason);
                          }}
                          disabled={approvingId === request.id || rejectingId === request.id}
                        >
                          {rejectingId === request.id ? (
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
              ))}
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
              {filteredRequests.filter((r) => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredRequests.filter((r) => r.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rejeitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredRequests.filter((r) => r.status === "rejected").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRequests
                .filter((r) => r.status === "approved")
                .reduce((sum, r) => sum + r.hours, 0)
                .toFixed(1)}
              h
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

