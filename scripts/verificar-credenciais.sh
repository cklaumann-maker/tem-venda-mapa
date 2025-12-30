#!/bin/bash

# Script para verificar se há credenciais expostas no histórico do Git
# Uso: ./scripts/verificar-credenciais.sh

echo "🔍 Verificando histórico Git por possíveis credenciais expostas..."
echo ""

# Padrões comuns de credenciais
PATTERNS=(
    "SUPABASE_SERVICE_ROLE_KEY"
    "ZAPI_CLIENT_TOKEN"
    "CRON_SECRET"
    "api[_-]?key.*="
    "secret.*="
    "password.*="
    "token.*="
    "eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+"  # JWT tokens
    "[a-zA-Z0-9]{32,}"  # Possíveis chaves longas
)

# Cores para output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

found_issues=0

echo "⚠️  ATENÇÃO: Este script verifica padrões comuns, mas pode dar falsos positivos."
echo "   Revise manualmente qualquer resultado encontrado."
echo ""
echo "Verificando arquivos no repositório atual..."
echo ""

# Verificar arquivos atuais (não commitados)
for pattern in "${PATTERNS[@]}"; do
    if git grep -i -E "$pattern" -- ':!scripts/verificar-credenciais.sh' ':!docs/SEGURANCA_REPOSITORIO_PUBLICO.md' 2>/dev/null | grep -v "your_" | grep -v "example" | grep -v "placeholder"; then
        echo -e "${YELLOW}⚠️  Padrão encontrado: $pattern${NC}"
        git grep -i -E "$pattern" -- ':!scripts/verificar-credenciais.sh' ':!docs/SEGURANCA_REPOSITORIO_PUBLICO.md' 2>/dev/null | grep -v "your_" | grep -v "example" | grep -v "placeholder"
        found_issues=$((found_issues + 1))
        echo ""
    fi
done

echo "Verificando histórico Git (últimos 50 commits)..."
echo ""

# Verificar histórico Git
for pattern in "${PATTERNS[@]}"; do
    matches=$(git log --all --source -p -S "$pattern" --pretty=format:"%H %s" --date=short -50 2>/dev/null | grep -v "your_" | grep -v "example" | grep -v "placeholder" | head -10)
    if [ ! -z "$matches" ]; then
        echo -e "${YELLOW}⚠️  Padrão encontrado no histórico: $pattern${NC}"
        echo "$matches"
        found_issues=$((found_issues + 1))
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $found_issues -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum padrão suspeito encontrado nos arquivos atuais.${NC}"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Este script não garante 100% de segurança"
    echo "   - Considere usar ferramentas especializadas como 'truffleHog' ou 'git-secrets'"
    echo "   - Revise manualmente commits recentes"
    echo "   - Se encontrar credenciais expostas, ROTE-as imediatamente"
else
    echo -e "${RED}⚠️  $found_issues padrão(ões) suspeito(s) encontrado(s)!${NC}"
    echo ""
    echo "🔴 AÇÃO NECESSÁRIA:"
    echo "   1. Revise cada resultado manualmente"
    echo "   2. Se forem credenciais reais, ROTE-as IMEDIATAMENTE"
    echo "   3. Remova-as do código e do histórico (se necessário)"
    echo "   4. Nunca faça commit de credenciais novamente"
fi

echo ""
echo "💡 Dica: Para uma verificação mais completa, instale e use:"
echo "   - truffleHog: pip install truffleHog"
echo "   - git-secrets: https://github.com/awslabs/git-secrets"
echo ""

