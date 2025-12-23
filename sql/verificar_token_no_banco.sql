SELECT 
  id,
  email,
  LEFT(token, 20) as token_start,
  RIGHT(token, 20) as token_end,
  LENGTH(token) as token_length,
  deleted_at,
  used_at,
  created_at,
  expires_at
FROM user_invites
WHERE email = 'seu_email_aqui@exemplo.com'
  AND deleted_at IS NULL
  AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

SELECT 
  id,
  email,
  LEFT(token, 20) as token_start,
  RIGHT(token, 20) as token_end,
  LENGTH(token) as token_length,
  deleted_at,
  used_at,
  created_at,
  expires_at
FROM user_invites
WHERE token LIKE 'prefixo_token_aqui%'
ORDER BY created_at DESC;

SELECT 
  COUNT(*) as total_convites,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as convites_ativos,
  COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as convites_usados,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as convites_deletados
FROM user_invites;

SELECT 
  id,
  email,
  LEFT(token, 20) as token_start,
  LENGTH(token) as token_length,
  deleted_at,
  used_at,
  created_at
FROM user_invites
ORDER BY created_at DESC
LIMIT 10;

