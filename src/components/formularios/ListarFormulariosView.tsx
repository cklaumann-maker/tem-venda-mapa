"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Eye, Copy, Power, PowerOff, Loader2, Search, FileText, MessageSquare } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { supabaseClient } from "@/lib/supabaseClient";

type Form = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  allow_multiple_responses: boolean;
  notify_on_response: boolean;
  questions: any[];
  created_at: string;
  updated_at: string;
};

export default function ListarFormulariosView({
  onEdit,
  onRespond,
}: {
  onEdit?: (formId: string) => void;
  onRespond?: (formId: string) => void;
}) {
  const { currentStore, isAdmin } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (currentStore) {
      loadForms();
    }
  }, [currentStore, categoryFilter, statusFilter]);

  const loadForms = async () => {
    if (!currentStore) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("forms")
        .select("*")
        .eq("store_id", currentStore.id)
        .order("created_at", { ascending: false });

      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      } else if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setForms((data || []) as Form[]);
    } catch (error: any) {
      console.error("Erro ao carregar formulários:", error);
      setError("Não foi possível carregar os formulários.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (formId: string, currentStatus: boolean) => {
    if (!currentStore) return;
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("forms")
        .update({ is_active: !currentStatus })
        .eq("id", formId);

      if (updateError) throw updateError;
      await loadForms();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      setError("Não foi possível atualizar o status do formulário.");
    }
  };

  const handleDelete = async (formId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este formulário? Todas as respostas também serão excluídas."))
      return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("forms").delete().eq("id", formId);
      if (deleteError) throw deleteError;
      await loadForms();
    } catch (error: any) {
      console.error("Erro ao excluir formulário:", error);
      setError("Não foi possível excluir o formulário.");
    }
  };

  const handleDuplicate = async (form: Form) => {
    if (!currentStore) return;
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const duplicateForm = {
        store_id: currentStore.id,
        title: `${form.title} (Cópia)`,
        description: form.description,
        category: form.category,
        is_active: false, // Cópia inativa por padrão
        allow_multiple_responses: form.allow_multiple_responses,
        requires_authentication: true,
        notify_on_response: form.notify_on_response,
        notification_recipients: form.notification_recipients || [],
        notification_template: form.notification_template || "",
        questions: form.questions,
        created_by: userData.user.id,
      };

      const { error: insertError } = await supabase.from("forms").insert(duplicateForm);
      if (insertError) throw insertError;
      await loadForms();
    } catch (error: any) {
      console.error("Erro ao duplicar formulário:", error);
      setError("Não foi possível duplicar o formulário.");
    }
  };

  const canManage = isAdmin || true;

  const filteredForms = forms.filter((form) => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const categories = [
    { value: "all", label: "Todas as categorias" },
    { value: "admission", label: "Admissão" },
    { value: "evaluation", label: "Avaliação" },
    { value: "checklist", label: "Checklist" },
    { value: "survey", label: "Pesquisa" },
    { value: "other", label: "Outro" },
  ];

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para visualizar formulários.
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
                  placeholder="Buscar formulários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Apenas ativos</SelectItem>
                  <SelectItem value="inactive">Apenas inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Formulários */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando formulários...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum formulário encontrado</p>
            <p className="text-sm mt-2">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Crie seu primeiro formulário para começar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {form.title}
                      {form.is_active ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">
                          Inativo
                        </span>
                      )}
                    </CardTitle>
                    {form.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {form.questions?.length || 0} pergunta{form.questions?.length !== 1 ? "s" : ""}
                    </span>
                    {form.category && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        {categories.find((c) => c.value === form.category)?.label || form.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  {/* Botão Responder - sempre visível para formulários ativos */}
                  {form.is_active && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => onRespond && onRespond(form.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Responder
                    </Button>
                  )}
                  {!form.is_active && (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      <Eye className="w-4 h-4 mr-2" />
                      Inativo
                    </Button>
                  )}
                  
                  {/* Botões de gerenciamento - apenas para gerentes/admins */}
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(form.id, form.is_active)}
                        title={form.is_active ? "Desativar formulário" : "Ativar formulário"}
                      >
                        {form.is_active ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit && onEdit(form.id)}
                        title="Editar formulário"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(form)}
                        title="Duplicar formulário"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(form.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir formulário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Criado em: {new Date(form.created_at).toLocaleDateString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

