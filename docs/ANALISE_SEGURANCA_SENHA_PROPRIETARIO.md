# Análise de Segurança: Processo de Criação de Senha do Proprietário

## Data: 2025-01-07
## Contexto: Criação de rede com proprietário (Step 0)

---

## 🔴 VULNERABILIDADES CRÍTICAS IDENTIFICADAS

### 1. **Senha Armazenada em Texto Plano no localStorage**
**Severidade: CRÍTICA**

**Problema:**
- A senha do proprietário está sendo salva em texto plano no `localStorage` através do draft
- Qualquer script JavaScript no domínio pode acessar o `localStorage`
- Vulnerável a XSS (Cross-Site Scripting)
- Persiste mesmo após fechar o navegador

**Localização:**
```typescript
// src/components/configuracoes/empresas/CriarRedeView.tsx:369
localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
// draft contém ownerData.password em texto plano
```

**Impacto:**
- Se um atacante conseguir executar JavaScript malicioso (XSS), pode roubar senhas
- Extensões de navegador maliciosas podem ler o localStorage
- Dumps de memória do navegador podem expor senhas

---

### 2. **Senha Armazenada em Texto Plano no Banco de Dados (Draft)**
**Severidade: CRÍTICA**

**Problema:**
- A senha está sendo salva no banco de dados (tabela `network_creation_drafts`) em texto plano
- Armazenada no campo `network_data._owner_data.password`
- Acessível a qualquer pessoa com acesso ao banco de dados
- Não há criptografia no backend

**Localização:**
```typescript
// src/app/api/networks/draft/route.ts:69
draftData.network_data = { ...draftData.network_data, _owner_data: owner_data };
// owner_data contém password em texto plano
```

**Impacto:**
- Administradores de banco de dados podem ver senhas
- Se o banco for comprometido, todas as senhas são expostas
- Violação de LGPD/GDPR (dados sensíveis não protegidos)

---

### 3. **Senha em Memória do React (Estado)**
**Severidade: ALTA**

**Problema:**
- A senha fica armazenada no estado do React (`ownerData.password`)
- Pode ser exposta em:
  - Dumps de memória do navegador
  - DevTools do React (React DevTools)
  - Snapshots de memória em caso de crash
  - Extensões de navegador que inspecionam estado

**Localização:**
```typescript
// src/components/configuracoes/empresas/CriarRedeView.tsx:250
const [ownerData, setOwnerData] = useState<Partial<OwnerFormData>>({});
// ownerData.password contém a senha em texto plano
```

**Impacto:**
- Senhas podem ser extraídas de memória
- Ferramentas de debugging podem expor senhas

---

### 4. **Sem Limpeza de Memória Após Uso**
**Severidade: MÉDIA**

**Problema:**
- Após enviar a senha para o backend, ela permanece:
  - No estado do React
  - No localStorage (se salva)
  - No banco de dados (draft)
- Não há limpeza explícita após criação bem-sucedida

**Impacto:**
- Senha permanece acessível mesmo após uso
- Aumenta a janela de exposição

---

### 5. **Sem Verificação de Senhas Comprometidas**
**Severidade: MÉDIA**

**Problema:**
- Não verifica se a senha está em listas de senhas vazadas (Have I Been Pwned, etc.)
- Permite uso de senhas conhecidamente comprometidas

**Impacto:**
- Usuários podem usar senhas já vazadas em outros vazamentos
- Aumenta risco de comprometimento de conta

---

### 6. **Feedback de Validação Pode Revelar Informações**
**Severidade: BAIXA**

**Problema:**
- Mensagens de erro muito específicas podem ajudar em ataques de enumeração
- Exemplo: "Senha deve ter no mínimo 8 caracteres" revela o tamanho mínimo

**Impacto:**
- Ajuda atacantes a entender regras de validação
- Facilita criação de senhas que passam na validação mas são fracas

---

### 7. **Sem Rate Limiting Específico para Criação de Senha**
**Severidade: MÉDIA**

**Problema:**
- Embora exista rate limiting geral na API, não há proteção específica contra:
  - Tentativas repetidas de criação de senha
  - Brute force de validação de senha
  - Envio massivo de requisições

**Impacto:**
- Possibilidade de abuso da API
- DDoS potencial

---

### 8. **Sem Proteção Contra Timing Attacks**
**Severidade: BAIXA**

**Problema:**
- Comparação de senhas usa `===` que pode ser vulnerável a timing attacks
- Embora o risco seja baixo neste contexto, é uma boa prática usar comparação constante

**Impacto:**
- Teoricamente possível extrair informações sobre senhas através de timing

---

### 9. **Sem Auditoria de Criação de Senha**
**Severidade: BAIXA**

**Problema:**
- Não há log de quando senhas são criadas
- Não há rastreamento de tentativas de criação
- Dificulta detecção de atividades suspeitas

**Impacto:**
- Dificulta investigação de incidentes
- Não permite detecção proativa de ataques

---

## ✅ PONTOS POSITIVOS IDENTIFICADOS

1. **Validação de Força de Senha**
   - ✅ Mínimo 8 caracteres
   - ✅ Requer minúscula, maiúscula, número e símbolo
   - ✅ Máximo 128 caracteres

2. **Confirmação de Senha**
   - ✅ Campo de confirmação obrigatório
   - ✅ Validação de correspondência

