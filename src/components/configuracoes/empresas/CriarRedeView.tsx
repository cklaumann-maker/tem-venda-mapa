"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowLeft, 
  ArrowRight,
  UploadCloud,
  Info,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Store,
  Save,
  Loader2,
  RotateCcw,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";

// ============================================
// TIPOS E INTERFACES
// ============================================

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

interface NetworkFormData {
  // Campos obrigatórios
  name: string;
  primary_email: string;
  primary_phone: string;
  zip_code: string;
  state: string;
  city: string;
  logo_url: string;
  street: string;
  street_number: string;
  neighborhood: string;
  
  // Campos opcionais
  trade_name?: string;
  cnpj?: string;
  company_name?: string;
  state_registration?: string;
  municipal_registration?: string;
  website?: string;
  description?: string;
  address_complement?: string;
  secondary_phone?: string;
  secondary_email?: string;
  whatsapp?: string;
  founded_at?: string;
  estimated_store_count?: number;
  monthly_revenue_target?: number;
  avg_employees_per_store?: number;
  market_segment?: 'farmacia' | 'supermercado' | 'varejo' | 'outro';
  business_model?: 'franquia' | 'propria' | 'mista';
  currency?: string;
  fiscal_month_end_day?: number;
  primary_bank_code?: string;
  erp_integration?: boolean;
  erp_type?: string;
  internal_notes?: string;
  tags?: string[];
}

interface StoreFormData {
  // Campos obrigatórios
  name: string;
  cnpj: string;
  company_name: string;
  zip_code: string;
  state: string;
  city: string;
  phone: string;
  email: string;
  
  // Campos opcionais (incluir conforme necessário)
  logo_url?: string;
  description?: string;
  internal_code?: string;
  manager_name?: string;
  state_registration?: string;
  street?: string;
  street_number?: string;
  address_complement?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  secondary_phone?: string;
  whatsapp?: string;
  secondary_email?: string;
  opened_at?: string;
  operational_status?: 'ativa' | 'em_construcao' | 'em_reforma' | 'temporariamente_fechada';
  area_sqm?: number;
  employee_count?: number;
  cash_register_count?: number;
  business_hours?: any;
  max_customer_capacity?: number;
  monthly_revenue_target?: number;
  estimated_average_ticket?: number;
  daily_customer_target?: number;
  pos_code?: string;
  payment_settings?: any;
  tags?: string[];
  internal_notes?: string;
  photos?: string[];
}

interface DraftData {
  networkData: Partial<NetworkFormData>;
  storeData: Partial<StoreFormData>;
  current_step: number;
  lastSaved: string;
}

// ============================================
// UTILIDADES DE MÁSCARA E FORMATAÇÃO
// ============================================

