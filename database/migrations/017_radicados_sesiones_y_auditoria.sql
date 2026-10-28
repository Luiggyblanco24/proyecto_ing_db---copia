BEGIN;

CREATE SEQUENCE IF NOT EXISTS afiliado_radicado_seq;

ALTER TABLE afiliado
    ADD COLUMN IF NOT EXISTS radicado VARCHAR(24);

UPDATE afiliado
SET radicado = 'SUTENS-' || lpad(nextval('afiliado_radicado_seq')::text, 8, '0')
WHERE radicado IS NULL;

ALTER TABLE afiliado
    ALTER COLUMN radicado SET DEFAULT ('SUTENS-' || lpad(nextval('afiliado_radicado_seq')::text, 8, '0')),
    ALTER COLUMN radicado SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_afiliado_radicado
    ON afiliado (radicado);

CREATE TABLE IF NOT EXISTS sesion_usuario (
    id_sesion           UUID PRIMARY KEY,
    id_usuario          BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    auth_version        INTEGER NOT NULL,
    ultima_actividad_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_at           TIMESTAMPTZ NOT NULL,
    revocada_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_sesion_expiracion CHECK (expira_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_sesion_usuario_vigente
    ON sesion_usuario (id_usuario, expira_at)
    WHERE revocada_at IS NULL;

CREATE TABLE IF NOT EXISTS auditoria_decision_afiliado (
    id_auditoria       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_afiliado        BIGINT NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE RESTRICT,
    id_usuario_actor   BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    usuario_actor      VARCHAR(50) NOT NULL,
    estado_anterior    VARCHAR(20) NOT NULL,
    estado_nuevo       VARCHAR(20) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_auditoria_estado_anterior CHECK (estado_anterior = 'pendiente'),
    CONSTRAINT ck_auditoria_estado_nuevo CHECK (estado_nuevo IN ('aprobado', 'rechazado'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_decision_afiliado_fecha
    ON auditoria_decision_afiliado (id_afiliado, created_at DESC);

COMMIT;
