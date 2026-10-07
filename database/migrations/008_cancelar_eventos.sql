ALTER TABLE evento
    ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

ALTER TABLE evento DROP CONSTRAINT IF EXISTS ck_evento_estado;

ALTER TABLE evento
    ADD CONSTRAINT ck_evento_estado
    CHECK (estado IN ('programado', 'realizado', 'cancelado'));