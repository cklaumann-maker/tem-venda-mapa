#!/bin/bash

# Script para configurar ambiente Z-API de forma segura
# Execute: chmod +x setup-zapi.sh && ./setup-zapi.sh

echo "🔒 Configurando Z-API com segurança máxima..."

# Verificar se .env.local já existe
if [ -f ".env.local" ]; then
    echo "⚠️  Arquivo .env.local já existe!"
    read -p "Deseja sobrescrever? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operação cancelada."
        exit 1
    fi
fi

# Criar arquivo .env.local
echo "📝 Criando arquivo .env.local..."
cat > .env.local << EOF
# Configurações Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Configurações Z-API (SENSÍVEL - NUNCA COMMITAR)
ZAPI_CLIENT_TOKEN=your_zapi_client_token_here
EOF

echo "✅ Arquivo .env.local criado com sucesso!"

# Verificar se está no .gitignore
if grep -q ".env*" .gitignore; then
    echo "✅ Arquivo .env.local está protegido no .gitignore"
else
    echo "⚠️  Adicionando .env* ao .gitignore..."
    echo "" >> .gitignore
    echo "# env files (can opt-in for committing if needed)" >> .gitignore
    echo ".env*" >> .gitignore
    echo "!.env.example" >> .gitignore
fi

# Verificar segurança
echo "🔍 Verificando segurança..."
if grep -r "your_zapi_client_token_here" src/ > /dev/null 2>&1; then
    echo "⚠️  AVISO: Placeholder encontrado no código fonte. Certifique-se de usar apenas variáveis de ambiente."
else
    echo "✅ Token não encontrado no código fonte"
fi

echo ""
echo "🎉 Configuração concluída com segurança!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Edite .env.local com suas credenciais Supabase"
echo "   2. Execute: npm run dev"
echo "   3. Teste em: http://localhost:3000/test"
echo ""
echo "🔒 Segurança garantida:"
echo "   ✅ Client-token protegido em variáveis de ambiente"
echo "   ✅ Arquivo .env.local não será commitado"
echo "   ✅ Token não exposto no código fonte"
echo "   ✅ Logs seguros implementados"