function maskCNPJ(value: string): string {
  const clean = value.replace(/[^\d]/g, '');
  if (clean.length <= 14) {
    return clean
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return value.substring(0, 18);
}

function maskCEP(value: string): string {
  const clean = value.replace(/[^\d]/g, '');
  if (clean.length <= 8) {
    return clean.replace(/^(\d{5})(\d)/, '$1-$2');
  }
  return value.substring(0, 9);
}

function maskPhone(value: string): string {
  const clean = value.replace(/[^\d]/g, '');
  if (clean.length <= 11) {
    if (clean.length <= 10) {
      return clean.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
    }
    return clean.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
  }
  return value.substring(0, 15);
}

// Interface para resposta da API ViaCEP
interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// Função para buscar endereço por CEP usando ViaCEP
async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    if (!response.ok) return null;
    
    const data: ViaCEPResponse = await response.json();
    
    // ViaCEP retorna { erro: true } quando o CEP não é encontrado
    if (data.erro) return null;
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const TOTAL_STEPS = 6;

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export function CriarRedeView() {
  const { refresh } = useStore();
  const supabase = useMemo(() => supabaseClient(), []);
  const router = useRouter();

  // Estado do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const [networkData, setNetworkData] = useState<Partial<NetworkFormData>>({});
  const [storeData, setStoreData] = useState<Partial<StoreFormData>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loadingCEP, setLoadingCEP] = useState(false);

  // ============================================
  // PERSISTÊNCIA DE RASCUNHOS
  // ============================================

  const STORAGE_KEY = 'network_creation_draft';

  // Refs para manter referências estáveis dos dados (evita re-renders desnecessários)
  const networkDataRef = useRef(networkData);
  const storeDataRef = useRef(storeData);
  const currentStepRef = useRef(currentStep);
  const logoFileRef = useRef<File | null>(null);

  // Carregar do localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const draft: DraftData = JSON.parse(stored);
        setNetworkData(draft.networkData || {});
        setStoreData(draft.storeData || {});
        // Não restaurar o passo automaticamente - sempre começar do passo 1
        // setCurrentStep(draft.current_step || 1);
        setLastSaved(draft.lastSaved || null);
        return true;
      }
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
    }
    return false;
  }, []);


  // Carregar do backend
  const loadDraftFromBackend = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return false;

      const response = await fetch('/api/networks/draft', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setNetworkData(result.data.network_data || {});
          setStoreData(result.data.store_data || {});
          // Não restaurar o passo automaticamente - sempre começar do passo 1
          // setCurrentStep(result.data.current_step || 1);
          return true;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho do backend:', error);
    }
    return false;
  }, [supabase]);

  // Refs para timeouts de debounce
  const localStorageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Atualizar refs sempre que os dados mudarem - usar useEffect para evitar re-renders desnecessários
  useEffect(() => {
    networkDataRef.current = networkData;
    storeDataRef.current = storeData;
    currentStepRef.current = currentStep;
    // Manter logoFile no ref quando mudar (para persistir entre mudanças de passo)
    if (logoFile) {
      logoFileRef.current = logoFile;
    }
  });

  // Restaurar logoFile do ref quando voltar ao step 1 (para manter o arquivo visível)
  useEffect(() => {
    if (currentStep === 1 && !logoFile && logoFileRef.current) {
      setLogoFile(logoFileRef.current);
    }
  }, [currentStep, logoFile]);

  // Função de debounce para localStorage (chamada dentro do handler)
  const debouncedSaveToLocalStorage = useCallback(() => {
    if (localStorageTimeoutRef.current) {
      clearTimeout(localStorageTimeoutRef.current);
    }
    localStorageTimeoutRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          networkData: networkDataRef.current,
          storeData: storeDataRef.current,
          current_step: currentStepRef.current,
          lastSaved: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
      }
    }, 2000);
  }, []);

  // Função de debounce para backend (chamada dentro do handler)
  const debouncedSaveToBackend = useCallback(() => {
    if (backendTimeoutRef.current) {
      clearTimeout(backendTimeoutRef.current);
    }
    backendTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Usar setSaving de forma que não cause re-render no componente principal
        // apenas atualizar o estado de forma assíncrona
        const response = await fetch('/api/networks/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            network_data: networkDataRef.current,
            store_data: storeDataRef.current,
            current_step: currentStepRef.current,
          }),
        });

        if (response.ok) {
          // Usar requestAnimationFrame para evitar interrupção do input
          requestAnimationFrame(() => {
            setLastSaved(new Date().toLocaleTimeString('pt-BR'));
          });
        }
      } catch (error) {
        console.error('Erro ao salvar rascunho no backend:', error);
      }
    }, 12000);
  }, [supabase]);

  // Carregar rascunho ao montar componente (apenas uma vez)
  useEffect(() => {
    const loadDraft = async () => {
      // Tentar backend primeiro (mais confiável)
      const backendLoaded = await loadDraftFromBackend();
      if (!backendLoaded) {
        // Fallback para localStorage
        loadFromLocalStorage();
      }
    };
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  // Detectar tentativa de saída com dados não salvos (usando refs para evitar re-renders)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (networkDataRef.current.name || storeDataRef.current.name) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Sem dependências - usa refs

  // ============================================
  // HANDLERS DE FORMULÁRIO
  // ============================================

  // Handler genérico memoizado (para campos que ainda não têm handler específico)
  const updateNetworkData = useCallback((field: keyof NetworkFormData, value: any) => {
    setNetworkData(prev => ({ ...prev, [field]: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  // Handlers memoizados com useCallback para evitar recriação a cada render
  const handleNetworkName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, name: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleNetworkPrimaryEmail = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, primary_email: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleNetworkPrimaryPhone = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskPhone(e.target.value);
    setNetworkData(prev => ({ ...prev, primary_phone: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  // Handlers específicos para Step2 (memoizados para evitar re-renders)
  const handleZipCode = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCEP(e.target.value);
    const cleanCEP = value.replace(/\D/g, '');
    
    setNetworkData(prev => ({ ...prev, zip_code: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();

    // Se o CEP tiver 8 dígitos, buscar automaticamente o endereço
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const addressData = await fetchAddressByCEP(value);
        
        if (addressData) {
          // Preencher campos automaticamente
          setNetworkData(prev => ({
            ...prev,
            zip_code: value,
            street: addressData.logradouro || prev.street || '',
            neighborhood: addressData.bairro || prev.neighborhood || '',
            city: addressData.localidade || prev.city || '',
            state: addressData.uf || prev.state || '',
            address_complement: addressData.complemento || prev.address_complement || '',
          }));
          
          // Salvar após preencher
          debouncedSaveToLocalStorage();
          debouncedSaveToBackend();
          
          setFeedback({
            type: "success",
            message: "Endereço encontrado e preenchido automaticamente!"
          });
          
          // Limpar feedback após 3 segundos
          setTimeout(() => setFeedback(null), 3000);
        } else {
          // CEP não encontrado - mostrar feedback visual
          setFeedback({
            type: "error",
            message: "CEP não encontrado. Por favor, preencha o endereço manualmente."
          });
          
          // Limpar feedback após 5 segundos
          setTimeout(() => setFeedback(null), 5000);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setFeedback({
          type: "error",
          message: "Erro ao buscar CEP. Tente novamente ou preencha manualmente."
        });
        
        // Limpar feedback após 5 segundos
        setTimeout(() => setFeedback(null), 5000);
        // Não mostrar erro ao usuário, permitir preenchimento manual
      } finally {
        setLoadingCEP(false);
      }
    }
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleState = useCallback((value: string) => {
    setNetworkData(prev => ({ ...prev, state: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleCity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, city: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStreet = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, street: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStreetNumber = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, street_number: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleNeighborhood = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, neighborhood: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleAddressComplement = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, address_complement: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Limpar todos os dados e voltar ao passo 1
  const handleClearAll = useCallback(async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      // Limpar estado
      setNetworkData({});
      setStoreData({});
      setLogoFile(null);
      logoFileRef.current = null;
      setCurrentStep(1);
      setFeedback(null);
      setLoadingCEP(false);

      // Limpar localStorage
      localStorage.removeItem(STORAGE_KEY);

      // Limpar backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/networks/draft', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
        }
      } catch (error) {
        console.error('Erro ao limpar rascunho do backend:', error);
      }

      // Feedback visual
      setFeedback({
        type: "success",
        message: "Todos os dados foram limpos. Formulário reiniciado."
      });

      // Limpar feedback após 3 segundos
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      setFeedback({
        type: "error",
        message: "Erro ao limpar dados. Tente novamente."
      });
    }
  }, [supabase]);

  // Limpar dados do passo atual
  const handleClearCurrentStep = useCallback(() => {
    if (!confirm('Tem certeza que deseja limpar os dados do passo atual?')) {
      return;
    }

    try {
      if (currentStep === 1) {
        // Limpar dados básicos
        setNetworkData(prev => ({
          ...prev,
          name: '',
          primary_email: '',
          primary_phone: '',
        }));
        setLogoFile(null);
        logoFileRef.current = null;
      } else if (currentStep === 2) {
        // Limpar dados de endereço
        setNetworkData(prev => ({
          ...prev,
          zip_code: '',
          state: '',
          city: '',
          street: '',
          street_number: '',
          neighborhood: '',
          address_complement: '',
        }));
        setLoadingCEP(false);
      } else if (currentStep === 3) {
        // Passo 3 - quando implementado
        setNetworkData(prev => ({
          ...prev,
          // Campos do passo 3 quando implementado
        }));
      } else if (currentStep === 4) {
        // Passo 4 - quando implementado
        setNetworkData(prev => ({
          ...prev,
          // Campos do passo 4 quando implementado
        }));
      } else if (currentStep === 5) {
        // Limpar dados da loja
        setStoreData({});
      } else if (currentStep === 6) {
        // Passo 6 (revisão) - não há dados para limpar aqui
      }

      // Salvar após limpar
      debouncedSaveToLocalStorage();
      debouncedSaveToBackend();

      // Feedback visual
      setFeedback({
        type: "success",
        message: `Dados do passo ${currentStep} foram limpos.`
      });

      // Limpar feedback após 3 segundos
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error('Erro ao limpar dados do passo atual:', error);
      setFeedback({
        type: "error",
        message: "Erro ao limpar dados. Tente novamente."
      });
    }
  }, [currentStep, debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  // Handler para clicar em um step
  const handleStepClick = useCallback((stepId: number) => {
    // Permitir navegação livre entre os steps
    setCurrentStep(stepId);
    setFeedback(null); // Limpar feedback ao mudar de step
  }, []);

  const validateCurrentStep = (): boolean => {
    // Validação básica por etapa (pode ser expandida)
    if (currentStep === 1) {
      if (!networkData.name || networkData.name.trim().length < 2) {
        setFeedback({ type: "error", message: "O nome da rede é obrigatório (mínimo 2 caracteres)" });
        return false;
      }
      if (!networkData.primary_email || !networkData.primary_email.includes('@')) {
        setFeedback({ type: "error", message: "E-mail principal é obrigatório e deve ser válido" });
        return false;
      }
      if (!networkData.primary_phone || networkData.primary_phone.replace(/\D/g, '').length < 10) {
        setFeedback({ type: "error", message: "Telefone principal é obrigatório" });
        return false;
      }
      // Verificar logoFile no estado ou no ref (para quando mudou de passo)
      const currentLogoFile = logoFile || logoFileRef.current;
      if (!currentLogoFile) {
        setFeedback({ type: "error", message: "Logo da rede é obrigatório" });
        return false;
      }
    }
    if (currentStep === 2) {
      if (!networkData.zip_code || networkData.zip_code.replace(/\D/g, '').length !== 8) {
        setFeedback({ type: "error", message: "CEP é obrigatório (8 dígitos)" });
        return false;
      }
      if (!networkData.state || networkData.state.length !== 2) {
        setFeedback({ type: "error", message: "Estado (UF) é obrigatório" });
        return false;
      }
      if (!networkData.city || networkData.city.trim().length < 2) {
        setFeedback({ type: "error", message: "Cidade é obrigatória (mínimo 2 caracteres)" });
        return false;
      }
      if (!networkData.street || networkData.street.trim().length < 1) {
        setFeedback({ type: "error", message: "Logradouro é obrigatório" });
        return false;
      }
      if (!networkData.street_number || networkData.street_number.trim().length < 1) {
        setFeedback({ type: "error", message: "Número é obrigatório" });
        return false;
      }
      if (!networkData.neighborhood || networkData.neighborhood.trim().length < 1) {
        setFeedback({ type: "error", message: "Bairro é obrigatório" });
        return false;
      }
    }
    // Validações para etapas 5 e 6 (dados da loja)
    if (currentStep === 5) {
      if (!storeData.name || storeData.name.trim().length < 2) {
        setFeedback({ type: "error", message: "Nome da loja é obrigatório" });
        return false;
      }
      if (!storeData.cnpj || storeData.cnpj.replace(/\D/g, '').length !== 14) {
        setFeedback({ type: "error", message: "CNPJ da loja é obrigatório (14 dígitos)" });
        return false;
      }
      if (!storeData.company_name || storeData.company_name.trim().length < 2) {
        setFeedback({ type: "error", message: "Razão social da loja é obrigatória" });
        return false;
      }
      if (!storeData.zip_code || storeData.zip_code.replace(/\D/g, '').length !== 8) {
        setFeedback({ type: "error", message: "CEP da loja é obrigatório" });
        return false;
      }
      if (!storeData.state || storeData.state.length !== 2) {
        setFeedback({ type: "error", message: "Estado (UF) da loja é obrigatório" });
        return false;
      }
      if (!storeData.city || storeData.city.trim().length < 2) {
        setFeedback({ type: "error", message: "Cidade da loja é obrigatória" });
        return false;
      }
      if (!storeData.phone || storeData.phone.replace(/\D/g, '').length < 10) {
        setFeedback({ type: "error", message: "Telefone da loja é obrigatório" });
        return false;
      }
      if (!storeData.email || !storeData.email.includes('@')) {
        setFeedback({ type: "error", message: "E-mail da loja é obrigatório e deve ser válido" });
        return false;
      }
    }
    return true;
  };

  const handleCreateNetwork = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      setCreating(true);
      setFeedback(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      // Upload do logo (obrigatório) - usar ref se logoFile estiver null
      const currentLogoFile = logoFile || logoFileRef.current;
      if (!currentLogoFile) {
        throw new Error('Logo da rede é obrigatório');
      }

      let logoUrl: string;
      try {
        // Usar timestamp + random para caminho temporário (será atualizado após criar a rede se necessário)
        const extension = currentLogoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const filePath = `${tempId}/${Date.now()}.${extension}`;
        
        const { error: uploadError } = await supabase.storage.from('company-logos').upload(filePath, currentLogoFile, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(filePath);
        if (!urlData?.publicUrl) throw new Error('Não foi possível obter URL pública do logo');
        logoUrl = urlData.publicUrl;
      } catch (logoError: any) {
        throw new Error(`Erro ao fazer upload do logo: ${logoError.message || 'Erro desconhecido'}`);
      }

      // Preparar dados da rede
      const networkPayload: any = {
        name: networkData.name!,
        primary_email: networkData.primary_email!,
        primary_phone: networkData.primary_phone!.replace(/\D/g, ''),
        zip_code: networkData.zip_code!.replace(/\D/g, ''),
        state: networkData.state!,
        city: networkData.city!,
        logo_url: logoUrl,
        street: networkData.street!,
        street_number: networkData.street_number!,
        neighborhood: networkData.neighborhood!,
      };

      // Adicionar campos opcionais se preenchidos
      Object.entries(networkData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && 
            !['name', 'primary_email', 'primary_phone', 'zip_code', 'state', 'city', 'logo_url', 'street', 'street_number', 'neighborhood'].includes(key)) {
          if (key === 'primary_phone' || key === 'secondary_phone' || key === 'whatsapp') {
            networkPayload[key] = String(value).replace(/\D/g, '');
          } else if (key === 'zip_code') {
            networkPayload[key] = String(value).replace(/\D/g, '');
          } else if (key === 'cnpj') {
            networkPayload[key] = String(value).replace(/\D/g, '');
          } else {
            networkPayload[key] = value;
          }
        }
      });

      // Criar rede
      const networkResponse = await fetch('/api/networks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(networkPayload),
      });

      const networkResult = await networkResponse.json();
      if (!networkResponse.ok) {
        throw new Error(networkResult.error || "Erro ao criar rede");
      }

      const networkId = networkResult.data?.id;
      if (!networkId) {
        throw new Error("Rede criada mas ID não retornado");
      }

      // TODO: Criar primeira loja também
      // Por enquanto, apenas criar a rede

      // Limpar rascunhos
      localStorage.removeItem(STORAGE_KEY);
      try {
        await fetch('/api/networks/draft', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      } catch (e) {
        // Ignorar erro ao limpar rascunho
      }

      await refresh();
      setFeedback({ 
        type: "success", 
        message: `Rede "${networkData.name}" criada com sucesso! Você pode criar a primeira loja agora.` 
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/configuracoes/empresas");
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setFeedback({ 
        type: "error", 
        message: error.message || "Erro ao criar rede. Tente novamente." 
      });
    } finally {
      setCreating(false);
    }
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const steps = [
    { id: 1, title: "Dados Básicos", icon: <Building2 className="w-5 h-5" /> },
    { id: 2, title: "Endereço", icon: <MapPin className="w-5 h-5" /> },
    { id: 3, title: "Contatos", icon: <Phone className="w-5 h-5" /> },
    { id: 4, title: "Informações Adicionais", icon: <FileText className="w-5 h-5" /> },
    { id: 5, title: "Primeira Loja", icon: <Store className="w-5 h-5" /> },
    { id: 6, title: "Revisão", icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/configuracoes/empresas")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-emerald-600" />
                Criar Nova Rede
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha os dados da rede e da primeira loja
              </p>
            </div>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="w-4 h-4" />
              <span>Salvo às {lastSaved}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Criação de Rede</h2>
                <p className="text-sm text-gray-600">Passo {currentStep} de {TOTAL_STEPS}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">
                  {Math.round(progress)}%
                </div>
                <div className="text-xs text-gray-500">Concluído</div>
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {steps.map((step) => {
                const status = currentStep === step.id ? 'current' : currentStep > step.id ? 'completed' : 'pending';
                return (
                  <div
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all cursor-pointer hover:scale-105 ${
                      status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                        : status === 'current'
                        ? 'bg-blue-100 text-blue-700 shadow-lg hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-full mb-2 ${
                      status === 'completed' 
                        ? 'bg-emerald-200' 
                        : status === 'current'
                        ? 'bg-blue-200'
                        : 'bg-gray-200'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="text-xs font-medium text-center">{step.title}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
              feedback.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Dados Básicos da Rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="network-name">Nome da Rede <span className="text-red-500">*</span></Label>
                  <Input
                    key="network-name-input"
                    id="network-name"
                    value={networkData.name || ''}
                    onChange={handleNetworkName}
                    placeholder="Ex: Farmácia Central"
                    disabled={creating}
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-email">E-mail Principal <span className="text-red-500">*</span></Label>
                  <Input
                    key="primary-email-input"
                    id="primary-email"
                    type="email"
                    value={networkData.primary_email || ''}
                    onChange={handleNetworkPrimaryEmail}
                    placeholder="contato@rede.com.br"
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-phone">Telefone Principal <span className="text-red-500">*</span></Label>
                  <Input
                    key="primary-phone-input"
                    id="primary-phone"
                    value={networkData.primary_phone || ''}
                    onChange={handleNetworkPrimaryPhone}
                    placeholder="(11) 99999-9999"
                    disabled={creating}
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo da Rede <span className="text-red-500">*</span></Label>
                  <Label
                    htmlFor="network-logo"
                    className="flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Escolher arquivo
                  </Label>
                  <Input
                    id="network-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/heic"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        // Validar tamanho máximo (20MB)
                        const MAX_SIZE = 20 * 1024 * 1024; // 20MB em bytes
                        if (file.size > MAX_SIZE) {
                          setFeedback({
                            type: "error",
                            message: `O arquivo é muito grande. Tamanho máximo permitido: 20MB. Tamanho do arquivo: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
                          });
                          e.target.value = ''; // Limpar o input
                          return;
                        }
                        setLogoFile(file);
                        logoFileRef.current = file; // Manter no ref também
                        setFeedback(null);
                      } else {
                        setLogoFile(null);
                        logoFileRef.current = null;
                      }
                    }}
                    disabled={creating}
                    className="hidden"
                  />
                  {(logoFile || logoFileRef.current) && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{(logoFile || logoFileRef.current)?.name}</span>
                      {(logoFile || logoFileRef.current)?.size && (logoFile || logoFileRef.current)!.size > 0 && (
                        <span className="text-xs text-gray-500">
                          ({((logoFile || logoFileRef.current)!.size >= 1024 * 1024 
                            ? `${((logoFile || logoFileRef.current)!.size / (1024 * 1024)).toFixed(2)}MB`
                            : `${((logoFile || logoFileRef.current)!.size / 1024).toFixed(2)}KB`)})
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PNG, JPEG, JPG, HEIC. Tamanho máximo: 20MB. Tamanho recomendado: 512x512px.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Endereço da Rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip-code">CEP <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        key="zip-code-input"
                        id="zip-code"
                        value={networkData.zip_code || ''}
                        onChange={handleZipCode}
                        placeholder="00000-000"
                        disabled={creating || loadingCEP}
                        maxLength={9}
                      />
                      {loadingCEP && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        </div>
                      )}
                    </div>
                    {loadingCEP && (
                      <p className="text-xs text-muted-foreground">
                        Buscando endereço...
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF) <span className="text-red-500">*</span></Label>
                    <Select
                      key="state-select"
                      value={networkData.state || ''}
                      onValueChange={handleState}
                      disabled={creating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade <span className="text-red-500">*</span></Label>
                  <Input
                    key="city-input"
                    id="city"
                    value={networkData.city || ''}
                    onChange={handleCity}
                    placeholder="Ex: São Paulo"
                    disabled={creating}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Logradouro <span className="text-red-500">*</span></Label>
                  <Input
                    key="street-input"
                    id="street"
                    value={networkData.street || ''}
                    onChange={handleStreet}
                    placeholder="Rua, Avenida, etc."
                    disabled={creating}
                    maxLength={255}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street-number">Número <span className="text-red-500">*</span></Label>
                    <Input
                      key="street-number-input"
                      id="street-number"
                      value={networkData.street_number || ''}
                      onChange={handleStreetNumber}
                      placeholder="123"
                      disabled={creating}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro <span className="text-red-500">*</span></Label>
                    <Input
                      key="neighborhood-input"
                      id="neighborhood"
                      value={networkData.neighborhood || ''}
                      onChange={handleNeighborhood}
                      placeholder="Centro"
                      disabled={creating}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-complement">Complemento</Label>
                  <Input
                    key="address-complement-input"
                    id="address-complement"
                    value={networkData.address_complement || ''}
                    onChange={handleAddressComplement}
                    placeholder="Sala, Andar, etc."
                    disabled={creating}
                    maxLength={100}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          {currentStep === 3 && <div className="text-center py-12 text-gray-500">Etapa 3 - Em desenvolvimento</div>}
          {currentStep === 4 && <div className="text-center py-12 text-gray-500">Etapa 4 - Em desenvolvimento</div>}
          {currentStep === 5 && <div className="text-center py-12 text-gray-500">Etapa 5 - Em desenvolvimento</div>}
          {currentStep === 6 && <div className="text-center py-12 text-gray-500">Etapa 6 - Em desenvolvimento</div>}
        </div>

        {/* Navigation */}
        <div className="space-y-4 pt-4 border-t">
          {/* Botões de limpar dados */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCurrentStep}
              disabled={creating}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar Passo Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={creating}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Tudo
            </Button>
          </div>

          {/* Navegação principal */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || creating}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Passo {currentStep} de {TOTAL_STEPS}
              </span>
            </div>
            
            {currentStep < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={creating}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateNetwork}
                disabled={creating}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {creating ? "Criando..." : "Criar Rede"}
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
