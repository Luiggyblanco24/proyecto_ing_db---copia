-- Galería pública SUTENS. Las imágenes cargadas por la API se guardan en BYTEA;
-- imagen_url permite conservar imágenes existentes alojadas externamente.
BEGIN;

CREATE TABLE IF NOT EXISTS galeria_sutens (
    id_foto      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion  VARCHAR(160) NOT NULL,
    imagen_url   TEXT,
    imagen       BYTEA,
    tipo_mime    VARCHAR(100),
    orden        INTEGER NOT NULL DEFAULT 0,
    id_usuario   BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_galeria_sutens_tipo_mime
        CHECK (tipo_mime IS NULL OR tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT ck_galeria_sutens_imagen
        CHECK ((imagen IS NOT NULL AND tipo_mime IS NOT NULL) OR imagen IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_galeria_sutens_orden
    ON galeria_sutens (orden, id_foto);

CREATE UNIQUE INDEX IF NOT EXISTS uq_galeria_sutens_imagen_url
    ON galeria_sutens (imagen_url)
    WHERE imagen_url IS NOT NULL;

INSERT INTO galeria_sutens (descripcion, imagen_url, orden)
VALUES
    ('Actividad sindical SUTENS 1', '/Actividades/1.jpg', 1),
    ('Actividad sindical SUTENS 2', '/Actividades/2.jpg', 2),
    ('Actividad sindical SUTENS 3', '/Actividades/3.jpg', 3),
    ('Actividad sindical SUTENS 4', '/Actividades/4.jpg', 4),
    ('Actividad sindical SUTENS 5', '/Actividades/5.jpg', 5),
    ('Actividad sindical SUTENS 6', '/Actividades/6.jpg', 6)
ON CONFLICT (imagen_url) WHERE imagen_url IS NOT NULL DO NOTHING;

COMMIT;