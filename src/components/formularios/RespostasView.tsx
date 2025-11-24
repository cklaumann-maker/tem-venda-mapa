"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Download, Search, Loader2, FileText, Calendar, User } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";

type FormResponse = {
  id: string;
  form_id: string;
  form_title?: string;
  employee_id: string | null;
  employee_name?: string;
  submitted_by?: string | null;
  responses: Record<string, any>;
  submitted_at: string;
  notification_sent: boolean;
};

export default function RespostasView() {
  const { currentStore } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [selectedFormQuestions, setSelectedFormQuestions] = useState<Record<string, string>>({});
  const [formFilter, setFormFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentStore) {
      loadForms();
      loadResponses();
    }
  }, [currentStore, formFilter]);

  const loadForms = async () => {
    if (!currentStore) return;
    try {
      const { data, error: fetchError } = await supabase
        .from("forms")
        .select("id, title")
        .eq("store_id", currentStore.id)
        .order("title", { ascending: true });

      if (fetchError) throw fetchError;
      setForms((data || []) as { id: string; title: string }[]);
    } catch (error) {
      console.error("Erro ao carregar formulários:", error);
    }
  };

  const loadResponses = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("form_responses")
        .select(`
          *,
          forms!inner(id, title)
        `)
        .eq("store_id", currentStore.id)
        .order("submitted_at", { ascending: false });

      if (formFilter !== "all") {
        query = query.eq("form_id", formFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const responsesWithForm = (data || []).map((resp: any) => ({
        ...resp,
        form_title: resp.forms?.title || "",
      }));

      // Buscar nomes dos colaboradores ou usuários
      const responsesWithNames = await Promise.all(
        responsesWithForm.map(async (resp: FormResponse) => {
          // Primeiro tenta buscar pelo employee_id
          if (resp.employee_id) {
            const { data: employeeData } = await supabase
              .from("employees")
              .select("name")
              .eq("id", resp.employee_id)
              .maybeSingle();
            return {
              ...resp,
              employee_name: employeeData?.name || "Colaborador não encontrado",
            };
          }
          
          // Se não houver employee_id, busca pelo submitted_by (usuário que respondeu)
          if (resp.submitted_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", resp.submitted_by)
              .maybeSingle();
            return {
              ...resp,
              employee_name: profileData?.full_name || "Usuário não encontrado",
            };
          }
          
          return { ...resp, employee_name: "Anônimo" };
        })
      );

      setResponses(responsesWithNames as FormResponse[]);
    } catch (error: any) {
      console.error("Erro ao carregar respostas:", error);
      setError("Não foi possível carregar as respostas.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (responses.length === 0) return;

    const csv = [
      ["Formulário", "Colaborador", "Data/Hora", "Respostas"],
      ...responses.map((resp) => [
        resp.form_title || "",
        resp.employee_name || "Anônimo",
        new Date(resp.submitted_at).toLocaleString("pt-BR"),
        JSON.stringify(resp.responses),
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `respostas-formularios-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResponses = responses.filter((resp) => {
    const matchesSearch =
      resp.form_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para visualizar respostas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar respostas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por formulário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline" className="w-full" disabled={responses.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Respostas */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando respostas...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma resposta encontrada</p>
            <p className="text-sm mt-2">
              {searchTerm || formFilter !== "all"
                ? "Tente ajustar os filtros de busca"
                : "As respostas dos formulários aparecerão aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResponses.map((response) => (
            <Card key={response.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{response.form_title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {response.employee_name || "Anônimo"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(response.submitted_at).toLocaleString("pt-BR")}
                      </div>
                      {response.notification_sent && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                          Notificação enviada
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSelectedResponse(response);
                      // Carregar perguntas do formulário para mapear IDs para títulos
                      if (response.form_id) {
                        const { data: formData } = await supabase
                          .from("forms")
                          .select("questions")
                          .eq("id", response.form_id)
                          .maybeSingle();
                        
                        if (formData?.questions) {
                          const questionsMap: Record<string, string> = {};
                          (formData.questions as any[]).forEach((q: any) => {
                            questionsMap[q.id] = q.title || q.id;
                          });
                          setSelectedFormQuestions(questionsMap);
                        }
                      }
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedResponse && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalhes da Resposta</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedResponse(null);
                setSelectedFormQuestions({});
              }}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Formulário:</strong> {selectedResponse.form_title}
              </div>
              <div>
                <strong>Colaborador:</strong> {selectedResponse.employee_name || "Anônimo"}
              </div>
              <div>
                <strong>Data/Hora:</strong> {new Date(selectedResponse.submitted_at).toLocaleString("pt-BR")}
              </div>
              <div>
                <strong>Notificação:</strong> {selectedResponse.notification_sent ? "Enviada" : "Não enviada"}
              </div>
            </div>
            <div className="border-t pt-4">
              <strong className="text-sm">Respostas:</strong>
              <div className="mt-2 space-y-2">
                {Object.entries(selectedResponse.responses || {}).map(([key, value]) => {
                  // Usar o título da pergunta se disponível, senão usar a chave
                  const questionTitle = selectedFormQuestions[key] || key;
                  // Remover prefixo "q_" se existir e não houver título mapeado
                  const displayKey = questionTitle === key && key.startsWith("q_") 
                    ? key.replace(/^q_\d+:/, "").trim() || key 
                    : questionTitle;
                  
                  return (
                    <div key={key} className="p-3 bg-gray-50 rounded">
                      <strong className="text-sm">{displayKey}:</strong>
                      <p className="text-sm mt-1">
                        {Array.isArray(value) ? value.join(", ") : String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

