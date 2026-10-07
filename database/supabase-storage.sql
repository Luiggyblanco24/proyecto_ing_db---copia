-- Buckets para los archivos administrados por el backend.
-- Las fotos de perfil son públicas; los documentos requieren autorización de la API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('sutens-public', 'sutens-public', TRUE, 4194304,
    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('sutens-private', 'sutens-private', FALSE, 20971520,
    ARRAY['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
