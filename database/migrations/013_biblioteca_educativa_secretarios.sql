BEGIN;

ALTER TABLE documento_educativo
    ALTER COLUMN id_materia DROP NOT NULL,
    ALTER COLUMN grado TYPE VARCHAR(30),
    ADD COLUMN IF NOT EXISTS tipo_recurso VARCHAR(30) NOT NULL DEFAULT 'guia';

ALTER TABLE documento_educativo
    DROP CONSTRAINT IF EXISTS ck_documento_educativo_tipo,
    DROP CONSTRAINT IF EXISTS ck_documento_educativo_clasificacion;

UPDATE documento_educativo
SET grado = 'Sin grado especificado'
WHERE tipo_recurso = 'guia' AND grado IS NULL;

ALTER TABLE documento_educativo
    ADD CONSTRAINT ck_documento_educativo_tipo
        CHECK (tipo_recurso IN ('guia', 'metodologia_apoyo')),
    ADD CONSTRAINT ck_documento_educativo_clasificacion
        CHECK (
            (tipo_recurso = 'guia' AND id_materia IS NOT NULL AND grado IS NOT NULL)
            OR (tipo_recurso = 'metodologia_apoyo' AND id_materia IS NULL AND grado IS NULL)
        );

DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'subdirectiva_afiliado'::regclass
          AND confrelid = 'cargo_sindical'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE subdirectiva_afiliado DROP CONSTRAINT %I', fk.conname);
    END LOOP;
END $$;

UPDATE cargo_sindical
SET es_repetible = TRUE
WHERE nombre = 'Secretario General';

UPDATE subdirectiva_afiliado sa
SET es_repetible = cs.es_repetible
FROM cargo_sindical cs
WHERE cs.id_cargo_sindical = sa.id_cargo_sindical
  AND cs.nombre = 'Secretario General'
  AND sa.es_repetible IS DISTINCT FROM cs.es_repetible;

ALTER TABLE subdirectiva_afiliado
    ADD CONSTRAINT fk_subdirectiva_afiliado_cargo_repetible
    FOREIGN KEY (id_cargo_sindical, es_repetible)
    REFERENCES cargo_sindical (id_cargo_sindical, es_repetible);

COMMIT;
