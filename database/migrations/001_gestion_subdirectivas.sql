-- Ejecutar una vez sobre bases existentes con: psql -d sutens -f database/migrations/001_gestion_subdirectivas.sql

ALTER TABLE afiliado
    ADD COLUMN IF NOT EXISTS estado_sindical VARCHAR(10);

ALTER TABLE afiliado
    ALTER COLUMN estado_sindical SET DEFAULT 'inactivo';

UPDATE afiliado
SET estado_sindical = CASE WHEN estado = 'aprobado' THEN 'activo' ELSE 'inactivo' END
WHERE estado_sindical IS NULL;

UPDATE afiliado SET estado_sindical = 'inactivo'
WHERE estado <> 'aprobado' AND estado_sindical = 'activo';

ALTER TABLE afiliado
    ALTER COLUMN estado_sindical SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_afiliado_estado_sindical'
    ) THEN
        ALTER TABLE afiliado
            ADD CONSTRAINT ck_afiliado_estado_sindical
            CHECK (estado_sindical IN ('activo', 'inactivo'));
    END IF;
END $$;

ALTER TABLE cargo_sindical
    ADD COLUMN IF NOT EXISTS es_repetible BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE cargo_sindical SET es_repetible = TRUE WHERE nombre = 'Afiliado';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cargo_sindical_repetible
    ON cargo_sindical (id_cargo_sindical, es_repetible);

ALTER TABLE subdirectiva_afiliado
    ADD COLUMN IF NOT EXISTS id_sede BIGINT,
    ADD COLUMN IF NOT EXISTS es_repetible BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE subdirectiva_afiliado sa
SET es_repetible = cs.es_repetible
FROM cargo_sindical cs
WHERE cs.id_cargo_sindical = sa.id_cargo_sindical;

UPDATE subdirectiva_afiliado sa
SET id_sede = asignaciones.id_sede
FROM (
    SELECT sa0.id_afiliado, sa0.id_subdirectiva, MIN(afs.id_sede) AS id_sede
    FROM subdirectiva_afiliado sa0
    JOIN afiliado_sede afs ON afs.id_afiliado = sa0.id_afiliado
    JOIN sede s ON s.id_sede = afs.id_sede AND s.id_subdirectiva = sa0.id_subdirectiva
    GROUP BY sa0.id_afiliado, sa0.id_subdirectiva
    HAVING COUNT(DISTINCT afs.id_sede) = 1
) asignaciones
WHERE sa.id_afiliado = asignaciones.id_afiliado
  AND sa.id_subdirectiva = asignaciones.id_subdirectiva
  AND sa.id_sede IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sede_subdirectiva
    ON sede (id_sede, id_subdirectiva);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sede_nombre_subdirectiva
    ON sede (id_subdirectiva, nombre);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_subdirectiva_afiliado_sede'
    ) THEN
        ALTER TABLE subdirectiva_afiliado
            ADD CONSTRAINT fk_subdirectiva_afiliado_sede
            FOREIGN KEY (id_sede, id_subdirectiva)
            REFERENCES sede (id_sede, id_subdirectiva);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_subdirectiva_afiliado_cargo_repetible'
    ) THEN
        ALTER TABLE subdirectiva_afiliado
            ADD CONSTRAINT fk_subdirectiva_afiliado_cargo_repetible
            FOREIGN KEY (id_cargo_sindical, es_repetible)
            REFERENCES cargo_sindical (id_cargo_sindical, es_repetible);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subdirectiva_cargo_exclusivo
    ON subdirectiva_afiliado (id_subdirectiva, id_cargo_sindical)
    WHERE es_repetible = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subdirectiva_afiliado_unico
    ON subdirectiva_afiliado (id_afiliado);

INSERT INTO cargo_sindical (nombre, es_repetible)
VALUES ('Fiscal', FALSE)
ON CONFLICT (nombre) DO UPDATE SET es_repetible = FALSE;