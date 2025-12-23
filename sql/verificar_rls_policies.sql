-- Script para verificar RLS (Row Level Security) policies no Supabase
-- Execute este script no SQL Editor do Supabase para verificar se todas as tabelas críticas têm RLS habilitado

-- 1. Verificar quais tabelas têm RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar policies existentes por tabela
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tabelas críticas que DEVEM ter RLS habilitado
-- Verificar se estas tabelas têm RLS:
-- - profiles
-- - stores
-- - networks (ou orgs)
-- - store_members
-- - user_invites
-- - zapi_config
-- - store_tasks
-- - metas_mensais (se existir)

-- 4. Verificar se há policies para SELECT, INSERT, UPDATE, DELETE
SELECT 
    tablename,
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as "SELECT Policies",
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as "INSERT Policies",
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as "UPDATE Policies",
    COUNT(*) FILTER (WHERE cmd = 'DELETE') as "DELETE Policies"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 5. Verificar se policies usam auth.uid() para isolamento por usuário
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%' 
        THEN 'Sim' 
        ELSE 'Não' 
    END as "Usa auth.uid()"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Verificar se policies filtram por network_id/store_id
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%network_id%' OR qual::text LIKE '%org_id%' OR qual::text LIKE '%store_id%'
        THEN 'Sim' 
        ELSE 'Não' 
    END as "Filtra por rede/loja"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

