"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileX, Calculator, CheckCircle2, Loader2, AlertCircle, DollarSign } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type Termination = {
  id: string;
  employee_id: string;
  employee_name?: string;
  termination_date: string;
  termination_type: "without_cause" | "with_cause" | "resignation" | "contract_end";
  reason: string;
  severance_calculation: Record<string, number>;
  checklist: Record<string, boolean>;
  status: "in_progress" | "completed" | "cancelled";
  created_at: string;
  completed_at: string | null;
  notes: string | null;
};

type Employee = {
  id: string;
  name: string;
  hire_date: string;
  salary_base: number | null;
};

const TERMINATION_CHECKLIST = [
  { key: "aviso_previo", label: "Aviso prévio trabalhado ou indenizado" },
  { key: "calculos_verbas", label: "Cálculo de verbas rescisórias" },
  { key: "entrega_documentos", label: "Entrega de documentos trabalhistas" },
  { key: "devolucao_uniforme", label: "Devolução de uniformes e EPIs" },
  { key: "desligamento_acessos", label: "Desligamento de acessos (sistema, email)" },
  { key: "saida_medica", label: "Saída médica (se aplicável)" },
  { key: "trct_gerado", label: "TRCT gerado e assinado" },
  { key: "fgts_calculado", label: "FGTS e multa calculados" },
];

const TERMINATION_TYPES = [
  { value: "without_cause", label: "Sem justa causa" },
  { value: "with_cause", label: "Com justa causa" },
  { value: "resignation", label: "Pedido de demissão" },
  { value: "contract_end", label: "Término de contrato" },
];

