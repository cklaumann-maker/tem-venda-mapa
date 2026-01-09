# Modelo de Mensagem - Lembrete de Formulário

## Versão 1: Lembrete Simples e Amigável (Recomendada)

```
*📋 Lembrete: Formulário*

Olá equipe! 👋

Lembrando que temos o formulário para preencher hoje.

Tenham um ótimo dia! 😊
```

## Versão 2: Lembrete Direto e Gentil

```
*⏰ Lembrete diário*

Equipe, lembrando do formulário de hoje.

Qualquer coisa, estamos aqui! 🤝
```

## Versão 3: Lembrete Casual

```
*📋 Formulário de hoje*

Olá equipe! 

Só lembrando do formulário. 

Valeu! 🙏
```

## Versão 4: Lembrete Informativo

```
*📋 Lembrete*

Bom dia, equipe! ☀️

Lembrando que hoje temos o formulário para preencher.

Bom trabalho! 💪
```

## Versão 5: Lembrete Ultra Curto

```
*📋 Lembrete*

Equipe, formulário de hoje.

Obrigado! 🙏
```

---

## Instruções de Uso no n8n

1. **Copie uma das versões acima** (recomendado: Versão 1)
2. **No nó HTTP Request**, use o campo `message` com o texto escolhido
3. **Use `\n` para quebras de linha** no JSON
4. **Ajuste o texto** conforme necessário para seu contexto específico

### Exemplo de JSON para n8n (Versão 1):

```json
{
  "phone": "5511999999999",
  "message": "*📋 Lembrete: Formulário*\n\nOlá equipe! 👋\n\nLembrando que temos o formulário para preencher hoje.\n\nTenham um ótimo dia! 😊"
}
```

## Personalização

Você pode personalizar:
- Nome do formulário
- Link do formulário
- Horário específico
- Adicionar mais detalhes sobre as tarefas
