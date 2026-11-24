-- Desactiva únicamente la cuenta de muestra que conserva el hash distribuido.
UPDATE usuario SET activo = FALSE, auth_version = auth_version + 1, updated_at = now()
WHERE usuario = 'admin' AND activo AND password_hash = '$2a$10$mj.5ACt7xJMOMXma4Nc3F.W6fUL6eU9B3TviE4sajCahkUCRAhRdC';
