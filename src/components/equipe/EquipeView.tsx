"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Users, 
  FileText, 
  BarChart3,
  MessageSquare,
  Settings,
  Upload,
  Image as ImageIcon,
  CheckSquare,
  Radio,
  Type,
  Calendar,
  Send,
  Download
} from "lucide-react";
import { useZApi } from "@/lib/zapi";

// ==================== Types ====================
interface Question {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'image' | 'date' | 'number';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  imageUrl?: string;
  placeholder?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface FormResponse {
  id: string;
  formId: string;
  employeeId: string;
  employeeName: string;
  responses: Record<string, any>;
  submittedAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'employee';
  phone?: string;
}

// ==================== Component ====================
export default function EquipeView() {
  const [activeTab, setActiveTab] = useState<'forms' | 'responses' | 'employees' | 'settings'>('forms');
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [isViewingForm, setIsViewingForm] = useState(false);
  const [isRespondingForm, setIsRespondingForm] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [managerPhone, setManagerPhone] = useState('5551982813505'); // Estado para o número do gerente
  const { sendFormNotification, testConnection, isLoading: zapiLoading } = useZApi();

  // ==================== Manager Phone Management ====================
  React.useEffect(() => {
    // Carrega o número do gerente salvo no localStorage
    const savedPhone = localStorage.getItem('managerPhone');
    if (savedPhone) {
      setManagerPhone(savedPhone);
    }
  }, []);

  const handleManagerPhoneChange = (phone: string) => {
    setManagerPhone(phone);
    localStorage.setItem('managerPhone', phone);
  };

  // ==================== Form Management ====================
  const createNewForm = () => {
    const newForm: Form = {
      id: Date.now().toString(),
      title: '',
      description: '',
      questions: [],
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      isActive: true
    };
    setCurrentForm(newForm);
    setIsCreatingForm(true);
  };

  const addQuestion = (type: Question['type']) => {
    if (!currentForm) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      title: '',
      description: '',
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Opção 1', 'Opção 2'] : undefined
    };

    setCurrentForm({
      ...currentForm,
      questions: [...currentForm.questions, newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    if (!currentForm) return;
    
    setCurrentForm({
      ...currentForm,
      questions: currentForm.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const removeQuestion = (questionId: string) => {
    if (!currentForm) return;
    
    setCurrentForm({
      ...currentForm,
      questions: currentForm.questions.filter(q => q.id !== questionId)
    });
  };

  const saveForm = async () => {
    if (!currentForm) return;
    
    setLoading(true);
    try {
      // Simular salvamento no Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setForms(prev => [...prev.filter(f => f.id !== currentForm.id), currentForm]);
      setIsCreatingForm(false);
      setCurrentForm(null);
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Form Response ====================
  const startFormResponse = (formId: string) => {
    setSelectedFormId(formId);
    setIsRespondingForm(true);
    setFormResponses({});
  };

  const submitFormResponse = async () => {
    if (!selectedFormId) return;
    
    setLoading(true);
    try {
      const newResponse: FormResponse = {
        id: Date.now().toString(),
        formId: selectedFormId,
        employeeId: 'current-employee',
        employeeName: 'Funcionário Atual',
        responses: formResponses,
        submittedAt: new Date().toISOString()
      };

      setResponses(prev => [...prev, newResponse]);
      
      // Enviar via Z-API
      await sendWhatsAppNotification(newResponse);
      
      setIsRespondingForm(false);
      setSelectedFormId(null);
      setFormResponses({});
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Z-API Integration ====================
  const sendWhatsAppNotification = async (response: FormResponse) => {
    try {
      const form = forms.find(f => f.id === response.formId);
      if (!form) return;

      console.log('📱 Enviando notificação WhatsApp...');
      
      const success = await sendFormNotification({
        formTitle: form.title,
        employeeName: response.employeeName,
        responses: response.responses,
        questions: form.questions.map(q => ({ id: q.id, title: q.title, type: q.type }))
      }, managerPhone); // Usa o número editável do gerente

      if (success) {
        console.log('✅ Notificação enviada com sucesso via Z-API');
      } else {
        console.log('❌ Erro ao enviar notificação via Z-API');
      }
      
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    }
  };

  // ==================== Mock Data ====================
  React.useEffect(() => {
    // Mock data para demonstração
    setForms([
      {
        id: '1',
        title: 'Avaliação de Desempenho',
        description: 'Formulário para avaliação trimestral dos funcionários',
        questions: [
          {
            id: 'q1',
            type: 'text',
            title: 'Nome do funcionário',
            required: true,
            placeholder: 'Digite seu nome completo'
          },
          {
            id: 'q2',
            type: 'select',
            title: 'Como você avalia seu desempenho?',
            required: true,
            options: ['Excelente', 'Bom', 'Regular', 'Ruim']
          },
          {
            id: 'q3',
            type: 'textarea',
            title: 'Comentários adicionais',
            required: false,
            placeholder: 'Deixe seus comentários aqui...'
          }
        ],
        createdBy: 'manager-1',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ]);

    setEmployees([
      { id: '1', name: 'João Silva', email: 'joao@empresa.com', role: 'manager' },
      { id: '2', name: 'Maria Santos', email: 'maria@empresa.com', role: 'employee' },
      { id: '3', name: 'Pedro Costa', email: 'pedro@empresa.com', role: 'employee' }
    ]);
  }, []);

  // ==================== Render Question Editor ====================
  const renderQuestionEditor = (question: Question) => (
    <Card key={question.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {question.type === 'text' && <Type className="w-5 h-5" />}
            {question.type === 'textarea' && <FileText className="w-5 h-5" />}
            {question.type === 'select' && <CheckSquare className="w-5 h-5" />}
            {question.type === 'radio' && <Radio className="w-5 h-5" />}
            {question.type === 'checkbox' && <CheckSquare className="w-5 h-5" />}
            {question.type === 'image' && <ImageIcon className="w-5 h-5" />}
            {question.type === 'date' && <Calendar className="w-5 h-5" />}
            <span className="font-medium capitalize">{question.type}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeQuestion(question.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Título da pergunta</Label>
            <Input
              value={question.title}
              onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
              placeholder="Digite o título da pergunta"
            />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={question.description || ''}
              onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
              placeholder="Descrição adicional da pergunta"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={(checked) => updateQuestion(question.id, { required: !!checked })}
            />
            <Label htmlFor={`required-${question.id}`}>Pergunta obrigatória</Label>
          </div>

          {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
            <div>
              <Label>Opções</Label>
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])];
                      newOptions[index] = e.target.value;
                      updateQuestion(question.id, { options: newOptions });
                    }}
                    placeholder={`Opção ${index + 1}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = question.options?.filter((_, i) => i !== index) || [];
                      updateQuestion(question.id, { options: newOptions });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(question.options || []), `Opção ${(question.options?.length || 0) + 1}`];
                  updateQuestion(question.id, { options: newOptions });
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar opção
              </Button>
            </div>
          )}

          {question.type === 'text' && (
            <div>
              <Label>Placeholder</Label>
              <Input
                value={question.placeholder || ''}
                onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                placeholder="Texto de exemplo"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ==================== Render Question Types ====================
  const questionTypes = [
    { type: 'text', label: 'Texto', icon: Type },
    { type: 'textarea', label: 'Texto Longo', icon: FileText },
    { type: 'select', label: 'Seleção', icon: CheckSquare },
    { type: 'radio', label: 'Múltipla Escolha', icon: Radio },
    { type: 'checkbox', label: 'Caixas de Seleção', icon: CheckSquare },
    { type: 'image', label: 'Imagem', icon: ImageIcon },
    { type: 'date', label: 'Data', icon: Calendar },
    { type: 'number', label: 'Número', icon: Type }
  ];

  // ==================== JSX ====================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Formulários</h1>
          <p className="text-gray-600 mt-2">Gerencie formulários e respostas da equipe</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={createNewForm}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'forms', label: 'Formulários', icon: FileText },
          { id: 'responses', label: 'Respostas', icon: BarChart3 },
          { id: 'employees', label: 'Funcionários', icon: Users },
          { id: 'settings', label: 'Configurações', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          {isCreatingForm && currentForm ? (
            <div className="space-y-6">
              {/* FORM HEADER */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Título do formulário</Label>
                      <Input
                        value={currentForm.title}
                        onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                        placeholder="Digite o título do formulário"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={currentForm.description}
                        onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                        placeholder="Descreva o propósito do formulário"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QUESTION TYPES */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipos de Perguntas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {questionTypes.map((type) => (
                      <Button
                        key={type.type}
                        variant="outline"
                        onClick={() => addQuestion(type.type as Question['type'])}
                        className="h-auto p-4 flex flex-col items-center gap-2"
                      >
                        <type.icon className="w-6 h-6" />
                        <span className="text-sm">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* QUESTIONS */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Perguntas ({currentForm.questions.length})</h3>
                {currentForm.questions.map(renderQuestionEditor)}
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingForm(false);
                    setCurrentForm(null);
                  }}
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewingForm(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    onClick={saveForm}
                    disabled={loading || !currentForm.title || currentForm.questions.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Formulário'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                    <p className="text-sm text-gray-600">{form.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-500">
                      {form.questions.length} perguntas
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startFormResponse(form.id)}
                      >
                        Responder
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentForm(form);
                          setIsViewingForm(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESPONSES TAB */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.map((response) => {
                  const form = forms.find(f => f.id === response.formId);
                  return (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{form?.title}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(response.submittedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Respondido por: {response.employeeName}
                      </p>
                      <div className="text-sm">
                        {Object.entries(response.responses).map(([key, value]) => {
                          const question = form?.questions.find(q => q.id === key);
                          return (
                            <div key={key} className="mb-1">
                              <strong>{question?.title || key}:</strong> {String(value)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{employee.name}</h4>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        employee.role === 'manager' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {employee.role === 'manager' ? 'Gerente' : 'Funcionário'}
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Z-API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Instância Z-API</Label>
                  <Input placeholder="3E5617B992C1A1A44BE92AC1CE4E084C" disabled />
                </div>
                <div>
                  <Label>Token Z-API</Label>
                  <Input placeholder="965006A3DBD3AE6A5ACF05EF" disabled />
                </div>
                <div>
                  <Label>Client-Token Z-API (Sensível)</Label>
                  <Input placeholder="[PROTEGIDO EM VARIÁVEIS DE AMBIENTE]" disabled />
                </div>
                <div>
                  <Label>Número WhatsApp (Gerentes)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={managerPhone}
                      onChange={(e) => handleManagerPhoneChange(e.target.value)}
                      placeholder="5551982813505"
                      className="bg-white flex-1"
                    />
                    <Button
                      onClick={() => handleManagerPhoneChange('5551982813505')}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      Resetar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Número padrão: 5551982813505. Altere conforme necessário.
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✅ Z-API configurado automaticamente! Use a página de teste para verificar.
                  </p>
                </div>
                <Button 
                  onClick={async () => {
                    const success = await testConnection(managerPhone);
                    if (success) {
                      alert(`✅ Teste Z-API bem-sucedido! Mensagem enviada para ${managerPhone}. Verifique seu WhatsApp!`);
                    } else {
                      alert(`❌ Erro no teste Z-API para ${managerPhone}. Verifique o console para detalhes.\n\nMas se você recebeu a mensagem no WhatsApp, a Z-API está funcionando!`);
                    }
                  }}
                  disabled={zapiLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {zapiLoading ? 'Testando...' : `Testar Z-API (${managerPhone})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FORM RESPONSE MODAL */}
      {isRespondingForm && selectedFormId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {forms.find(f => f.id === selectedFormId)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {forms.find(f => f.id === selectedFormId)?.questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label className="text-base font-medium">
                    {question.title}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {question.description && (
                    <p className="text-sm text-gray-600">{question.description}</p>
                  )}
                  
                  {question.type === 'text' && (
                    <Input
                      placeholder={question.placeholder}
                      onChange={(e) => setFormResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                  )}
                  
                  {question.type === 'textarea' && (
                    <Textarea
                      placeholder={question.placeholder}
                      rows={4}
                      onChange={(e) => setFormResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                  )}
                  
                  {question.type === 'select' && (
                    <Select onValueChange={(value) => setFormResponses(prev => ({ ...prev, [question.id]: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options?.map((option, index) => (
                          <SelectItem key={index} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {question.type === 'radio' && (
                    <div className="space-y-2">
                      {question.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`${question.id}-${index}`}
                            name={question.id}
                            value={option}
                            onChange={(e) => setFormResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                          />
                          <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'checkbox' && (
                    <div className="space-y-2">
                      {question.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${question.id}-${index}`}
                            onCheckedChange={(checked) => {
                              const currentValues = formResponses[question.id] || [];
                              const newValues = checked
                                ? [...currentValues, option]
                                : currentValues.filter((v: string) => v !== option);
                              setFormResponses(prev => ({ ...prev, [question.id]: newValues }));
                            }}
                          />
                          <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'date' && (
                    <Input
                      type="date"
                      onChange={(e) => setFormResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                  )}
                  
                  {question.type === 'number' && (
                    <Input
                      type="number"
                      placeholder={question.placeholder}
                      onChange={(e) => setFormResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRespondingForm(false);
                    setSelectedFormId(null);
                    setFormResponses({});
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={submitFormResponse}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar Resposta'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}