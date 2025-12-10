"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithEmoji } from "@/components/ui/input-with-emoji";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextareaWithEmoji } from "@/components/ui/textarea-with-emoji";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, Eye, Loader2, AlertCircle, MessageSquare, Calendar, Clock } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type QuestionType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox";

type Question = {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

type FormData = {
  title: string;
  description: string;
  category: string;
  is_active: boolean;
  allow_multiple_responses: boolean;
  requires_authentication: boolean;
  notify_on_response: boolean;
  notification_recipients: string[];
  notification_template: string;
  questions: Question[];
  // Agendamento
  schedule_enabled: boolean;
  schedule_frequency: string; // 'daily', 'weekly', 'custom_days', 'custom_interval'
  schedule_time: string; // HH:mm
  schedule_days_of_week: number[]; // Para frequência semanal (0=domingo, 1=segunda, etc.)
  schedule_interval_days: number; // Para frequência "de X em X dias"
  schedule_start_date: string; // Data de início
  schedule_end_date: string; // Data de fim (opcional)
};

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto Longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção (Dropdown)" },
  { value: "radio", label: "Seleção Única" },
  { value: "checkbox", label: "Múltipla Escolha" },
];

const CATEGORIES = [
  { value: "admission", label: "Admissão" },
  { value: "evaluation", label: "Avaliação" },
  { value: "checklist", label: "Checklist" },
  { value: "survey", label: "Pesquisa" },
  { value: "other", label: "Outro" },
];

const DEFAULT_NOTIFICATION_TEMPLATE = `📋 *Nova Resposta de Formulário*

*Formulário:* {formulario}
*Colaborador:* {colaborador}
*Loja:* {loja}
*Data:* {data}

*Respostas:*
{respostas}`;

