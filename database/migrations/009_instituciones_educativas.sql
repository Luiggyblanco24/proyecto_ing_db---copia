-- Ejecutar una vez sobre bases existentes para organizar las sedes por institución.
BEGIN;

CREATE TABLE institucion (
    id_institucion  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_subdirectiva BIGINT       NOT NULL
                        REFERENCES subdirectiva(id_subdirectiva) ON DELETE CASCADE,
    nombre          VARCHAR(150) NOT NULL,
    CONSTRAINT uq_institucion_subdirectiva UNIQUE (id_institucion, id_subdirectiva),
    CONSTRAINT uq_institucion_nombre_subdirectiva UNIQUE (id_subdirectiva, nombre)
);

INSERT INTO institucion (id_subdirectiva, nombre)
SELECT DISTINCT s.id_subdirectiva, 'Institución por clasificar'
FROM sede s
ON CONFLICT (id_subdirectiva, nombre) DO NOTHING;

ALTER TABLE sede ADD COLUMN id_institucion BIGINT;

UPDATE sede s
SET id_institucion = i.id_institucion
FROM institucion i
WHERE i.id_subdirectiva = s.id_subdirectiva
  AND i.nombre = 'Institución por clasificar';

ALTER TABLE sede ALTER COLUMN id_institucion SET NOT NULL;

ALTER TABLE sede DROP CONSTRAINT IF EXISTS uq_sede_nombre_subdirectiva;
DROP INDEX IF EXISTS uq_sede_nombre_subdirectiva;

ALTER TABLE sede
    ADD CONSTRAINT uq_sede_nombre_institucion UNIQUE (id_institucion, nombre),
    ADD CONSTRAINT fk_sede_institucion_subdirectiva
        FOREIGN KEY (id_institucion, id_subdirectiva)
        REFERENCES institucion(id_institucion, id_subdirectiva) ON DELETE CASCADE;

COMMIT;
