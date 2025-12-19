"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Loader2, Download, Trash2 } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabaseClient";

type Document = {
  id: string;
  employee_id: string;
  employee_name?: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  expiry_date: string | null;
  is_valid: boolean;
  uploaded_at: string;
  notes: string | null;
};

type Employee = {
  id: string;
  name: string;
};

const DOCUMENT_TYPES = [
  { value: "admission", label: "Admissão" },
  { value: "license", label: "Licença" },
  { value: "certificate", label: "Certificado" },
  { value: "medical", label: "Médico (ASO)" },
  { value: "training", label: "Treinamento" },
  { value: "contract", label: "Contrato" },
  { value: "termination", label: "Rescisão" },
  { value: "other", label: "Outro" },
];

export default function DocumentosView() {
  const { getStoreIdsForQuery, viewMode, currentStoreId, currentStore, isAdmin } = useStore();
  const { user } = useAuth();
  const supabase = useMemo(() => supabaseClient(), []);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expiringFilter, setExpiringFilter] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    document_type: "",
    document_name: "",
    expiry_date: "",
    notes: "",
    file: null as File | null,
  });

  useEffect(() => {
    loadEmployees();
    loadDocuments();
  }, [getStoreIdsForQuery, viewMode, employeeFilter, typeFilter, expiringFilter]);

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
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  };

  const loadDocuments = async () => {
    const storeIds = getStoreIdsForQuery();
    if (!storeIds || storeIds.length === 0) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("employee_documents")
        .select(`
          *,
          employees!inner(name)
        `)
        .in("store_id", storeIds)
        .order("uploaded_at", { ascending: false });

      if (employeeFilter !== "all") {
        query = query.eq("employee_id", employeeFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("document_type", typeFilter);
      }

      if (expiringFilter) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .not("expiry_date", "is", null)
          .lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0]);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const documentsWithNames = (data || []).map((doc: any) => ({
        ...doc,
        employee_name: doc.employees?.name || "",
      }));

      // Verificar validade dos documentos
      const now = new Date();
      const updatedDocuments = documentsWithNames.map((doc: Document) => ({
        ...doc,
        is_valid: doc.expiry_date
          ? new Date(doc.expiry_date) >= now
          : doc.is_valid,
      }));

      setDocuments(updatedDocuments as Document[]);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      setError("Não foi possível carregar os documentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || !formData.employee_id || !formData.file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload do arquivo para Supabase Storage
      const fileExt = formData.file.name.split(".").pop();
      const sanitizedName = formData.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `${formData.employee_id}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("employee-documents")
        .upload(filePath, formData.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("not found")) {
          throw new Error(
            "Bucket de storage não encontrado. Configure o bucket 'employee-documents' no Supabase Storage. Veja instruções em scripts/README_EQUIPE_FASE2.md"
          );
        }
        throw uploadError;
      }

      // Obter URL do arquivo
      let fileUrl = "";
      try {
        const { data: urlData } = supabase.storage.from("employee-documents").getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      } catch (urlError) {
        // Se não conseguir URL pública, tentar signed URL
        try {
          const { data: signedData } = await supabase.storage
            .from("employee-documents")
            .createSignedUrl(filePath, 31536000); // 1 ano
          fileUrl = signedData?.signedUrl || filePath;
        } catch (signedError) {
          // Se tudo falhar, usar o path como fallback
          fileUrl = filePath;
        }
      }

      // Salvar registro do documento
      const { error: insertError } = await supabase.from("employee_documents").insert({
        employee_id: formData.employee_id,
        store_id: currentStoreId!,
        document_type: formData.document_type,
        document_name: formData.document_name.trim(),
        file_url: fileUrl,
        file_name: formData.file.name,
        file_size: formData.file.size,
        expiry_date: formData.expiry_date || null,
        uploaded_by: user.id,
        notes: formData.notes.trim() || null,
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({
        employee_id: "",
        document_type: "",
        document_name: "",
        expiry_date: "",
        notes: "",
        file: null,
      });
      await loadDocuments();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      setError(error.message || "Não foi possível fazer upload do documento.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, fileUrl: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      // Extrair caminho do arquivo da URL
      let filePath = "";
      if (fileUrl.includes("/storage/v1/object/public/employee-documents/")) {
        filePath = fileUrl.split("/employee-documents/")[1];
      } else if (fileUrl.includes("/employee-documents/")) {
        filePath = fileUrl.split("/employee-documents/")[1];
      } else {
        // Se for apenas o path relativo
        filePath = fileUrl;
      }

      // Deletar do storage (se existir)
      if (filePath) {
        try {
          await supabase.storage.from("employee-documents").remove([filePath]);
        } catch (storageError) {
          console.warn("Erro ao deletar do storage (continuando):", storageError);
          // Continua mesmo se falhar no storage
        }
      }

      // Deletar registro
      const { error: deleteError } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", documentId);

      if (deleteError) throw deleteError;
      await loadDocuments();
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      setError(error.message || "Não foi possível excluir o documento.");
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= now;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione uma loja para gerenciar documentos.
        </CardContent>
      </Card>
    );
  }

  const filteredDocuments = documents;

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
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
        <div className="flex items-center gap-4 flex-1">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os colaboradores</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="expiring"
              checked={expiringFilter}
              onChange={(e) => setExpiringFilter(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="expiring" className="text-sm cursor-pointer">
              Vencendo em 30 dias
            </Label>
          </div>
        </div>
        <Button
          onClick={() => {
            setFormData({
              employee_id: "",
              document_type: "",
              document_name: "",
              expiry_date: "",
              notes: "",
              file: null,
            });
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload de Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
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
                  <Label htmlFor="document_type">Tipo de Documento *</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="document_name">Nome do Documento *</Label>
                  <Input
                    id="document_name"
                    value={formData.document_name}
                    onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                    placeholder="Ex: RG, CPF, Certidão..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Data de Vencimento (opcional)</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="file">Arquivo *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setError("O arquivo deve ter no máximo 10MB.");
                          return;
                        }
                        setFormData({ ...formData, file });
                      }
                    }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações sobre o documento..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar Documento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum documento encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const expiring = isExpiringSoon(doc.expiry_date);
                const expired = isExpired(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-4 ${
                      expired
                        ? "bg-red-50 border-red-200"
                        : expiring
                        ? "bg-yellow-50 border-yellow-200"
                        : "hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <FileText className="w-5 h-5 text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{doc.document_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type})
                            </span>
                            {expired && (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                Vencido
                              </span>
                            )}
                            {expiring && !expired && (
                              <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                Vencendo em breve
                              </span>
                            )}
                            {!expired && !expiring && doc.expiry_date && (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                Válido
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              <strong>Colaborador:</strong> {doc.employee_name || "N/A"}
                            </div>
                            <div>
                              <strong>Arquivo:</strong> {doc.file_name || "N/A"} ({formatFileSize(doc.file_size)})
                            </div>
                            {doc.expiry_date && (
                              <div className={expired ? "text-red-600" : expiring ? "text-yellow-600" : ""}>
                                <strong>Vencimento:</strong>{" "}
                                {new Date(doc.expiry_date).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                            {doc.notes && (
                              <div>
                                <strong>Observações:</strong> {doc.notes}
                              </div>
                            )}
                            <div className="text-xs">
                              Enviado em: {new Date(doc.uploaded_at).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.file_url, "_blank")}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(doc.id, doc.file_url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas de Vencimento */}
      {filteredDocuments.some((d) => isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Alertas de Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {filteredDocuments
                .filter((d) => isExpired(d.expiry_date))
                .map((doc) => (
                  <div key={doc.id} className="text-red-600">
                    ⚠️ <strong>{doc.document_name}</strong> de {doc.employee_name} está vencido desde{" "}
                    {doc.expiry_date && new Date(doc.expiry_date).toLocaleDateString("pt-BR")}
                  </div>
                ))}
              {filteredDocuments
                .filter((d) => isExpiringSoon(d.expiry_date) && !isExpired(d.expiry_date))
                .map((doc) => (
                  <div key={doc.id} className="text-yellow-600">
                    ⚠️ <strong>{doc.document_name}</strong> de {doc.employee_name} vence em{" "}
                    {doc.expiry_date && new Date(doc.expiry_date).toLocaleDateString("pt-BR")}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

