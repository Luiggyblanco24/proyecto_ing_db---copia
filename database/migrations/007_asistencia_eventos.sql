ALTER TABLE evento
    ADD COLUMN IF NOT EXISTS estado VARCHAR(15) NOT NULL DEFAULT 'programado',
    ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_evento_estado'
    ) THEN
        ALTER TABLE evento
            ADD CONSTRAINT ck_evento_estado
            CHECK (estado IN ('programado', 'realizado'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS evento_asistencia (
    id_evento      BIGINT NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    id_afiliado    BIGINT NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    confirmada     BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_evento, id_afiliado)
);