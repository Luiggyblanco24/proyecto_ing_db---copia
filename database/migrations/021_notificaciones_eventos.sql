BEGIN;

CREATE TABLE IF NOT EXISTS notificacion_evento (
    id_afiliado BIGINT      NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    id_evento   BIGINT      NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    leida_at    TIMESTAMPTZ,
    PRIMARY KEY (id_afiliado, id_evento)
);

CREATE INDEX IF NOT EXISTS idx_notificacion_evento_pendientes
    ON notificacion_evento (id_afiliado, created_at DESC)
    WHERE leida_at IS NULL;

COMMIT;
