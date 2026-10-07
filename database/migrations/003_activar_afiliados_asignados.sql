-- Ejecutar después de 002_roles_laborales_sede.sql en bases existentes.

UPDATE afiliado a
SET estado_sindical = 'activo'
WHERE a.estado = 'aprobado'
  AND EXISTS (
      SELECT 1
      FROM subdirectiva_afiliado sa
      JOIN afiliado_sede afs
        ON afs.id_afiliado = sa.id_afiliado AND afs.id_sede = sa.id_sede
      WHERE sa.id_afiliado = a.id_afiliado
  );