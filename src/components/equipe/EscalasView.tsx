"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type Shift = {
  id: string;
  employee_id: string;
  employee_name?: string;
  shift_date: string;
  shift_type: "morning" | "afternoon" | "night" | "full";
  start_time: string;
  end_time: string;
  status: string;
};

type Employee = {
  id: string;
  name: string;
};

export default function EscalasView() {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    date: "",
    shift_type: "morning" as const,
    start_time: "08:00",
    end_time: "17:00",
  });

  useEffect(() => {
    loadEmployees();
    loadShifts();
  }, [getStoreIdsForQuery, viewMode, currentDate]);

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

  const loadShifts = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setShifts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data, error: fetchError } = await supabase
        .from("employee_shifts")
        .select(`
          *,
          employees!inner(name)
        `)
        .in("store_id", storeIds)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .order("shift_date", { ascending: true });

      if (fetchError) throw fetchError;

      const shiftsWithNames = (data || []).map((shift: any) => ({
        ...shift,
        employee_name: shift.employees?.name || "",
        date: shift.shift_date,
      }));

      setShifts(shiftsWithNames as Shift[]);
    } catch (error) {
      console.error("Erro ao carregar escalas:", error);
      setError("Não foi possível carregar as escalas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStoreId || !user) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("employee_shifts").insert({
        employee_id: formData.employee_id,
        store_id: currentStoreId,
        shift_date: formData.date,
        shift_type: formData.shift_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        date: new Date().toISOString().split("T")[0],
        shift_type: "morning",
        start_time: "08:00",
        end_time: "17:00",
      });
      await loadShifts();
    } catch (error: any) {
      console.error("Erro ao salvar escala:", error);
      setError(error.message || "Não foi possível salvar a escala.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta escala?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("employee_shifts")
        .delete()
        .eq("id", shiftId);

      if (deleteError) throw deleteError;
      await loadShifts();
    } catch (error: any) {
      console.error("Erro ao excluir escala:", error);
      setError(error.message || "Não foi possível excluir a escala.");
    }
  };

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getShiftLabel = (type: string) => {
    const labels = {
      morning: "Manhã",
      afternoon: "Tarde",
      night: "Noite",
      full: "Integral",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getShiftsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return shifts.filter((shift) => shift.shift_date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar escalas.
        </CardContent>
      </Card>
    );
  }

  const days = getDaysInMonth(currentDate);

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
          <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              date: new Date().toISOString().split("T")[0],
              shift_type: "morning",
              start_time: "08:00",
              end_time: "17:00",
            });
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Escala
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Escala</CardTitle>
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
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="shift_type">Turno *</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value: "morning" | "afternoon" | "night" | "full") =>
                      setFormData({ ...formData, shift_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Manhã (08:00 - 12:00)</SelectItem>
                      <SelectItem value="afternoon">Tarde (13:00 - 17:00)</SelectItem>
                      <SelectItem value="night">Noite (18:00 - 22:00)</SelectItem>
                      <SelectItem value="full">Integral (08:00 - 17:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start_time">Entrada *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Saída *</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
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
                    "Salvar Escala"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Escalas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const dayShifts = getShiftsForDate(day);
                return (
                  <div
                    key={index}
                    className={`min-h-24 border rounded-lg p-2 ${
                      day ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-medium mb-1">{day.getDate()}</div>
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className="text-xs bg-green-100 text-green-800 rounded px-1 py-0.5 flex items-center justify-between group"
                              title={`${shift.employee_name} - ${getShiftLabel(shift.shift_type)}`}
                            >
                              <span className="truncate flex-1">
                                {shift.employee_name?.substring(0, 10)} - {getShiftLabel(shift.shift_type)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-4 w-4 p-0 text-red-600"
                                onClick={() => handleDelete(shift.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