export default function CriarFormularioView({ onSuccess }: { onSuccess?: () => void }) {
  const { currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "other",
    is_active: true,
    allow_multiple_responses: false,
    requires_authentication: true,
    notify_on_response: true,
    notification_recipients: [],
    notification_template: DEFAULT_NOTIFICATION_TEMPLATE,
    questions: [],
    // Agendamento
    schedule_enabled: false,
    schedule_frequency: "daily",
    schedule_time: "08:00",
    schedule_days_of_week: [1, 2, 3, 4, 5], // Segunda a sexta por padrão
    schedule_interval_days: 1,
    schedule_start_date: new Date().toISOString().split("T")[0],
    schedule_end_date: "",
  });

  const [newRecipient, setNewRecipient] = useState("");

  const canManage = isAdmin || true;

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: "text",
      title: "",
      required: false,
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion],
    });
  };

  const removeQuestion = (questionId: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    });
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(formData.questions.find((q) => q.id === questionId)?.options || []), ""],
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = formData.questions.find((q) => q.id === questionId);
    if (!question) return;
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = formData.questions.find((q) => q.id === questionId);
    if (!question) return;
    const newOptions = question.options?.filter((_, i) => i !== optionIndex) || [];
    updateQuestion(questionId, { options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user) return;

    // Validações
    if (!formData.title.trim()) {
      setError("O título do formulário é obrigatório.");
      return;
    }

    if (formData.questions.length === 0) {
      setError("Adicione pelo menos uma pergunta ao formulário.");
      return;
    }

    const questionsWithTitles = formData.questions.filter((q) => q.title.trim());
    if (questionsWithTitles.length === 0) {
      setError("Todas as perguntas devem ter um título.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        store_id: currentStore.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        is_active: formData.is_active,
        allow_multiple_responses: formData.allow_multiple_responses,
        requires_authentication: formData.requires_authentication,
        notify_on_response: formData.notify_on_response,
        notification_recipients: formData.notification_recipients,
        notification_template: formData.notification_template.trim() || DEFAULT_NOTIFICATION_TEMPLATE,
        questions: questionsWithTitles,
        created_by: user.id,
        // Agendamento
        schedule_enabled: formData.schedule_enabled,
        schedule_frequency: formData.schedule_enabled ? formData.schedule_frequency : null,
        schedule_time: formData.schedule_enabled ? formData.schedule_time : null,
        schedule_days_of_week: formData.schedule_enabled && formData.schedule_frequency === "weekly" ? formData.schedule_days_of_week : null,
        schedule_interval_days: formData.schedule_enabled && formData.schedule_frequency === "custom_interval" ? formData.schedule_interval_days : null,
        schedule_start_date: formData.schedule_enabled ? formData.schedule_start_date : null,
        schedule_end_date: formData.schedule_enabled && formData.schedule_end_date ? formData.schedule_end_date : null,
      };

      const { data: insertedForm, error: insertError } = await supabase.from("forms").insert(payload).select().single();

      if (insertError) throw insertError;

      // Se o agendamento está habilitado, criar as tarefas agendadas
      if (formData.schedule_enabled && insertedForm) {
        await createScheduledTasks(insertedForm.id);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao salvar formulário:", error);
      setError(error.message || "Não foi possível salvar o formulário.");
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !formData.notification_recipients.includes(newRecipient.trim())) {
      setFormData({
        ...formData,
        notification_recipients: [...formData.notification_recipients, newRecipient.trim()],
      });
      setNewRecipient("");
    }
  };

  const removeRecipient = (recipient: string) => {
    setFormData({
      ...formData,
      notification_recipients: formData.notification_recipients.filter((r) => r !== recipient),
    });
  };

  // Função para criar tarefas agendadas
  const createScheduledTasks = async (formId: string) => {
    if (!currentStore || !formData.schedule_enabled) return;

    const tasks: any[] = [];
    const startDate = new Date(formData.schedule_start_date);
    const endDate = formData.schedule_end_date ? new Date(formData.schedule_end_date) : null;
    const [hours, minutes] = formData.schedule_time.split(":").map(Number);
    const currentDate = new Date(startDate);

    // Limitar a criação de tarefas para os próximos 365 dias
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 365);
    const finalEndDate = endDate && endDate < maxDate ? endDate : maxDate;

    while (currentDate <= finalEndDate) {
      let shouldSchedule = false;

      if (formData.schedule_frequency === "daily") {
        shouldSchedule = true;
      } else if (formData.schedule_frequency === "weekly") {
        const dayOfWeek = currentDate.getDay();
        shouldSchedule = formData.schedule_days_of_week.includes(dayOfWeek);
      } else if (formData.schedule_frequency === "custom_interval") {
        const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        shouldSchedule = daysDiff % formData.schedule_interval_days === 0;
      } else if (formData.schedule_frequency === "custom_days") {
        // Similar a weekly, mas pode ser configurado de forma diferente
        const dayOfWeek = currentDate.getDay();
        shouldSchedule = formData.schedule_days_of_week.includes(dayOfWeek);
      }

      if (shouldSchedule) {
        const scheduledDateTime = new Date(currentDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        tasks.push({
          form_id: formId,
          store_id: currentStore.id,
          scheduled_date: currentDate.toISOString().split("T")[0],
          scheduled_time: formData.schedule_time,
          scheduled_datetime: scheduledDateTime.toISOString(),
          status: "pending",
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Inserir tarefas em lotes (Supabase tem limite de 1000 por insert)
    const batchSize = 500;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const { error } = await supabase.from("form_schedule_tasks").insert(batch);
      if (error) {
        console.error("Erro ao criar tarefas agendadas:", error);
        // Não falhar o salvamento do formulário se houver erro nas tarefas
      }
    }
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para criar formulários.
        </CardContent>
      </Card>
    );
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Você não tem permissão para criar formulários.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título do Formulário *</Label>
              <InputWithEmoji
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Formulário de Avaliação de Desempenho"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <TextareaWithEmoji
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo deste formulário..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked === true })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Formulário ativo (disponível para resposta)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_multiple"
                checked={formData.allow_multiple_responses}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_multiple_responses: checked === true })
                }
              />
              <Label htmlFor="allow_multiple" className="cursor-pointer">
                Permitir múltiplas respostas do mesmo colaborador
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Notificação Z-API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Notificações via WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify_on_response"
                checked={formData.notify_on_response}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notify_on_response: checked === true })
                }
              />
              <Label htmlFor="notify_on_response" className="cursor-pointer">
                Enviar notificação via WhatsApp quando houver resposta
              </Label>
            </div>

            {formData.notify_on_response && (
              <>
                <div>
                  <Label htmlFor="recipients">Destinatários (Números WhatsApp)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="recipients"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      placeholder="5511999999999"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRecipient();
                        }
                      }}
                    />
                    <Button type="button" onClick={addRecipient} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.notification_recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.notification_recipients.map((recipient) => (
                        <span
                          key={recipient}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1"
                        >
                          {recipient}
                          <button
                            type="button"
                            onClick={() => removeRecipient(recipient)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Se vazio, usará o número configurado nas configurações da Z-API
                  </p>
                </div>

                <div>
                  <Label htmlFor="template">Template da Mensagem</Label>
                  <TextareaWithEmoji
                    id="template"
                    value={formData.notification_template}
                    onChange={(e) =>
                      setFormData({ ...formData, notification_template: e.target.value })
                    }
                    placeholder="Template da mensagem..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis disponíveis: {"{formulario}"}, {"{colaborador}"}, {"{loja}"}, {"{data}"}, {"{respostas}"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Agendamento de Frequência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Agendamento de Frequência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule_enabled"
                checked={formData.schedule_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, schedule_enabled: checked === true })
                }
              />
              <Label htmlFor="schedule_enabled" className="cursor-pointer">
                Habilitar agendamento automático de respostas
              </Label>
            </div>

            {formData.schedule_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule_frequency">Frequência</Label>
                    <Select
                      value={formData.schedule_frequency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, schedule_frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Todos os dias</SelectItem>
                        <SelectItem value="weekly">Semanal (dias específicos)</SelectItem>
                        <SelectItem value="custom_interval">De X em X dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schedule_time">Horário</Label>
                    <Input
                      id="schedule_time"
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) =>
                        setFormData({ ...formData, schedule_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                {formData.schedule_frequency === "weekly" && (
                  <div>
                    <Label>Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { value: 0, label: "Dom" },
                        { value: 1, label: "Seg" },
                        { value: 2, label: "Ter" },
                        { value: 3, label: "Qua" },
                        { value: 4, label: "Qui" },
                        { value: 5, label: "Sex" },
                        { value: 6, label: "Sáb" },
                      ].map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const currentDays = formData.schedule_days_of_week;
                            const newDays = currentDays.includes(day.value)
                              ? currentDays.filter((d) => d !== day.value)
                              : [...currentDays, day.value];
                            setFormData({ ...formData, schedule_days_of_week: newDays });
                          }}
                          className={`px-3 py-1 rounded text-sm ${
                            formData.schedule_days_of_week.includes(day.value)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.schedule_frequency === "custom_interval" && (
                  <div>
                    <Label htmlFor="schedule_interval_days">Intervalo (dias)</Label>
                    <Input
                      id="schedule_interval_days"
                      type="number"
                      min="1"
                      value={formData.schedule_interval_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          schedule_interval_days: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplo: 3 = de 3 em 3 dias
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule_start_date">Data de Início</Label>
                    <Input
                      id="schedule_start_date"
                      type="date"
                      value={formData.schedule_start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, schedule_start_date: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule_end_date">Data de Fim (opcional)</Label>
                    <Input
                      id="schedule_end_date"
                      type="date"
                      value={formData.schedule_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, schedule_end_date: e.target.value })
                      }
                      min={formData.schedule_start_date}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Deixe vazio para sem data de fim
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                  <strong>Como funciona:</strong> Quando você salvar este formulário, serão criadas
                  automaticamente tarefas no calendário para cada data/hora agendada. Os
                  colaboradores poderão ver essas tarefas na aba "Dashboards" e você poderá
                  acompanhar quais foram respondidas.
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Perguntas */}
        <Card>
          <CardHeader>
            <CardTitle>Perguntas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Button type="button" onClick={addQuestion} variant="outline" size="lg" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Pergunta
                </Button>
              </div>
            ) : (
              <>
                {formData.questions.map((question, index) => (
                <Card key={question.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pergunta {index + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Tipo de Pergunta</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value: QuestionType) =>
                          updateQuestion(question.id, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Título da Pergunta *</Label>
                      <InputWithEmoji
                        value={question.title}
                        onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                        placeholder="Digite a pergunta..."
                        required
                      />
                    </div>
                    <div>
                      <Label>Descrição (opcional)</Label>
                      <TextareaWithEmoji
                        value={question.description || ""}
                        onChange={(e) =>
                          updateQuestion(question.id, { description: e.target.value })
                        }
                        placeholder="Texto de ajuda ou instruções..."
                        rows={2}
                      />
                    </div>
                    {(question.type === "select" || question.type === "radio" || question.type === "checkbox") && (
                      <div>
                        <Label>Opções</Label>
                        <div className="space-y-2 mt-1">
                          {question.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <InputWithEmoji
                                value={option}
                                onChange={(e) =>
                                  updateOption(question.id, optIndex, e.target.value)
                                }
                                placeholder={`Opção ${optIndex + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(question.id, optIndex)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Opção
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required_${question.id}`}
                        checked={question.required}
                        onCheckedChange={(checked) =>
                          updateQuestion(question.id, { required: checked === true })
                        }
                      />
                      <Label htmlFor={`required_${question.id}`} className="cursor-pointer">
                        Campo obrigatório
                      </Label>
                    </div>
                  </CardContent>
                </Card>
                ))}
                {/* Botão Adicionar Pergunta após a última pergunta */}
                <div className="pt-2">
                  <Button type="button" onClick={addQuestion} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Ocultar" : "Mostrar"} Preview
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Formulário
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

