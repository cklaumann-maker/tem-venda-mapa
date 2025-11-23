"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, CheckCircle2, Loader2, AlertCircle, FileText, Calendar } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type Admission = {
  id: string;
  employee_id: string | null;
  employee_name?: string;
  status: "in_progress" | "completed" | "cancelled";
  checklist: Record<string, boolean>;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
};

type Employee = {
  id: string;
  name: string;
};

const ADMISSION_CHECKLIST = [
  { key: "cadastro_inicial", label: "Cadastro inicial no sistema" },
  { key: "coleta_documentos", label: "Coleta de documentos pessoais" },
  { key: "exames_medicos", label: "Exames médicos admissionais" },
  { key: "treinamento_inicial", label: "Treinamento inicial" },
  { key: "acesso_sistema", label: "Acesso ao sistema configurado" },
  { key: "uniforme_epis", label: "Uniforme e EPIs entregues" },
  { key: "contrato_assinado", label: "Contrato de trabalho assinado" },
  { key: "politica_empresa", label: "Política da empresa apresentada" },
];

export default function AdmissaoView() {
  const { currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);

  const [formData, setFormData] = useState({
    employee_id: "",
    checklist: {} as Record<string, boolean>,
    notes: "",
  });

  useEffect(() => {
    if (currentStore) {
      loadEmployees();
      loadAdmissions();
    }
  }, [currentStore]);

  const loadEmployees = async () => {
    if (!currentStore) return;
    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("store_id", currentStore.id)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadAdmissions = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("admissions")
        .select(`
          *,
          employees(name)
        `)
        .eq("store_id", currentStore.id)
        .order("started_at", { ascending: false });

      if (fetchError) throw fetchError;

      const admissionsWithNames = (data || []).map((adm: any) => ({
        ...adm,
        employee_name: adm.employees?.name || "Sem colaborador vinculado",
        checklist: adm.checklist || {},
      }));

      setAdmissions(admissionsWithNames as Admission[]);
    } catch (error) {
      console.error("Erro ao carregar processos de admissão:", error);
      setError("Não foi possível carregar os processos de admissão.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || !formData.employee_id) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("admissions").insert({
        employee_id: formData.employee_id,
        store_id: currentStore.id,
        status: "in_progress",
        checklist: {},
        created_by: user.id,
        notes: formData.notes.trim() || null,
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        checklist: {},
        notes: "",
      });
      await loadAdmissions();
    } catch (error: any) {
      console.error("Erro ao iniciar processo:", error);
      setError(error.message || "Não foi possível iniciar o processo de admissão.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChecklist = async (admissionId: string, checklist: Record<string, boolean>) => {
    try {
      const allCompleted = ADMISSION_CHECKLIST.every((item) => checklist[item.key] === true);

      const { error: updateError } = await supabase
        .from("admissions")
        .update({
          checklist,
          status: allCompleted ? "completed" : "in_progress",
          completed_at: allCompleted ? new Date().toISOString() : null,
        })
        .eq("id", admissionId);

      if (updateError) throw updateError;
      await loadAdmissions();
    } catch (error: any) {
      console.error("Erro ao atualizar checklist:", error);
      setError(error.message || "Não foi possível atualizar o checklist.");
    }
  };

  const getProgress = (checklist: Record<string, boolean>) => {
    const completed = ADMISSION_CHECKLIST.filter((item) => checklist[item.key] === true).length;
    return Math.round((completed / ADMISSION_CHECKLIST.length) * 100);
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar processos de admissão.
        </CardContent>
      </Card>
    );
  }

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
        <div>
          <h2 className="text-xl font-semibold">Processos de Admissão</h2>
          <p className="text-sm text-muted-foreground">Gerencie o checklist de admissão de novos colaboradores</p>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              checklist: {},
              notes: "",
            });
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Processo de Admissão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartAdmission} className="space-y-4">
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
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o processo de admissão..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    "Iniciar Processo"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Processos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : admissions.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            Nenhum processo de admissão encontrado. Clique em "Novo Processo" para começar.
          </div>
        ) : (
          admissions.map((admission) => {
            const progress = getProgress(admission.checklist);
            return (
              <Card key={admission.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{admission.employee_name}</CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        admission.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : admission.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {admission.status === "completed"
                        ? "Concluído"
                        : admission.status === "cancelled"
                        ? "Cancelado"
                        : "Em Andamento"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {ADMISSION_CHECKLIST.map((item) => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${admission.id}-${item.key}`}
                          checked={admission.checklist[item.key] === true}
                          onCheckedChange={(checked) => {
                            const newChecklist = {
                              ...admission.checklist,
                              [item.key]: checked === true,
                            };
                            handleUpdateChecklist(admission.id, newChecklist);
                          }}
                          disabled={admission.status === "completed" || admission.status === "cancelled"}
                        />
                        <Label
                          htmlFor={`${admission.id}-${item.key}`}
                          className={`text-sm ${
                            admission.checklist[item.key] === true
                              ? "text-green-600 line-through"
                              : "text-gray-700"
                          }`}
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {admission.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Observações:</strong> {admission.notes}
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Iniciado em: {new Date(admission.started_at).toLocaleDateString("pt-BR")}
                    {admission.completed_at &&
                      ` • Concluído em: ${new Date(admission.completed_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

