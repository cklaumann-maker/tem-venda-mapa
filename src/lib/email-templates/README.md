# 📧 Templates de Email Profissionais

Templates de email profissionais baseados em emails de grandes empresas de tecnologia, otimizados para não cair em spam.

---

## 📁 Arquivos

- `password-reset.ts` - Template de recuperação de senha

---

## 🚀 Como Usar

### **Com Supabase (Atual)**

O Supabase envia emails automaticamente quando você chama:
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/recuperar-senha`,
});
```

O Supabase usa seu próprio template. Para usar este template, você precisaria de um serviço externo.

### **Com Resend (Recomendado para Customização)**

```typescript
import { Resend } from 'resend';
import { getPasswordResetEmailTemplate } from './email-templates/password-reset';

const resend = new Resend(process.env.RESEND_API_KEY);

const resetUrl = `${origin}/recuperar-senha?token=${token}`;
const html = getPasswordResetEmailTemplate(resetUrl, email);

await resend.emails.send({
  from: 'noreply@seudominio.com.br',
  to: email,
  subject: 'Redefinir sua senha - TEM VENDA',
  html: html,
});
```

---

## 🎨 Personalização

Edite `password-reset.ts` para personalizar:
- Cores
- Textos
- Layout
- Footer

---

## ✅ Características

- ✅ HTML válido e bem estruturado
- ✅ Responsivo (mobile e desktop)
- ✅ Otimizado para não cair em spam
- ✅ Compatível com todos os clientes de email
- ✅ Baseado em emails de big techs

