SELECT 
  id,
  email,
  token as token_completo,
  LEFT(token, 20) as token_start,
  RIGHT(token, 20) as token_end,
  LENGTH(token) as token_length,
  deleted_at,
  used_at,
  created_at,
  expires_at,
  CASE 
    WHEN token = 'iUjXoGLTOupiLgsoKHu3PHVAWQNxkfRZchpi3ojt0ECXuH81bxDhOzcowPrC20yi' THEN '✅ TOKEN CORRESPONDE EXATAMENTE'
    WHEN token LIKE 'iUjXoGLTOupiLgsoKHu3%' THEN '⚠️ TOKEN COMEÇA IGUAL MAS PODE SER DIFERENTE'
    ELSE '❌ TOKEN NÃO CORRESPONDE'
  END as token_match
FROM user_invites
WHERE email = 'volito8544@arugy.com'
  AND deleted_at IS NULL
  AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

SELECT 
  id,
  email,
  token,
  LEFT(token, 20) as token_start,
  RIGHT(token, 20) as token_end,
  LENGTH(token) as token_length,
  deleted_at,
  used_at,
  created_at,
  expires_at
FROM user_invites
WHERE token LIKE 'iUjXoGLTOupiLgsoKHu3%'
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

