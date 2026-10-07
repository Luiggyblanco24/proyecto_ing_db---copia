BEGIN;

ALTER TABLE documento
    ADD COLUMN IF NOT EXISTS es_publico BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_documento_resoluciones_publicas
    ON documento (fecha_publicacion DESC, id_documento DESC)
    WHERE es_publico = TRUE;

COMMIT;
