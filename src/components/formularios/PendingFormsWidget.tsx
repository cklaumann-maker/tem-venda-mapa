"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle2, XCircle, Loader2, Calendar } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

type ScheduleTask = {
  id: string;
  form_id: string;
  form_title?: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "completed" | "missed" | "cancelled";
};

export default function PendingFormsWidget() {
  const { getStoreIdsForQuery, viewMode } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodayTasks();
  }, [getStoreIdsForQuery, viewMode]);

  // Função para formatar data para YYYY-MM-DD sem problemas de timezone
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadTodayTasks = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setTasks([]);
      return;
    }

    setLoading(true);

    try {
      const todayStr = formatDateToYYYYMMDD(new Date());

      const { data: tasksData, error: tasksError } = await supabase
        .from("form_schedule_tasks")
        .select(`
          id,
          form_id,
          scheduled_date,
          scheduled_time,
          status,
          forms!inner(id, title)
        `)
        .in("store_id", storeIds)
        .eq("scheduled_date", todayStr)
        .in("status", ["pending", "missed"])
        .order("scheduled_time", { ascending: true })
        .limit(5);

      if (tasksError) throw tasksError;

      const tasksWithFormTitle = (tasksData || []).map((task: any) => ({
        id: task.id,
        form_id: task.form_id,
        form_title: task.forms?.title || "Formulário não encontrado",
        scheduled_date: task.scheduled_date,
        scheduled_time: task.scheduled_time,
        status: task.status,
      }));

      setTasks(tasksWithFormTitle as ScheduleTask[]);
    } catch (error) {
      console.error("Erro ao carregar formulários pendentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
        updateData.response_id = null;
      }

      const { error } = await supabase
        .from("form_schedule_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;
      await loadTodayTasks();
    } catch (error) {
      console.error("Erro ao atualizar status da tarefa:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case "missed":
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Clock className="w-3 h-3 text-yellow-600" />;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "missed":
        return "border-red-100 bg-red-50/50 hover:bg-red-50";
      case "pending":
        return "border-yellow-100 bg-yellow-50/50 hover:bg-yellow-50";
      default:
        return "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50";
    }
  };


  return (
    <Card className="bg-white/85 backdrop-blur border border-white/60 shadow-sm w-full lg:w-[320px] flex-shrink-0 rounded-2xl">
      <CardContent className="p-4 sm:p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Formulários Hoje</h3>
          </div>
          <Link href="/formularios">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              Ver todos
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>Nenhum formulário pendente para hoje</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1 min-h-0">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${getStatusStyles(task.status)} transition-colors`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {task.form_title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {task.scheduled_time}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {task.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => updateTaskStatus(task.id, "completed")}
                      title="Marcar como respondido"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {task.status === "missed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => updateTaskStatus(task.id, "completed")}
                      title="Marcar como respondido"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {tasks.length >= 5 && (
              <Link href="/formularios">
                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                  Ver mais ({tasks.length}+)
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

