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
import { Send, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";
import { ZApiService } from "@/lib/zapi";

type Question = {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  notify_on_response: boolean;
  notification_recipients: string[];
  notification_template: string;
};

export default function ResponderFormularioView({
  formId,
  onSuccess,
  onCancel,
}: {
  formId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore } = useStore();
  const { user: authUser } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [employee, setEmployee] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (formId) {
      loadForm();
      loadEmployee();
    }
  }, [formId, getStoreIdsForQuery, viewMode]);

  const loadForm = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setError("Nenhuma loja disponível.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .in("store_id", storeIds)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError("Formulário não encontrado ou inativo.");
        return;
      }

      setForm(data as Form);
    } catch (error: any) {
      console.error("Erro ao carregar formulário:", error);
      setError("Não foi possível carregar o formulário.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployee = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0 || !authUser) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("id, name")
        .in("store_id", storeIds)
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        setEmployee({ id: data.id, name: data.name });
      }
    } catch (error) {
      console.error("Erro ao carregar colaborador:", error);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses({
      ...responses,
      [questionId]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !currentStoreId) return;

    // Validar campos obrigatórios
    const requiredQuestions = form.questions.filter((q) => q.required);
    const missingRequired = requiredQuestions.filter((q) => {
      const response = responses[q.id];
      return response === undefined || response === null || response === "" || (Array.isArray(response) && response.length === 0);
    });

    if (missingRequired.length > 0) {
      setError(`Por favor, preencha todos os campos obrigatórios: ${missingRequired.map((q) => q.title).join(", ")}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Salvar resposta
      const { data: responseData, error: insertError } = await supabase
        .from("form_responses")
        .insert({
          form_id: form.id,
          store_id: currentStoreId,
          employee_id: employee?.id || null,
          responses: responses,
          submitted_by: authUser?.id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar tarefa agendada se existir para hoje
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: tasksData } = await supabase
          .from("form_schedule_tasks")
          .select("id")
          .eq("form_id", form.id)
          .eq("store_id", currentStoreId)
          .eq("scheduled_date", today)
          .eq("status", "pending")
          .limit(1);

        if (tasksData && tasksData.length > 0) {
          await supabase
            .from("form_schedule_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              response_id: responseData.id,
            })
            .eq("id", tasksData[0].id);
        }
      } catch (taskError) {
        console.error("Erro ao atualizar tarefa agendada:", taskError);
        // Não falhar o envio se houver erro ao atualizar a tarefa
      }

      // Enviar notificação Z-API se configurado
      if (form.notify_on_response) {
        try {
          const zapiService = new ZApiService();
          
          // Formatar mensagem
          const formattedResponses = form.questions
            .map((q) => {
              const answer = responses[q.id];
              let formattedAnswer = "";
              if (Array.isArray(answer)) {
                formattedAnswer = answer.join(", ");
              } else {
                formattedAnswer = String(answer || "Não respondido");
              }
              return `• ${q.title}: ${formattedAnswer}`;
            })
            .join("\n");

          let message = form.notification_template || `📋 *Nova Resposta de Formulário*\n\n*Formulário:* {formulario}\n*Colaborador:* {colaborador}\n*Loja:* {loja}\n*Data:* {data}\n\n*Respostas:*\n{respostas}`;
          
          message = message
            .replace(/{formulario}/g, form.title)
            .replace(/{colaborador}/g, employee?.name || "Anônimo")
            .replace(/{loja}/g, currentStore?.name || "Loja")
            .replace(/{data}/g, new Date().toLocaleString("pt-BR"))
            .replace(/{respostas}/g, formattedResponses);

          // Enviar para destinatários ou usar configuração padrão
          const recipients = form.notification_recipients && form.notification_recipients.length > 0
            ? form.notification_recipients
            : undefined;

          if (recipients && recipients.length > 0) {
            // Enviar para múltiplos destinatários
            for (const recipient of recipients) {
              await zapiService.sendMessage({
                phone: recipient,
                message: message,
              });
            }
          } else {
            // Usar configuração padrão (será buscada no servidor)
            await zapiService.sendMessage({
              phone: "5551982813505", // Fallback
              message: message,
            });
          }

          // Atualizar status da notificação
          await supabase
            .from("form_responses")
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString(),
            })
            .eq("id", responseData.id);
        } catch (notificationError: any) {
          console.error("Erro ao enviar notificação:", notificationError);
          // Não falhar o envio se a notificação falhar
          await supabase
            .from("form_responses")
            .update({
              notification_error: notificationError.message || "Erro desconhecido",
            })
            .eq("id", responseData.id);
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao salvar resposta:", error);
      setError(error.message || "Não foi possível salvar a resposta.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Carregando formulário...</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-800">{error}</p>
          {onCancel && (
            <Button onClick={onCancel} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!form) return null;

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{form.title}</CardTitle>
              {form.description && (
                <p className="text-muted-foreground mt-2">{form.description}</p>
              )}
            </div>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={question.id} className="text-base">
                  {question.title}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {question.description && (
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                )}

                {question.type === "text" && (
                  <InputWithEmoji
                    id={question.id}
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    required={question.required}
                  />
                )}

                {question.type === "textarea" && (
                  <TextareaWithEmoji
                    id={question.id}
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    rows={4}
                    required={question.required}
                  />
                )}

                {question.type === "number" && (
                  <Input
                    id={question.id}
                    type="number"
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponseChange(question.id, parseFloat(e.target.value) || 0)}
                    placeholder={question.placeholder}
                    required={question.required}
                  />
                )}

                {question.type === "date" && (
                  <Input
                    id={question.id}
                    type="date"
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    required={question.required}
                  />
                )}

                {question.type === "select" && (
                  <Select
                    value={responses[question.id] || ""}
                    onValueChange={(value) => handleResponseChange(question.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options?.map((option, optIndex) => (
                        <SelectItem key={optIndex} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {question.type === "radio" && (
                  <div className="space-y-2">
                    {question.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.id}_${optIndex}`}
                          name={question.id}
                          value={option}
                          checked={responses[question.id] === option}
                          onChange={(e) => handleResponseChange(question.id, e.target.value)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`${question.id}_${optIndex}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "checkbox" && (
                  <div className="space-y-2">
                    {question.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${question.id}_${optIndex}`}
                          checked={(responses[question.id] || []).includes(option)}
                          onCheckedChange={(checked) => {
                            const current = responses[question.id] || [];
                            if (checked) {
                              handleResponseChange(question.id, [...current, option]);
                            } else {
                              handleResponseChange(
                                question.id,
                                current.filter((v: string) => v !== option)
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`${question.id}_${optIndex}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

