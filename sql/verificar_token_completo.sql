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
WHERE email = 'volito8544@arugy.com'
  AND deleted_at IS NULL
  AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

