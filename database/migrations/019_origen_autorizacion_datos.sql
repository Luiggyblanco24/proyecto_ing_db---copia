BEGIN;

ALTER TABLE autorizacion_datos_afiliado
    ADD COLUMN IF NOT EXISTS origen VARCHAR(24) NOT NULL DEFAULT 'registro_web',
    ADD COLUMN IF NOT EXISTS id_usuario_actor BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_autorizacion_origen'
          AND conrelid = 'autorizacion_datos_afiliado'::regclass
    ) THEN
        ALTER TABLE autorizacion_datos_afiliado
            ADD CONSTRAINT ck_autorizacion_origen
            CHECK (origen IN ('registro_web', 'registro_admin'));
    END IF;
END $$;

COMMIT;