export default function RescisaoView() {
  const { currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTermination, setSelectedTermination] = useState<Termination | null>(null);

  const [formData, setFormData] = useState({
    employee_id: "",
    termination_date: "",
    termination_type: "without_cause" as const,
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (currentStore) {
      loadEmployees();
      loadTerminations();
    }
  }, [currentStore]);

  const loadEmployees = async () => {
    if (!currentStore) return;
    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("id, name, hire_date, salary_base")
        .eq("store_id", currentStore.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadTerminations = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("terminations")
        .select(`
          *,
          employees!inner(name)
        `)
        .eq("store_id", currentStore.id)
        .order("termination_date", { ascending: false });

      if (fetchError) throw fetchError;

      const terminationsWithNames = (data || []).map((term: any) => ({
        ...term,
        employee_name: term.employees?.name || "",
        severance_calculation: term.severance_calculation || {},
        checklist: term.checklist || {},
      }));

      setTerminations(terminationsWithNames as Termination[]);
    } catch (error) {
      console.error("Erro ao carregar rescisões:", error);
      setError("Não foi possível carregar os processos de rescisão.");
    } finally {
      setLoading(false);
    }
  };

  const calculateSeverance = (employee: Employee | undefined, terminationType: string, terminationDate: string) => {
    if (!employee || !employee.salary_base || !employee.hire_date) {
      return {};
    }

    const hireDate = new Date(employee.hire_date);
    const termDate = new Date(terminationDate);
    const monthsWorked = Math.max(
      0,
      (termDate.getFullYear() - hireDate.getFullYear()) * 12 + (termDate.getMonth() - hireDate.getMonth())
    );
    const yearsWorked = monthsWorked / 12;

    const salary = Number(employee.salary_base);
    const calculations: Record<string, number> = {};

    // Saldo de salário (proporcional)
    const daysInMonth = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0).getDate();
    const daysWorked = termDate.getDate();
    calculations.saldo_salario = (salary / daysInMonth) * daysWorked;

    // Férias proporcionais
    const vacationDays = Math.floor(monthsWorked / 12) * 30;
    const proportionalVacation = (monthsWorked % 12) * 2.5;
    calculations.ferias_proporcionais = ((vacationDays + proportionalVacation) / 30) * salary;

    // 13º salário proporcional
    calculations.decimo_terceiro = (monthsWorked / 12) * salary;

    // Aviso prévio
    if (terminationType === "without_cause" || terminationType === "with_cause") {
      calculations.aviso_previo = salary; // 30 dias
    }

    // FGTS
    const fgtsBase = salary * monthsWorked;
    calculations.fgts = fgtsBase * 0.08; // 8% do salário
    if (terminationType === "without_cause") {
      calculations.multa_fgts = calculations.fgts * 0.4; // 40% do FGTS
    } else {
      calculations.multa_fgts = 0;
    }

    // Total
    calculations.total = Object.values(calculations).reduce((sum, val) => sum + val, 0);

    return calculations;
  };

  const handleStartTermination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || !formData.employee_id) return;

    const employee = employees.find((e) => e.id === formData.employee_id);
    const calculations = calculateSeverance(employee, formData.termination_type, formData.termination_date);

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("terminations").insert({
        employee_id: formData.employee_id,
        store_id: currentStore.id,
        termination_date: formData.termination_date,
        termination_type: formData.termination_type,
        reason: formData.reason.trim(),
        severance_calculation: calculations,
        checklist: {},
        status: "in_progress",
        created_by: user.id,
        notes: formData.notes.trim() || null,
      });

      if (insertError) throw insertError;

      // Atualizar status do colaborador para terminated
      await supabase
        .from("employees")
        .update({ status: "terminated" })
        .eq("id", formData.employee_id);

      setShowForm(false);
      setFormData({
        employee_id: "",
        termination_date: "",
        termination_type: "without_cause",
        reason: "",
        notes: "",
      });
      await loadTerminations();
      await loadEmployees();
    } catch (error: any) {
      console.error("Erro ao iniciar processo:", error);
      setError(error.message || "Não foi possível iniciar o processo de rescisão.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChecklist = async (terminationId: string, checklist: Record<string, boolean>) => {
    try {
      const allCompleted = TERMINATION_CHECKLIST.every((item) => checklist[item.key] === true);

      const { error: updateError } = await supabase
        .from("terminations")
        .update({
          checklist,
          status: allCompleted ? "completed" : "in_progress",
          completed_at: allCompleted ? new Date().toISOString() : null,
        })
        .eq("id", terminationId);

      if (updateError) throw updateError;
      await loadTerminations();
    } catch (error: any) {
      console.error("Erro ao atualizar checklist:", error);
      setError(error.message || "Não foi possível atualizar o checklist.");
    }
  };

  const getProgress = (checklist: Record<string, boolean>) => {
    const completed = TERMINATION_CHECKLIST.filter((item) => checklist[item.key] === true).length;
    return Math.round((completed / TERMINATION_CHECKLIST.length) * 100);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar processos de rescisão.
        </CardContent>
      </Card>
    );
  }

  const selectedEmployee = employees.find((e) => e.id === formData.employee_id);
  const previewCalculation =
    formData.employee_id && formData.termination_date
      ? calculateSeverance(selectedEmployee, formData.termination_type, formData.termination_date)
      : {};

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
          <h2 className="text-xl font-semibold">Processos de Rescisão</h2>
          <p className="text-sm text-muted-foreground">Gerencie o processo de desligamento de colaboradores</p>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              termination_date: new Date().toISOString().split("T")[0],
              termination_type: "without_cause",
              reason: "",
              notes: "",
            });
            setShowForm(true);
          }}
          className="bg-red-600 hover:bg-red-700"
        >
          <FileX className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Processo de Rescisão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartTermination} className="space-y-4">
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
                  <Label htmlFor="termination_date">Data de Desligamento *</Label>
                  <Input
                    id="termination_date"
                    type="date"
                    value={formData.termination_date}
                    onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="termination_type">Tipo de Rescisão *</Label>
                  <Select
                    value={formData.termination_type}
                    onValueChange={(value: "without_cause" | "with_cause" | "resignation" | "contract_end") =>
                      setFormData({ ...formData, termination_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMINATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="reason">Motivo da Rescisão *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Descreva o motivo da rescisão..."
                    rows={3}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações adicionais sobre o processo..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Preview do Cálculo */}
              {Object.keys(previewCalculation).length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Prévia do Cálculo de Verbas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(previewCalculation)
                        .filter(([key]) => key !== "total")
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">
                              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                            </span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                        ))}
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                        <span>Total:</span>
                        <span className="text-green-600">
                          {formatCurrency(previewCalculation.total || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saving}>
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
        ) : terminations.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            Nenhum processo de rescisão encontrado.
          </div>
        ) : (
          terminations.map((termination) => {
            const progress = getProgress(termination.checklist);
            return (
              <Card key={termination.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{termination.employee_name}</CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        termination.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : termination.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {termination.status === "completed"
                        ? "Concluído"
                        : termination.status === "cancelled"
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
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Tipo:</strong>{" "}
                      {TERMINATION_TYPES.find((t) => t.value === termination.termination_type)?.label}
                    </div>
                    <div>
                      <strong>Data:</strong> {new Date(termination.termination_date).toLocaleDateString("pt-BR")}
                    </div>
                    <div>
                      <strong>Motivo:</strong> {termination.reason}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-sm font-semibold">Checklist de Rescisão</Label>
                    {TERMINATION_CHECKLIST.map((item) => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${termination.id}-${item.key}`}
                          checked={termination.checklist[item.key] === true}
                          onCheckedChange={(checked) => {
                            const newChecklist = {
                              ...termination.checklist,
                              [item.key]: checked === true,
                            };
                            handleUpdateChecklist(termination.id, newChecklist);
                          }}
                          disabled={termination.status === "completed" || termination.status === "cancelled"}
                        />
                        <Label
                          htmlFor={`${termination.id}-${item.key}`}
                          className={`text-sm ${
                            termination.checklist[item.key] === true
                              ? "text-green-600 line-through"
                              : "text-gray-700"
                          }`}
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {/* Cálculo de Verbas */}
                  {Object.keys(termination.severance_calculation).length > 0 && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4" />
                        Verbas Rescisórias
                      </Label>
                      <div className="space-y-1 text-sm bg-gray-50 p-3 rounded">
                        {Object.entries(termination.severance_calculation)
                          .filter(([key]) => key !== "total")
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize text-muted-foreground">
                                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                              </span>
                              <span className="font-medium">{formatCurrency(value)}</span>
                            </div>
                          ))}
                        <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-green-600">
                            {formatCurrency(termination.severance_calculation.total || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {termination.notes && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <strong>Observações:</strong> {termination.notes}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Iniciado em: {new Date(termination.created_at).toLocaleDateString("pt-BR")}
                    {termination.completed_at &&
                      ` • Concluído em: ${new Date(termination.completed_at).toLocaleDateString("pt-BR")}`}
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