3. **Uso de safeLogger**
   - ✅ Senhas são mascaradas em logs
   - ✅ Previne exposição acidental em logs

4. **HTTPS (Assumido)**
   - ✅ Transmissão deve ser via HTTPS em produção
   - ⚠️ Verificar se está forçando HTTPS

5. **Validação no Backend**
   - ✅ Backend valida senha antes de criar usuário
   - ✅ Usa schema Zod para validação

---

## 🛡️ RECOMENDAÇÕES DE SEGURANÇA

### Prioridade CRÍTICA (Implementar Imediatamente)

#### 1. **NÃO Armazenar Senha em Drafts**
```typescript
// ❌ NÃO FAZER:
draftData.network_data = { ...draftData.network_data, _owner_data: owner_data };

// ✅ FAZER:
// Excluir password e password_confirm do draft
const { password, password_confirm, ...ownerDataWithoutPassword } = owner_data;
draftData.network_data = { ...draftData.network_data, _owner_data: ownerDataWithoutPassword };
```

#### 2. **NÃO Salvar Senha no localStorage**
```typescript
// ❌ NÃO FAZER:
localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

// ✅ FAZER:
// Excluir senha antes de salvar
const draftWithoutPassword = {
  ...draft,
  ownerData: { ...draft.ownerData, password: undefined, password_confirm: undefined }
};
localStorage.setItem(STORAGE_KEY, JSON.stringify(draftWithoutPassword));
```

#### 3. **Limpar Senha da Memória Após Uso**
```typescript
// Após criação bem-sucedida:
setOwnerData(prev => ({ ...prev, password: undefined, password_confirm: undefined }));
// Limpar localStorage
localStorage.removeItem(STORAGE_KEY);
// Limpar draft do backend
await fetch('/api/networks/draft', { method: 'DELETE' });
```

---

### Prioridade ALTA (Implementar em Breve)

#### 4. **Usar Comparação Constante para Senhas**
```typescript
// Usar biblioteca como crypto.timingSafeEqual ou implementar:
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

#### 5. **Verificar Senhas Comprometidas (Have I Been Pwned)**
```typescript
// Integrar com API Have I Been Pwned
async function checkPasswordBreach(password: string): Promise<boolean> {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);
  
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const data = await response.text();
  
  return data.includes(suffix);
}
```

#### 6. **Adicionar Auditoria**
```typescript
// Log de criação de senha (sem expor a senha)
logSecurityEvent({
  type: 'password_created',
  userId: user.id,
  endpoint: '/api/networks/create',
  details: {
    ownerEmail: ownerData.email,
    networkId: networkId,
    timestamp: new Date().toISOString()
  }
});
```

---

### Prioridade MÉDIA (Melhorias Adicionais)

#### 7. **Rate Limiting Específico para Criação de Senha**
```typescript
// Adicionar rate limiting mais restritivo para criação de senha
const passwordCreationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3 // Máximo 3 tentativas por 15 minutos
});
```

#### 8. **Feedback Genérico de Validação**
```typescript
// ❌ NÃO FAZER:
setPasswordError("Senha deve ter no mínimo 8 caracteres");

// ✅ FAZER:
setPasswordError("Senha não atende aos critérios de segurança");
// Mostrar critérios em tooltip separado, não no erro
```

#### 9. **Forçar HTTPS em Produção**
```typescript
// Verificar se está usando HTTPS
if (process.env.NODE_ENV === 'production' && !req.headers.get('x-forwarded-proto')?.includes('https')) {
  return NextResponse.json({ error: 'HTTPS required' }, { status: 403 });
}
```

#### 10. **Sanitização de Entrada**
```typescript
// Remover caracteres de controle e normalizar
function sanitizePassword(password: string): string {
  return password
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim();
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **CRÍTICO**: Remover senha de drafts (localStorage e backend)
- [ ] **CRÍTICO**: Limpar senha da memória após uso
- [ ] **ALTA**: Implementar comparação constante de senhas
- [ ] **ALTA**: Adicionar verificação de senhas comprometidas
- [ ] **ALTA**: Adicionar auditoria de criação de senha
- [ ] **MÉDIA**: Rate limiting específico para criação de senha
- [ ] **MÉDIA**: Feedback genérico de validação
- [ ] **MÉDIA**: Forçar HTTPS em produção
- [ ] **MÉDIA**: Sanitização de entrada

---

## 🔍 REFERÊNCIAS E BOAS PRÁTICAS

1. **OWASP Password Storage Cheat Sheet**
   - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

2. **NIST Digital Identity Guidelines (SP 800-63B)**
   - Requisitos para senhas seguras
   - Verificação de senhas comprometidas

3. **Have I Been Pwned API**
   - https://haveibeenpwned.com/API/v3#PwnedPasswords

4. **OWASP Top 10 (2021)**
   - A03:2021 – Injection
   - A07:2021 – Identification and Authentication Failures

---

## 📝 NOTAS ADICIONAIS

- **LGPD/GDPR**: Armazenar senhas em texto plano viola regulamentações de proteção de dados
- **Responsabilidade**: Senhas são dados extremamente sensíveis e devem ser tratadas com máxima segurança
- **Princípio do Menor Privilégio**: Senhas não devem ser armazenadas onde não são necessárias
- **Defesa em Profundidade**: Múltiplas camadas de segurança são necessárias

---

**Última Atualização**: 2025-01-07
**Autor**: Análise de Segurança - Sistema de Criação de Rede

