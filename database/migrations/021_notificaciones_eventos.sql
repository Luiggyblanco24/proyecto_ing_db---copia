BEGIN;

-- Notificaciones: se calculan según el alcance de cada afiliado; aquí solo se guardan las leídas.
CREATE TABLE IF NOT EXISTS evento_notificacion_leida (
    id_afiliado BIGINT      NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    id_evento   BIGINT      NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    leida_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_afiliado, id_evento)
);

-- Eliminación lógica de actividades, con responsable y fecha.
ALTER TABLE evento
    ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS id_usuario_eliminacion BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL;

DROP TABLE IF EXISTS notificacion_evento;

COMMIT;
