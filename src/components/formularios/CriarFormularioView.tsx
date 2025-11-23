"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, Eye, Loader2, AlertCircle, MessageSquare } from "lucide-react";
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
      const payload = {
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
      };

      const { error: insertError } = await supabase.from("forms").insert(payload);

      if (insertError) throw insertError;

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
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Formulário de Avaliação de Desempenho"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
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
              Notificações Z-API
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
                  <Textarea
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
                      <Input
                        value={question.title}
                        onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                        placeholder="Digite a pergunta..."
                        required
                      />
                    </div>
                    <div>
                      <Label>Descrição (opcional)</Label>
                      <Textarea
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
                              <Input
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

