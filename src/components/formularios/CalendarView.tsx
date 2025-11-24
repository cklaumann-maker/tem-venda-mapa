"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";

type ScheduleTask = {
  id: string;
  form_id: string;
  form_title?: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime: string;
  status: "pending" | "completed" | "missed" | "cancelled";
  completed_at: string | null;
  response_id: string | null;
};

export default function CalendarView() {
  const { currentStore } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Função para marcar tarefas perdidas
  const markMissedTasks = useCallback(async () => {
    if (!currentStore) return;
    try {
      // Chamar a função do Supabase para marcar tarefas perdidas
      const { error } = await supabase.rpc('mark_missed_tasks_today');
      if (error) {
        console.error("Erro ao marcar tarefas perdidas:", error);
        // Não falhar silenciosamente, mas continuar
      }
    } catch (error) {
      console.error("Erro ao marcar tarefas perdidas:", error);
    }
  }, [currentStore, supabase]);

  useEffect(() => {
    if (currentStore) {
      markMissedTasks();
      loadTasks();
    }
  }, [currentStore, currentDate, markMissedTasks]);

  const loadTasks = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);

    try {
      const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data: tasksData, error: tasksError } = await supabase
        .from("form_schedule_tasks")
        .select(`
          *,
          forms!inner(id, title)
        `)
        .eq("store_id", currentStore.id)
        .gte("scheduled_date", startOfMonth)
        .lte("scheduled_date", endOfMonth)
        .order("scheduled_datetime", { ascending: true });

      if (tasksError) throw tasksError;

      const tasksWithFormTitle = (tasksData || []).map((task: any) => ({
        ...task,
        form_title: task.forms?.title || "Formulário não encontrado",
      }));

      setTasks(tasksWithFormTitle as ScheduleTask[]);
    } catch (error: any) {
      console.error("Erro ao carregar tarefas:", error);
      setError("Não foi possível carregar as tarefas agendadas.");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!currentStore) return;
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        // Se mudar para outro status que não seja "completed", limpar completed_at
        updateData.completed_at = null;
        updateData.response_id = null; // Limpar também a resposta vinculada
      }

      const { error } = await supabase
        .from("form_schedule_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;
      await loadTasks();
    } catch (error: any) {
      console.error("Erro ao atualizar status da tarefa:", error);
      setError("Não foi possível atualizar o status da tarefa.");
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior (para preencher a primeira semana)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês (para completar a última semana)
    const remainingDays = 42 - days.length; // 6 semanas × 7 dias
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return tasks.filter((task) => task.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "missed":
        return "bg-red-100 text-red-800 border-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "missed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Função para formatar data para YYYY-MM-DD sem problemas de timezone
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para formatar data sem problemas de timezone
  const formatDateString = (dateStr: string) => {
    // dateStr está no formato YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    // Criar data no timezone local para evitar problemas
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("pt-BR");
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para visualizar o calendário.
        </CardContent>
      </Card>
    );
  }

  const days = getDaysInMonth();
  const selectedDateTasks = selectedDate
    ? tasks.filter((task) => task.scheduled_date === selectedDate)
    : [];

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Header do Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-xl font-bold">
                {monthNames[month]} {year}
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                <span>Respondido</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                <span>Perdido</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Carregando calendário...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Cabeçalho dos dias da semana */}
              {weekDays.map((day) => (
                <div key={day} className="text-center font-semibold text-sm py-2">
                  {day}
                </div>
              ))}

              {/* Dias do calendário */}
              {days.map((day, index) => {
                const dayTasks = getTasksForDate(day.date);
                const isToday =
                  day.date.toDateString() === new Date().toDateString();
                // Formatar data no timezone local para evitar problemas de UTC
                const dateStr = formatDateToYYYYMMDD(day.date);

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border rounded p-2 ${
                      !day.isCurrentMonth ? "bg-gray-50 opacity-50" : "bg-white"
                    } ${isToday ? "ring-2 ring-blue-500" : ""} ${
                      selectedDate === dateStr ? "bg-blue-50" : ""
                    } cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  >
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        isToday ? "text-blue-600" : ""
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded border ${getStatusColor(
                            task.status
                          )} truncate`}
                          title={task.form_title}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            <span className="truncate">{task.form_title}</span>
                          </div>
                          <div className="text-xs opacity-75 mt-0.5">
                            {task.scheduled_time}
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayTasks.length - 3} mais
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

      {/* Detalhes da Data Selecionada */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Tarefas do dia {formatDateString(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma tarefa agendada para este dia.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border ${getStatusColor(task.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{task.form_title}</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.scheduled_time}
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            <span className="capitalize">
                              {task.status === "pending"
                                ? "Pendente"
                                : task.status === "completed"
                                ? "Respondido"
                                : task.status === "missed"
                                ? "Perdido"
                                : "Cancelado"}
                            </span>
                          </div>
                        </div>
                        {task.completed_at && (
                          <p className="text-xs mt-2 opacity-75">
                            Respondido em:{" "}
                            {new Date(task.completed_at).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {task.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "completed")}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Marcar como Respondido
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "missed")}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Marcar como Perdido
                            </Button>
                          </>
                        )}
                        {task.status === "missed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatus(task.id, "completed")}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Marcar como Respondido
                          </Button>
                        )}
                        {task.status === "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "pending")}
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Marcar como Pendente
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "missed")}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Marcar como Perdido
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

