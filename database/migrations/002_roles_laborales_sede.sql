-- Ejecutar después de 001_gestion_subdirectivas.sql en bases existentes.

UPDATE rol_laboral SET nombre = 'Psicoorientador' WHERE nombre = 'Psicólogo';
UPDATE rol_laboral SET nombre = 'Profesor' WHERE nombre = 'Docente';
UPDATE rol_laboral SET nombre = 'Profesor especial' WHERE nombre = 'Docente especial';
UPDATE rol_laboral SET nombre = 'Administrativos' WHERE nombre = 'Administrativo';

CREATE UNIQUE INDEX IF NOT EXISTS uq_afiliado_sede_unico_rol
    ON afiliado_sede (id_afiliado);

UPDATE afiliado a
SET estado_sindical = 'inactivo'
WHERE a.estado_sindical = 'activo'
    AND NOT EXISTS (
            SELECT 1
            FROM subdirectiva_afiliado sa
            JOIN afiliado_sede afs
                ON afs.id_afiliado = sa.id_afiliado AND afs.id_sede = sa.id_sede
            WHERE sa.id_afiliado = a.id_afiliado
    );