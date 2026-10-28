BEGIN;

CREATE TABLE IF NOT EXISTS autorizacion_datos_afiliado (
    id_autorizacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_afiliado     BIGINT NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE RESTRICT,
    version_aviso   VARCHAR(40) NOT NULL,
    texto_aviso     TEXT NOT NULL,
    aceptada_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_autorizacion_afiliado_version UNIQUE (id_afiliado, version_aviso)
);

COMMIT;
