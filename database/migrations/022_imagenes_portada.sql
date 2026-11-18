BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'galeria_sutens'::regclass
          AND attname = 'clave_portada'
          AND NOT attisdropped
    ) THEN
        RETURN;
    END IF;

    ALTER TABLE galeria_sutens ADD COLUMN clave_portada TEXT UNIQUE;

    -- La misma URL puede publicarse en más de una ubicación de portada.
    DROP INDEX IF EXISTS uq_galeria_sutens_imagen_url;
    CREATE UNIQUE INDEX uq_galeria_sutens_imagen_url
        ON galeria_sutens (imagen_url)
        WHERE imagen_url IS NOT NULL AND clave_portada IS NULL;

    -- Conserva los cambios si se llegó a aplicar la versión inicial del editor.
    IF to_regclass('imagen_portada') IS NOT NULL THEN
        INSERT INTO galeria_sutens
            (clave_portada, descripcion, imagen_url, imagen, tipo_mime, id_usuario)
        SELECT clave, descripcion, imagen_url, imagen, tipo_mime, id_usuario
        FROM imagen_portada
        ON CONFLICT (clave_portada) DO NOTHING;
    END IF;
END
$$;

COMMIT;
