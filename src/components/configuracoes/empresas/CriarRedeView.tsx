"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  User,
  Eye,
  EyeOff,
  Lock
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
  address_complement?: string;
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

interface OwnerFormData {
  // Campos obrigatórios
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
  password_confirm: string;
  
  // Campos opcionais
  birth_date?: string;
  photo_url?: string;
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
  internal_code?: string;
  manager_name?: string;
  trade_name?: string;
  state_registration?: string;
  municipal_registration?: string;
  street?: string;
  street_number?: string;
  address_complement?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
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
  ownerData?: Partial<OwnerFormData>;
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

function maskCPF(value: string): string {
  const clean = value.replace(/[^\d]/g, '');
  if (clean.length <= 11) {
    return clean
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return value.substring(0, 14);
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
  const [currentStep, setCurrentStep] = useState(0);
  const [ownerData, setOwnerData] = useState<Partial<OwnerFormData>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [networkData, setNetworkData] = useState<Partial<NetworkFormData>>({});
  const [storeData, setStoreData] = useState<Partial<StoreFormData>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false); // Estado para upload do logo
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  // Estados para destacar campos obrigatórios em vermelho (Passo 3)
  const [cnpjError, setCnpjError] = useState(false);
  const [companyNameError, setCompanyNameError] = useState(false);
  const [tradeNameError, setTradeNameError] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // ============================================
  // PERSISTÊNCIA DE RASCUNHOS
  // ============================================

  const STORAGE_KEY = 'network_creation_draft';

  // Refs para manter referências estáveis dos dados (evita re-renders desnecessários)
  const ownerDataRef = useRef(ownerData);
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
        setOwnerData(draft.ownerData || {});
        setNetworkData(draft.networkData || {});
        setStoreData(draft.storeData || {});
        // Não restaurar o passo automaticamente - sempre começar do passo 0
        // setCurrentStep(draft.current_step || 0);
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
          setOwnerData(result.data.owner_data || {});
          setNetworkData(result.data.network_data || {});
          setStoreData(result.data.store_data || {});
          // Não restaurar o passo automaticamente - sempre começar do passo 0
          // setCurrentStep(result.data.current_step || 0);
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
    ownerDataRef.current = ownerData;
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
        // SEGURANÇA: Remover senhas antes de salvar no localStorage
        const { password, password_confirm, ...ownerDataWithoutPassword } = ownerDataRef.current || {};
        const draft: DraftData = {
          ownerData: ownerDataWithoutPassword,
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
        // SEGURANÇA: Remover senhas antes de enviar para o backend
        const { password, password_confirm, ...ownerDataWithoutPassword } = ownerDataRef.current || {};
        const response = await fetch('/api/networks/draft', {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        body: JSON.stringify({
            owner_data: ownerDataWithoutPassword,
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

  // Handlers para dados do proprietário (Step 0)
  const handleOwnerFullName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOwnerData(prev => ({ ...prev, full_name: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerEmail = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOwnerData(prev => ({ ...prev, email: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerPhone = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskPhone(e.target.value);
    setOwnerData(prev => ({ ...prev, phone: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerCPF = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCPF(e.target.value);
    setOwnerData(prev => ({ ...prev, cpf: value }));
    // Limpar erro ao digitar
    setCpfError(null);
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerCPFBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cpfDigits = value.replace(/\D/g, '');
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos completos");
    } else {
      setCpfError(null);
    }
  }, []);

  const handleOwnerBirthDate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOwnerData(prev => ({ ...prev, birth_date: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);


  const handleOwnerPassword = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOwnerData(prev => ({ ...prev, password: value }));
    // Limpar erro ao digitar se a senha começar a ficar válida
    if (value.length >= 8) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/;
      if (passwordRegex.test(value)) {
        // Se a senha é válida, só verificar se coincide com a confirmação
        if (ownerData.password_confirm && value === ownerData.password_confirm) {
          setPasswordError(null);
        } else if (ownerData.password_confirm && value !== ownerData.password_confirm) {
          setPasswordError("As senhas não coincidem");
        }
      }
    }
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [ownerData.password_confirm, debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerPasswordBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length === 0) {
      setPasswordError(null);
      return;
    }
    
    // Validar critérios da senha (feedback genérico para segurança)
    if (value.length < 8) {
      setPasswordError("Senha não atende aos critérios de segurança");
      return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/;
    if (!passwordRegex.test(value)) {
      setPasswordError("Senha não atende aos critérios de segurança");
      return;
    }
    
    // Se a senha é válida, verificar se coincide com a confirmação
    if (ownerData.password_confirm && value !== ownerData.password_confirm) {
      setPasswordError("As senhas não coincidem");
    } else {
      setPasswordError(null);
    }
  }, [ownerData.password_confirm]);

  const handleOwnerPasswordConfirm = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOwnerData(prev => ({ ...prev, password_confirm: value }));
    // Validar se senha e confirmação coincidem
    if (ownerData.password && value !== ownerData.password) {
      setPasswordError("As senhas não coincidem");
    } else if (ownerData.password && value === ownerData.password) {
      // Verificar se a senha principal também atende aos critérios
      if (ownerData.password.length >= 8) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/;
        if (passwordRegex.test(ownerData.password)) {
          setPasswordError(null);
        } else {
          setPasswordError("Senha não atende aos critérios de segurança");
        }
      } else {
        setPasswordError("Senha não atende aos critérios de segurança");
      }
    }
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [ownerData.password, debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleOwnerPasswordConfirmBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length === 0) {
      // Se vazio, não mostrar erro aqui (será validado na submissão)
      return;
    }
    
    // Validar se senha e confirmação coincidem
    if (ownerData.password && value !== ownerData.password) {
      setPasswordError("As senhas não coincidem");
    } else if (ownerData.password && value === ownerData.password) {
      // Verificar se a senha principal também atende aos critérios
      if (ownerData.password.length >= 8) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/;
        if (passwordRegex.test(ownerData.password)) {
          setPasswordError(null);
        } else {
          setPasswordError("Senha não atende aos critérios de segurança");
        }
      } else {
        setPasswordError("Senha não atende aos critérios de segurança");
      }
    }
  }, [ownerData.password]);

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

  // Handler para upload do logo (faz upload imediato e salva URL no draft)
  const handleLogoFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setLogoFile(null);
      logoFileRef.current = null;
      setNetworkData(prev => ({ ...prev, logo_url: undefined }));
      debouncedSaveToLocalStorage();
      debouncedSaveToBackend();
      return;
    }

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
    setUploadingLogo(true);

    try {
      // Fazer upload imediato do logo para o storage
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const tempId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const filePath = `${tempId}/${Date.now()}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Não foi possível obter URL pública do logo');
      }

      // Salvar URL no networkData (será salvo no draft automaticamente)
      setNetworkData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      debouncedSaveToLocalStorage();
      debouncedSaveToBackend();
      
    } catch (error: any) {
      console.error('Erro ao fazer upload do logo:', error);
      setFeedback({
        type: "error",
        message: `Erro ao fazer upload do logo: ${error.message || 'Erro desconhecido'}. Tente novamente.`
      });
      setLogoFile(null);
      logoFileRef.current = null;
      e.target.value = ''; // Limpar o input
    } finally {
      setUploadingLogo(false);
    }
  }, [supabase, debouncedSaveToLocalStorage, debouncedSaveToBackend]);

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

  // Função para atualizar estados de erro dos campos relacionados (Passo 3)
  // Os 3 campos são interligados: se um estiver preenchido, os outros dois devem estar preenchidos
  const updateStep4FieldErrors = useCallback((cnpj: string, companyName: string, tradeName: string) => {
    const hasCNPJ = !!(cnpj && cnpj.replace(/\D/g, '').length === 14);
    const hasCompanyName = !!(companyName && companyName.trim().length > 0);
    const hasTradeName = !!(tradeName && tradeName.trim().length > 0);
    
    // Se qualquer um dos 3 campos estiver preenchido, os outros dois devem estar preenchidos
    if (hasCNPJ || hasCompanyName || hasTradeName) {
      // Se preencheu CNPJ, Razão Social e Nome Fantasia devem ser obrigatórios
      if (hasCNPJ) {
        setCompanyNameError(!hasCompanyName);
        setTradeNameError(!hasTradeName);
      }
      
      // Se preencheu Razão Social, CNPJ e Nome Fantasia devem ser obrigatórios
      if (hasCompanyName) {
        setCnpjError(!hasCNPJ);
        setTradeNameError(!hasTradeName);
      }
      
      // Se preencheu Nome Fantasia, CNPJ e Razão Social devem ser obrigatórios
      if (hasTradeName) {
        setCnpjError(!hasCNPJ);
        setCompanyNameError(!hasCompanyName);
      }
              } else {
      // Se nenhum campo estiver preenchido, não há erros
      setCnpjError(false);
      setCompanyNameError(false);
      setTradeNameError(false);
    }
  }, []);

  // Handlers para Passo 3: Informações Adicionais
  const handleNetworkCNPJ = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCNPJ(e.target.value);
    setNetworkData(prev => {
      const newData = { ...prev, cnpj: value };
      // Atualizar estados de erro imediatamente
      updateStep4FieldErrors(value, prev.company_name || '', prev.trade_name || '');
      return newData;
    });
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend, updateStep4FieldErrors]);

  const handleCompanyName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => {
      const newData = { ...prev, company_name: value };
      // Atualizar estados de erro imediatamente
      updateStep4FieldErrors(prev.cnpj || '', value, prev.trade_name || '');
      return newData;
    });
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend, updateStep4FieldErrors]);

  const handleTradeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => {
      const newData = { ...prev, trade_name: value };
      // Atualizar estados de erro imediatamente
      updateStep4FieldErrors(prev.cnpj || '', prev.company_name || '', value);
      return newData;
    });
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend, updateStep4FieldErrors]);

  const handleStateRegistration = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, state_registration: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleMunicipalRegistration = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, municipal_registration: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleWebsite = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNetworkData(prev => ({ ...prev, website: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);


  const handleMarketSegment = useCallback((value: string) => {
    setNetworkData(prev => ({ ...prev, market_segment: value as "farmacia" | "supermercado" | "varejo" | "outro" }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleBusinessModel = useCallback((value: string) => {
    setNetworkData(prev => ({ ...prev, business_model: value as "franquia" | "propria" | "mista" }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  // Handlers para Passo 4: Dados da Loja (antigo Passo 5)
  const handleStoreName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, name: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreCNPJ = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCNPJ(e.target.value);
    setStoreData(prev => ({ ...prev, cnpj: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreCompanyName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, company_name: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreZipCode = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCEP(e.target.value);
    const cleanCEP = value.replace(/\D/g, '');
    
    setStoreData(prev => ({ ...prev, zip_code: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();

    // Se o CEP tiver 8 dígitos, buscar automaticamente o endereço
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const addressData = await fetchAddressByCEP(value);
        
        if (addressData) {
          setStoreData(prev => ({
            ...prev,
            zip_code: value,
            street: addressData.logradouro || prev.street || '',
            neighborhood: addressData.bairro || prev.neighborhood || '',
            city: addressData.localidade || prev.city || '',
            state: addressData.uf || prev.state || '',
            address_complement: addressData.complemento || prev.address_complement || '',
          }));
          
          debouncedSaveToLocalStorage();
          debouncedSaveToBackend();
          
          setFeedback({
            type: "success",
            message: "Endereço encontrado e preenchido automaticamente!"
          });
          
          setTimeout(() => setFeedback(null), 3000);
        } else {
          setFeedback({
            type: "error",
            message: "CEP não encontrado. Por favor, preencha o endereço manualmente."
          });
          
          setTimeout(() => setFeedback(null), 5000);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        setFeedback({
          type: "error",
          message: "Erro ao buscar CEP. Tente novamente ou preencha manualmente."
        });
        
        setTimeout(() => setFeedback(null), 5000);
      } finally {
        setLoadingCEP(false);
      }
    }
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreState = useCallback((value: string) => {
    setStoreData(prev => ({ ...prev, state: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreCity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, city: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStorePhone = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskPhone(e.target.value);
    setStoreData(prev => ({ ...prev, phone: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreEmail = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, email: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreStreet = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, street: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreStreetNumber = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, street_number: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreNeighborhood = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, neighborhood: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreAddressComplement = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, address_complement: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreTradeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, trade_name: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreStateRegistration = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, state_registration: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleStoreMunicipalRegistration = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStoreData(prev => ({ ...prev, municipal_registration: value }));
    debouncedSaveToLocalStorage();
    debouncedSaveToBackend();
  }, [debouncedSaveToLocalStorage, debouncedSaveToBackend]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setFeedback(null); // Limpar feedback ao avançar para o próximo passo
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1)); // TOTAL_STEPS é 7, então max é 6
    }
  };

  const handlePrevious = () => {
    setFeedback(null); // Limpar feedback ao voltar para o passo anterior
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Limpar todos os dados e voltar ao passo 1
  const handleClearAll = useCallback(async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      // Limpar estado
      setOwnerData({});
      setNetworkData({});
      setStoreData({});
      setLogoFile(null);
      logoFileRef.current = null;
      setCurrentStep(0);
      setFeedback(null);
      setLoadingCEP(false);
      setPasswordError(null);
      setCpfError(null);

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
      if (currentStep === 0) {
        // Limpar dados do proprietário
        setOwnerData({});
        setPasswordError(null);
        setCpfError(null);
      } else if (currentStep === 1) {
        // Limpar dados básicos
        setNetworkData(prev => ({
          ...prev,
          name: '',
          primary_email: '',
          primary_phone: '',
          logo_url: undefined,
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
        // Limpar dados de informações adicionais
        setNetworkData(prev => ({
          ...prev,
          cnpj: '',
          company_name: '',
          trade_name: '',
          state_registration: '',
          municipal_registration: '',
          website: '',
          founded_at: '',
          estimated_store_count: undefined,
          monthly_revenue_target: undefined,
          avg_employees_per_store: undefined,
          market_segment: undefined,
          business_model: undefined,
          currency: 'BRL',
          fiscal_month_end_day: undefined,
          primary_bank_code: '',
          erp_integration: false,
          erp_type: '',
          internal_notes: '',
          tags: undefined,
        }));
        setCnpjError(null);
        setCompanyNameError(null);
      } else if (currentStep === 4) {
        // Limpar dados da loja
        setStoreData({});
      } else if (currentStep === 5) {
        // Passo 5 (revisão, antigo Passo 6) - não há dados para limpar aqui
      }

      // Salvar após limpar
      debouncedSaveToLocalStorage();
      debouncedSaveToBackend();

      // Feedback visual
      setFeedback({
        type: "success",
        message: `Dados do passo ${currentStep + 1} foram limpos.`
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
    // Validação para Step 0 (dados do proprietário)
    if (currentStep === 0) {
      if (!ownerData.full_name || ownerData.full_name.trim().length < 2) {
        setFeedback({ type: "error", message: "Nome completo do proprietário é obrigatório (mínimo 2 caracteres)" });
        return false;
      }
      if (!ownerData.email || !ownerData.email.includes('@')) {
        setFeedback({ type: "error", message: "E-mail do proprietário é obrigatório e deve ser válido" });
        return false;
      }
      if (!ownerData.phone || ownerData.phone.replace(/\D/g, '').length < 10) {
        setFeedback({ type: "error", message: "Telefone do proprietário é obrigatório" });
        return false;
      }
      const cpfDigits = ownerData.cpf ? ownerData.cpf.replace(/\D/g, '') : '';
      if (!cpfDigits || cpfDigits.length !== 11) {
        setCpfError("CPF deve ter 11 dígitos completos");
        setFeedback({ type: "error", message: "CPF do proprietário é obrigatório e deve ter 11 dígitos completos" });
        return false;
      } else {
        setCpfError(null);
      }
      if (!ownerData.password || ownerData.password.length < 8) {
        setPasswordError("Senha não atende aos critérios de segurança");
        setFeedback({ type: "error", message: "Senha não atende aos critérios de segurança. Verifique os requisitos abaixo." });
        return false;
      }
      // Validar formato da senha (minúscula, maiúscula, número e símbolo)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/;
      if (!passwordRegex.test(ownerData.password)) {
        setPasswordError("Senha não atende aos critérios de segurança");
        setFeedback({ type: "error", message: "Senha não atende aos critérios de segurança. Verifique os requisitos abaixo." });
        return false;
      }
      if (!ownerData.password_confirm) {
        setPasswordError("Confirmação de senha é obrigatória");
        setFeedback({ type: "error", message: "Confirmação de senha é obrigatória" });
        return false;
      }
      // Usar comparação de strings normal no frontend (não crítico, mas consistente)
      // A validação real com timing-safe compare acontece no backend
      if (ownerData.password !== ownerData.password_confirm) {
        setPasswordError("As senhas não coincidem");
        setFeedback({ type: "error", message: "As senhas não coincidem" });
        return false;
      }
      // Se passou em todas as validações, limpar erro
      setPasswordError(null);
    }
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
      // Verificar se logo foi enviado (logo_url no networkData ou logoFile disponível)
      if (!networkData.logo_url && !logoFile && !logoFileRef.current) {
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
    // Validações para etapa 3 (informações adicionais)
    if (currentStep === 3) {
      const cnpjDigits = networkData.cnpj ? networkData.cnpj.replace(/\D/g, '') : '';
      const hasCNPJ = cnpjDigits.length === 14;
      const hasCompanyName = networkData.company_name && networkData.company_name.trim().length > 0;
      const hasTradeName = networkData.trade_name && networkData.trade_name.trim().length > 0;
      
      // Se começou a preencher CNPJ, deve ter 14 dígitos completos
      if (networkData.cnpj && cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        setFeedback({ type: "error", message: "O CNPJ deve ter 14 dígitos completos" });
        return false;
      }
      
      // Se qualquer um dos 3 campos estiver preenchido, os outros dois devem estar preenchidos
      if (hasCNPJ || hasCompanyName || hasTradeName) {
        // Se preencheu CNPJ, Razão Social e Nome Fantasia devem estar preenchidos
        if (hasCNPJ && !hasCompanyName) {
          setFeedback({ type: "error", message: "Se você preencheu o CNPJ, também deve preencher a Razão Social e o Nome Fantasia" });
          return false;
        }
        
        if (hasCNPJ && !hasTradeName) {
          setFeedback({ type: "error", message: "Se você preencheu o CNPJ, também deve preencher a Razão Social e o Nome Fantasia" });
          return false;
        }
        
        // Se preencheu Razão Social, CNPJ e Nome Fantasia devem estar preenchidos
        if (hasCompanyName && !hasCNPJ) {
          setFeedback({ type: "error", message: "Se você preencheu a Razão Social, também deve preencher o CNPJ e o Nome Fantasia" });
          return false;
        }
        
        if (hasCompanyName && !hasTradeName) {
          setFeedback({ type: "error", message: "Se você preencheu a Razão Social, também deve preencher o CNPJ e o Nome Fantasia" });
          return false;
        }
        
        // Se preencheu Nome Fantasia, CNPJ e Razão Social devem estar preenchidos
        if (hasTradeName && !hasCNPJ) {
          setFeedback({ type: "error", message: "Para preencher o Nome Fantasia, você deve preencher o CNPJ e a Razão Social" });
          return false;
        }
        
        if (hasTradeName && !hasCompanyName) {
          setFeedback({ type: "error", message: "Para preencher o Nome Fantasia, você deve preencher o CNPJ e a Razão Social" });
          return false;
        }
      }
    }
    // Validações para etapa 4 (dados da loja)
    if (currentStep === 4) {
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
      // Validação de endereço (obrigatório, exceto complemento)
      if (!storeData.street || storeData.street.trim().length < 1) {
        setFeedback({ type: "error", message: "Logradouro da loja é obrigatório" });
        return false;
      }
      if (!storeData.street_number || storeData.street_number.trim().length < 1) {
        setFeedback({ type: "error", message: "Número do endereço da loja é obrigatório" });
        return false;
      }
      if (!storeData.neighborhood || storeData.neighborhood.trim().length < 1) {
        setFeedback({ type: "error", message: "Bairro da loja é obrigatório" });
        return false;
      }
    }
    // Validações para etapa 5 (revisão) - validar tudo novamente
    if (currentStep === 5) {
      // Validar rede
      if (!networkData.name || networkData.name.trim().length < 2) {
        setFeedback({ type: "error", message: "Nome da rede é obrigatório" });
        return false;
      }
      if (!networkData.primary_email || !networkData.primary_email.includes('@')) {
        setFeedback({ type: "error", message: "E-mail principal é obrigatório" });
        return false;
      }
      if (!networkData.primary_phone || networkData.primary_phone.replace(/\D/g, '').length < 10) {
        setFeedback({ type: "error", message: "Telefone principal é obrigatório" });
        return false;
      }
      // Verificar se logo foi enviado (logo_url no networkData ou logoFile disponível)
      if (!networkData.logo_url && !logoFile && !logoFileRef.current) {
        setFeedback({ type: "error", message: "Logo da rede é obrigatório" });
        return false;
      }
      if (!networkData.zip_code || networkData.zip_code.replace(/\D/g, '').length !== 8) {
        setFeedback({ type: "error", message: "CEP da rede é obrigatório" });
        return false;
      }
      if (!networkData.state || networkData.state.length !== 2) {
        setFeedback({ type: "error", message: "Estado da rede é obrigatório" });
        return false;
      }
      if (!networkData.city || networkData.city.trim().length < 2) {
        setFeedback({ type: "error", message: "Cidade da rede é obrigatória" });
        return false;
      }
      if (!networkData.street || networkData.street.trim().length < 1) {
        setFeedback({ type: "error", message: "Logradouro da rede é obrigatório" });
        return false;
      }
      if (!networkData.street_number || networkData.street_number.trim().length < 1) {
        setFeedback({ type: "error", message: "Número da rede é obrigatório" });
        return false;
      }
      if (!networkData.neighborhood || networkData.neighborhood.trim().length < 1) {
        setFeedback({ type: "error", message: "Bairro da rede é obrigatório" });
        return false;
      }
      // Validar loja
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
        setFeedback({ type: "error", message: "Estado da loja é obrigatório" });
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
        setFeedback({ type: "error", message: "E-mail da loja é obrigatório" });
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

      // Logo já foi enviado durante o Step 1, usar a URL salva
      // Se por algum motivo não houver logo_url, tentar fazer upload do logoFile
      let logoUrl = networkData.logo_url;
      
      if (!logoUrl) {
        const currentLogoFile = logoFile || logoFileRef.current;
        if (!currentLogoFile) {
          throw new Error('Logo da rede é obrigatório');
        }

        try {
          // Upload do logo se não foi feito anteriormente
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
      }

      // Preparar dados do proprietário
      const ownerPayload: any = {
        full_name: ownerData.full_name!,
        email: ownerData.email!,
        phone: ownerData.phone!.replace(/\D/g, ''),
        cpf: ownerData.cpf!.replace(/\D/g, ''),
        password: ownerData.password!,
        password_confirm: ownerData.password_confirm!,
      };

      // Adicionar campos opcionais do proprietário se preenchidos
      if (ownerData.birth_date) ownerPayload.birth_date = ownerData.birth_date;
      if (ownerData.photo_url) ownerPayload.photo_url = ownerData.photo_url;

      // Preparar dados da rede
      const networkPayload: any = {
        owner: ownerPayload,
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
          if (key === 'primary_phone') {
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
        const errorDetails = networkResult.details 
          ? (Array.isArray(networkResult.details) 
              ? networkResult.details.map((d: any) => `${d.path || d.path}: ${d.message || d}`).join(', ')
              : JSON.stringify(networkResult.details))
          : '';
        const errorMessage = networkResult.error 
          + (errorDetails ? ` - Detalhes: ${errorDetails}` : '')
          + (networkResult.hint ? ` - Dica: ${networkResult.hint}` : '');
        throw new Error(errorMessage);
      }

      const networkId = networkResult.data?.id;
      if (!networkId) {
        throw new Error("Rede criada mas ID não retornado");
      }

      // TODO: Criar primeira loja também
      // Por enquanto, apenas criar a rede

      // SEGURANÇA: Limpar senhas da memória após criação bem-sucedida
      setOwnerData(prev => {
        const { password, password_confirm, ...rest } = prev;
        return rest;
      });
      setPasswordError(null);

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
    { id: 0, title: "Proprietário", icon: <User className="w-5 h-5" /> },
    { id: 1, title: "Dados Básicos", icon: <Building2 className="w-5 h-5" /> },
    { id: 2, title: "Endereço", icon: <MapPin className="w-5 h-5" /> },
    { id: 3, title: "Informações Adicionais", icon: <FileText className="w-5 h-5" /> },
    { id: 4, title: "Primeira Loja", icon: <Store className="w-5 h-5" /> },
    { id: 5, title: "Revisão", icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

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
                <p className="text-sm text-gray-600">Passo {currentStep + 1} de {TOTAL_STEPS}</p>
          </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">
                  {Math.round(progress)}%
                </div>
                <div className="text-xs text-gray-500">Concluído</div>
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  Dados do Proprietário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="space-y-2">
                  <Label htmlFor="owner-full-name">Nome Completo <span className="text-red-500">*</span></Label>
              <Input
                    key="owner-full-name-input"
                    id="owner-full-name"
                    value={ownerData.full_name || ''}
                    onChange={handleOwnerFullName}
                    placeholder="Ex: João Silva"
                disabled={creating}
                maxLength={255}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner-email">E-mail <span className="text-red-500">*</span></Label>
                    <Input
                      key="owner-email-input"
                      id="owner-email"
                      type="email"
                      value={ownerData.email || ''}
                      onChange={handleOwnerEmail}
                      placeholder="joao@email.com"
                      disabled={creating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner-phone">Telefone <span className="text-red-500">*</span></Label>
                    <Input
                      key="owner-phone-input"
                      id="owner-phone"
                      value={ownerData.phone || ''}
                      onChange={handleOwnerPhone}
                      placeholder="(11) 99999-9999"
                      disabled={creating}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-cpf">CPF <span className="text-red-500">*</span></Label>
                  <Input
                    key="owner-cpf-input"
                    id="owner-cpf"
                    value={ownerData.cpf || ''}
                    onChange={handleOwnerCPF}
                    onBlur={handleOwnerCPFBlur}
                    placeholder="000.000.000-00"
                    disabled={creating}
                    maxLength={14}
                    className={cpfError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {cpfError && (
                    <p className="text-xs text-red-500">{cpfError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-password">Senha <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      key="owner-password-input"
                      id="owner-password"
                      type={showPassword ? "text" : "password"}
                      value={ownerData.password || ''}
                      onChange={handleOwnerPassword}
                      onBlur={handleOwnerPasswordBlur}
                      placeholder="Digite sua senha"
                      disabled={creating}
                      className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={creating}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && !passwordError.includes("As senhas não coincidem") && !passwordError.includes("Confirmação de senha") && (
                    <p className="text-xs text-red-500">{passwordError}</p>
                  )}
                  {!passwordError && (
              <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres. Deve conter: minúscula, maiúscula, número e símbolo (@$!%*?&-_)
              </p>
                  )}
            </div>

            <div className="space-y-2">
                  <Label htmlFor="owner-password-confirm">Confirmar Senha <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      key="owner-password-confirm-input"
                      id="owner-password-confirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      value={ownerData.password_confirm || ''}
                      onChange={handleOwnerPasswordConfirm}
                      onBlur={handleOwnerPasswordConfirmBlur}
                      placeholder="Confirme sua senha"
                      disabled={creating}
                      className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={creating}
                    >
                      {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && (passwordError.includes("As senhas não coincidem") || passwordError.includes("Confirmação de senha")) && (
                    <p className="text-xs text-red-500">{passwordError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner-birth-date">Data de Nascimento</Label>
                  <Input
                    key="owner-birth-date-input"
                    id="owner-birth-date"
                    type="date"
                    value={ownerData.birth_date || ''}
                    onChange={handleOwnerBirthDate}
                    disabled={creating}
                  />
                </div>

              </CardContent>
            </Card>
          )}
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
                    className={`flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-xs transition-colors ${
                      creating || uploadingLogo
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    Escolher arquivo
              </Label>
              <Input
                id="network-logo"
                type="file"
                    accept="image/png,image/jpeg,image/jpg,image/heic"
                    onChange={handleLogoFileChange}
                disabled={creating || uploadingLogo}
                    className="hidden"
              />
                  {uploadingLogo && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fazendo upload do logo...</span>
                    </div>
                  )}
                  {(logoFile || logoFileRef.current) && !uploadingLogo && (
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
                      {networkData.logo_url && (
                        <span className="text-xs text-gray-500 ml-2">✓ Salvo</span>
                      )}
                    </div>
                  )}
                  {networkData.logo_url && !logoFile && !logoFileRef.current && !uploadingLogo && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Logo salvo (carregado do rascunho)</span>
                      <img src={networkData.logo_url} alt="Logo" className="w-8 h-8 object-cover rounded" />
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
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Informações Adicionais da Rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="network-cnpj">CNPJ da Rede</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>CNPJ da rede, se você tiver um CNPJ centralizado. Deixe em branco se cada loja tiver seu próprio CNPJ.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      key="network-cnpj-input"
                      id="network-cnpj"
                      value={networkData.cnpj || ''}
                      onChange={handleNetworkCNPJ}
                      placeholder="00.000.000/0000-00"
                      disabled={creating}
                      maxLength={18}
                      className={cnpjError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {cnpjError && (
                      <p className="text-xs text-red-500">Este campo é obrigatório</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="company-name">Razão Social</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Razão social registrada no CNPJ da rede. Necessário apenas se você informou um CNPJ para a rede.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      key="company-name-input"
                      id="company-name"
                      value={networkData.company_name || ''}
                      onChange={handleCompanyName}
                      placeholder="Razão Social da Rede"
                      disabled={creating}
                      maxLength={255}
                      className={companyNameError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {companyNameError && (
                      <p className="text-xs text-red-500">Este campo é obrigatório</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="trade-name">Nome Fantasia</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nome comercial diferente da razão social. Ajuda a identificar sua marca nas análises e relatórios.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    key="trade-name-input"
                    id="trade-name"
                    value={networkData.trade_name || ''}
                    onChange={handleTradeName}
                    placeholder="Nome Fantasia"
                    disabled={creating}
                    maxLength={255}
                    className={tradeNameError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {tradeNameError && (
                    <p className="text-xs text-red-500">Este campo é obrigatório</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="state-registration">Inscrição Estadual</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Inscrição estadual da rede. Facilita a emissão de relatórios fiscais e documentos.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      key="state-registration-input"
                      id="state-registration"
                      value={networkData.state_registration || ''}
                      onChange={handleStateRegistration}
                      placeholder="000.000.000.000"
                      disabled={creating}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="municipal-registration">Inscrição Municipal</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Inscrição municipal da rede. Necessária para algumas operações e relatórios municipais.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      key="municipal-registration-input"
                      id="municipal-registration"
                      value={networkData.municipal_registration || ''}
                      onChange={handleMunicipalRegistration}
                      placeholder="000000"
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="website">Site</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Site da sua rede. Pode ser usado em relatórios e comunicações com clientes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    key="website-input"
                    id="website"
                    type="url"
                    value={networkData.website || ''}
                    onChange={handleWebsite}
                    placeholder="rede.com.br"
                    disabled={creating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="market-segment">Segmento de Mercado</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Segmento de atuação da rede. Permite comparações com outras redes do mesmo segmento.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      key="market-segment-select"
                      value={networkData.market_segment || ''}
                      onValueChange={handleMarketSegment}
                      disabled={creating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmacia">Farmácia</SelectItem>
                        <SelectItem value="supermercado">Supermercado</SelectItem>
                        <SelectItem value="varejo">Varejo</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="business-model">Modelo de Negócio</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Modelo de negócio da rede. Ajuda a entender a estrutura operacional e fazer análises comparativas.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      key="business-model-select"
                      value={networkData.business_model || ''}
                      onValueChange={handleBusinessModel}
                      disabled={creating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="franquia">Franquia</SelectItem>
                        <SelectItem value="propria">Própria</SelectItem>
                        <SelectItem value="mista">Mista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  Dados da Primeira Loja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nome da Loja <span className="text-red-500">*</span></Label>
                  <Input
                    key="store-name-input"
                    id="store-name"
                    value={storeData.name || ''}
                    onChange={handleStoreName}
                    placeholder="Ex: Loja Centro"
                    disabled={creating}
                    maxLength={255}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-cnpj">CNPJ da Loja <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-cnpj-input"
                      id="store-cnpj"
                      value={storeData.cnpj || ''}
                      onChange={handleStoreCNPJ}
                      placeholder="00.000.000/0000-00"
                      disabled={creating}
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-company-name">Razão Social <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-company-name-input"
                      id="store-company-name"
                      value={storeData.company_name || ''}
                      onChange={handleStoreCompanyName}
                      placeholder="Razão Social da Loja"
                      disabled={creating}
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-trade-name">Nome Fantasia</Label>
                  <Input
                    key="store-trade-name-input"
                    id="store-trade-name"
                    value={storeData.trade_name || ''}
                    onChange={handleStoreTradeName}
                    placeholder="Nome Fantasia da Loja"
                    disabled={creating}
                    maxLength={255}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-state-registration">Inscrição Estadual</Label>
                    <Input
                      key="store-state-registration-input"
                      id="store-state-registration"
                      value={storeData.state_registration || ''}
                      onChange={handleStoreStateRegistration}
                      placeholder="000.000.000.000"
                      disabled={creating}
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-municipal-registration">Inscrição Municipal</Label>
                    <Input
                      key="store-municipal-registration-input"
                      id="store-municipal-registration"
                      value={storeData.municipal_registration || ''}
                      onChange={handleStoreMunicipalRegistration}
                      placeholder="Inscrição Municipal"
                      disabled={creating}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-zip-code">CEP <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        key="store-zip-code-input"
                        id="store-zip-code"
                        value={storeData.zip_code || ''}
                        onChange={handleStoreZipCode}
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
                    <Label htmlFor="store-state">Estado (UF) <span className="text-red-500">*</span></Label>
                    <Select
                      key="store-state-select"
                      value={storeData.state || ''}
                      onValueChange={handleStoreState}
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
                  <Label htmlFor="store-city">Cidade <span className="text-red-500">*</span></Label>
                  <Input
                    key="store-city-input"
                    id="store-city"
                    value={storeData.city || ''}
                    onChange={handleStoreCity}
                    placeholder="Ex: São Paulo"
                    disabled={creating}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-street">Logradouro <span className="text-red-500">*</span></Label>
                  <Input
                    key="store-street-input"
                    id="store-street"
                    value={storeData.street || ''}
                    onChange={handleStoreStreet}
                    placeholder="Rua, Avenida, etc."
                    disabled={creating}
                    maxLength={255}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-street-number">Número <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-street-number-input"
                      id="store-street-number"
                      value={storeData.street_number || ''}
                      onChange={handleStoreStreetNumber}
                      placeholder="123"
                      disabled={creating}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-neighborhood">Bairro <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-neighborhood-input"
                      id="store-neighborhood"
                      value={storeData.neighborhood || ''}
                      onChange={handleStoreNeighborhood}
                      placeholder="Centro"
                      disabled={creating}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-address-complement">Complemento</Label>
                  <Input
                    key="store-address-complement-input"
                    id="store-address-complement"
                    value={storeData.address_complement || ''}
                    onChange={handleStoreAddressComplement}
                    placeholder="Sala, Andar, etc."
                    disabled={creating}
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-phone">Telefone <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-phone-input"
                      id="store-phone"
                      value={storeData.phone || ''}
                      onChange={handleStorePhone}
                      placeholder="(11) 99999-9999"
                      disabled={creating}
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-email">E-mail <span className="text-red-500">*</span></Label>
                    <Input
                      key="store-email-input"
                      id="store-email"
                      type="email"
                      value={storeData.email || ''}
                      onChange={handleStoreEmail}
                      placeholder="loja@rede.com.br"
                      disabled={creating}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Revisão dos Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      Dados da Rede
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nome:</span>
                        <span className="font-medium">{networkData.name || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">E-mail Principal:</span>
                        <span className="font-medium">{networkData.primary_email || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Telefone Principal:</span>
                        <span className="font-medium">{networkData.primary_phone || 'Não informado'}</span>
                      </div>
                      {networkData.cnpj && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">CNPJ:</span>
                          <span className="font-medium">{networkData.cnpj}</span>
                        </div>
                      )}
                      {networkData.company_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Razão Social:</span>
                          <span className="font-medium">{networkData.company_name}</span>
                </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Endereço:</span>
                        <span className="font-medium">
                          {networkData.street && networkData.street_number 
                            ? `${networkData.street}, ${networkData.street_number}${networkData.address_complement ? ` - ${networkData.address_complement}` : ''}`
                            : 'Não informado'}
                        </span>
              </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bairro:</span>
                        <span className="font-medium">{networkData.neighborhood || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cidade/Estado:</span>
                        <span className="font-medium">
                          {networkData.city && networkData.state 
                            ? `${networkData.city} - ${networkData.state}`
                            : 'Não informado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CEP:</span>
                        <span className="font-medium">{networkData.zip_code || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Store className="w-5 h-5 text-emerald-600" />
                      Dados da Primeira Loja
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nome:</span>
                        <span className="font-medium">{storeData.name || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CNPJ:</span>
                        <span className="font-medium">{storeData.cnpj || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Razão Social:</span>
                        <span className="font-medium">{storeData.company_name || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Telefone:</span>
                        <span className="font-medium">{storeData.phone || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">E-mail:</span>
                        <span className="font-medium">{storeData.email || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cidade/Estado:</span>
                        <span className="font-medium">
                          {storeData.city && storeData.state 
                            ? `${storeData.city} - ${storeData.state}`
                            : 'Não informado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CEP:</span>
                        <span className="font-medium">{storeData.zip_code || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Revise todos os dados antes de criar</p>
                      <p>Após criar a rede e a primeira loja, você poderá adicionar mais lojas posteriormente.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
