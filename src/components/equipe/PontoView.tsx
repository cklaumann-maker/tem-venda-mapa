"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type TimeRecord = {
  id: string;
  employee_id: string;
  employee_name?: string;
  record_date: string;
  entry_time: string | null;
  exit_time: string | null;
  total_hours: number;
  overtime_hours: number;
  status: "present" | "absent" | "late" | "justified" | "holiday";
};

type Employee = {
  id: string;
  name: string;
};

export default function PontoView() {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalHours: 0,
    overtimeHours: 0,
    absences: 0,
    lateCount: 0,
  });

  useEffect(() => {
    loadEmployees();
    loadRecords();
  }, [getStoreIdsForQuery, viewMode, periodFilter, selectedEmployee]);

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
      if (data && data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadRecords = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setRecords([]);
      setSummary({
        totalHours: 0,
        overtimeHours: 0,
        absences: 0,
        lateCount: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startDate: Date;
      let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      switch (periodFilter) {
        case "today":
          startDate = new Date(now);
          endDate = new Date(now);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case "month":
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
      }

      let query = supabase
        .from("time_records")
        .select(`
          *,
          employees!inner(name)
        `)
        .in("store_id", storeIds)
        .gte("record_date", startDate.toISOString().split("T")[0])
        .lte("record_date", endDate.toISOString().split("T")[0]);

      if (selectedEmployee) {
        query = query.eq("employee_id", selectedEmployee);
      }

      const { data, error: fetchError } = await query.order("record_date", { ascending: false });

      if (fetchError) throw fetchError;

      const recordsWithNames = (data || []).map((record: any) => ({
        ...record,
        employee_name: record.employees?.name || "",
      }));

      setRecords(recordsWithNames as TimeRecord[]);

      // Calcular resumo
      const total = recordsWithNames.reduce((sum: number, r: TimeRecord) => sum + (r.total_hours || 0), 0);
      const overtime = recordsWithNames.reduce((sum: number, r: TimeRecord) => sum + (r.overtime_hours || 0), 0);
      const absences = recordsWithNames.filter((r: TimeRecord) => r.status === "absent").length;
      const lateCount = recordsWithNames.filter((r: TimeRecord) => r.status === "late").length;

      setSummary({
        totalHours: total,
        overtimeHours: overtime,
        absences,
        lateCount,
      });
    } catch (error) {
      console.error("Erro ao carregar registros:", error);
      setError("Não foi possível carregar os registros de ponto.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPoint = async (type: "entry" | "exit") => {
    if (!currentStore || !selectedEmployee) {
      setError("Selecione um colaborador para registrar o ponto.");
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const now = new Date();
      const dateStr = selectedDate;
      const timeStr = now.toISOString();

      // Verificar se já existe registro para esta data
      const { data: existingRecord } = await supabase
        .from("time_records")
        .select("*")
        .eq("employee_id", selectedEmployee)
        .eq("record_date", dateStr)
        .single();

      if (type === "entry") {
        if (existingRecord && existingRecord.entry_time) {
          setError("Já existe um registro de entrada para esta data.");
          setRegistering(false);
          return;
        }

        // Criar ou atualizar registro de entrada
        if (existingRecord) {
          const { error: updateError } = await supabase
            .from("time_records")
            .update({
              entry_time: timeStr,
              status: "present",
            })
            .eq("id", existingRecord.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from("time_records").insert({
            employee_id: selectedEmployee,
            store_id: currentStoreId!,
            record_date: dateStr,
            entry_time: timeStr,
            status: "present",
          });

          if (insertError) throw insertError;
        }
      } else {
        // Saída
        if (!existingRecord || !existingRecord.entry_time) {
          setError("Não há registro de entrada para esta data.");
          setRegistering(false);
          return;
        }

        if (existingRecord.exit_time) {
          setError("Já existe um registro de saída para esta data.");
          setRegistering(false);
          return;
        }

        // Calcular horas trabalhadas
        const entryTime = new Date(existingRecord.entry_time);
        const exitTime = new Date(timeStr);
        const diffMs = exitTime.getTime() - entryTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const totalHours = Math.max(0, diffHours - 1); // Subtrair 1h de intervalo
        const overtimeHours = Math.max(0, totalHours - 8); // Considerar 8h como jornada padrão

        const { error: updateError } = await supabase
          .from("time_records")
          .update({
            exit_time: timeStr,
            total_hours: totalHours,
            overtime_hours: overtimeHours,
          })
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;
      }

      await loadRecords();
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error);
      setError(error.message || "Não foi possível registrar o ponto.");
    } finally {
      setRegistering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "absent":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "late":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      present: "Presente",
      absent: "Falta",
      late: "Atraso",
      justified: "Justificado",
      holiday: "Feriado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar ponto.
        </CardContent>
      </Card>
    );
  }

  const filteredRecords = selectedEmployee && selectedEmployee !== "all"
    ? records.filter((r) => r.employee_id === selectedEmployee)
    : records;

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

      {/* Registro de Ponto */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ponto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee_select">Colaborador *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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
              <Label htmlFor="point_date">Data *</Label>
              <Input
                id="point_date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => handleRegisterPoint("entry")}
              className="bg-green-600 hover:bg-green-700 flex-1"
              disabled={registering || !selectedEmployee}
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Registrar Entrada
                </>
              )}
            </Button>
            <Button
              onClick={() => handleRegisterPoint("exit")}
              className="bg-red-600 hover:bg-red-700 flex-1"
              disabled={registering || !selectedEmployee}
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Registrar Saída
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Label htmlFor="employee_filter">Filtrar por Colaborador</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os colaboradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="period_filter">Período</Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro de ponto encontrado para o período selecionado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(record.status)}
                    <div>
                      <div className="font-semibold">{record.employee_name || "Colaborador"}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.record_date).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Entrada</div>
                      <div className="font-medium">{formatTime(record.entry_time)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Saída</div>
                      <div className="font-medium">{formatTime(record.exit_time)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="font-medium">{record.total_hours.toFixed(1)}h</div>
                    </div>
                    {record.overtime_hours > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Extras</div>
                        <div className="font-medium text-orange-600">{record.overtime_hours.toFixed(1)}h</div>
                      </div>
                    )}
                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          record.status === "present"
                            ? "bg-green-100 text-green-800"
                            : record.status === "late"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
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
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {periodFilter === "today"
                ? "Hoje"
                : periodFilter === "week"
                ? "Esta semana"
                : "Este mês"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.overtimeHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {periodFilter === "today"
                ? "Hoje"
                : periodFilter === "week"
                ? "Esta semana"
                : "Este mês"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.absences}</div>
            <p className="text-xs text-muted-foreground">
              {periodFilter === "today"
                ? "Hoje"
                : periodFilter === "week"
                ? "Esta semana"
                : "Este mês"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.lateCount}</div>
            <p className="text-xs text-muted-foreground">
              {periodFilter === "today"
                ? "Hoje"
                : periodFilter === "week"
                ? "Esta semana"
                : "Este mês"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
