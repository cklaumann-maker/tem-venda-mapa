/**
 * Script para criar usuários administradores no Supabase
 * Execute este script após configurar as variáveis de ambiente
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Necessário para criar usuários via API

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

// Cliente admin do Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const adminUsers = [
  {
    email: 'cesar@temvenda.com.br',
    password: 'admin',
    name: 'César - Admin TEM VENDA'
  },
  {
    email: 'davi@temvenda.com.br', 
    password: 'admin',
    name: 'Davi - Admin TEM VENDA'
  }
]

async function createAdminUsers() {
  console.log('🚀 Iniciando criação de usuários administradores...\n')

  for (const user of adminUsers) {
    try {
      console.log(`📧 Criando usuário: ${user.email}`)
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Confirma email automaticamente
        user_metadata: {
          name: user.name,
          role: 'admin'
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  Usuário ${user.email} já existe`)
        } else {
          console.error(`❌ Erro ao criar ${user.email}:`, error.message)
        }
      } else {
        console.log(`✅ Usuário ${user.email} criado com sucesso!`)
        console.log(`   ID: ${data.user?.id}`)
      }
    } catch (err) {
      console.error(`❌ Erro inesperado ao criar ${user.email}:`, err)
    }
    
    console.log('') // Linha em branco para separar
  }

  console.log('🎉 Processo concluído!')
  console.log('\n📋 Credenciais de acesso:')
  adminUsers.forEach(user => {
    console.log(`   Email: ${user.email}`)
    console.log(`   Senha: ${user.password}`)
    console.log('')
  })
  
  console.log('🔒 IMPORTANTE: Altere essas senhas após o primeiro login!')
}

// Executa o script
createAdminUsers().catch(console.error)
