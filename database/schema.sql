-- ============================================================================
-- SUTENS - Esquema de base de datos (PostgreSQL)
-- Sindicato Unitario de Trabajadores de la Educación de Norte de Santander
-- ----------------------------------------------------------------------------
-- Versión corregida del DER original. Cambios principales:
--   1. RBAC separado: rol_sistema (acceso) vs rol_laboral (cargo docente).
--   2. Modelo documental simplificado: se elimina "biblioteca"; documento
--      apunta directo a tipo_documento.
--   3. Tablas nuevas: evento (calendario) y estado en afiliado (aprobación).
--   4. Cardinalidades claras: persona 1:1 afiliado, afiliado 1:1 usuario.
--   5. Nombres corregidos (cargo_sindical, comunicado, documento_educativo).
-- ============================================================================

-- Extensiones útiles (gen_random_uuid, crypt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PERSONAS Y AFILIADOS
-- ============================================================================

CREATE TABLE persona (
    id_persona       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre1          VARCHAR(50)  NOT NULL,
    nombre2          VARCHAR(50),
    apellido1        VARCHAR(50)  NOT NULL,
    apellido2        VARCHAR(50),
    cedula           VARCHAR(20)  NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    correo           VARCHAR(120) NOT NULL UNIQUE,
    celular          VARCHAR(20),
    foto_perfil_url  VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE afiliado (
    id_afiliado      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_persona       BIGINT       NOT NULL UNIQUE
                        REFERENCES persona(id_persona) ON DELETE CASCADE,
    -- Estado del proceso de afiliación (panel de aprobación, HU-07)
    estado           VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    estado_sindical  VARCHAR(10)  NOT NULL DEFAULT 'inactivo',
    fecha_solicitud  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_aprobacion TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_afiliado_estado
        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'retirado')),
    CONSTRAINT ck_afiliado_estado_sindical
        CHECK (estado_sindical IN ('activo', 'inactivo'))
);

-- ============================================================================
-- 2. USUARIOS Y RBAC (Control de Acceso Basado en Roles)
-- ============================================================================

CREATE TABLE usuario (
    id_usuario    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_afiliado   BIGINT       NOT NULL UNIQUE
                     REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    usuario       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- hash bcrypt
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Roles de ACCESO al sistema (RBAC), independientes del cargo laboral.
CREATE TABLE rol_sistema (
    id_rol_sistema SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE,
    descripcion     VARCHAR(255)
);

-- N:M usuario <-> rol_sistema
CREATE TABLE usuario_rol (
    id_usuario     BIGINT   NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_rol_sistema SMALLINT NOT NULL REFERENCES rol_sistema(id_rol_sistema) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol_sistema)
);

-- ============================================================================
-- 3. ESTRUCTURA ORGANIZACIONAL (subdirectivas, instituciones, sedes, cargos)
-- ============================================================================

CREATE TABLE subdirectiva (
    id_subdirectiva BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    es_principal    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_subdirectiva_principal
    ON subdirectiva (es_principal)
    WHERE es_principal = TRUE;

CREATE TABLE institucion (
    id_institucion  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_subdirectiva BIGINT       NOT NULL
                        REFERENCES subdirectiva(id_subdirectiva) ON DELETE CASCADE,
    nombre          VARCHAR(150) NOT NULL,
    CONSTRAINT uq_institucion_subdirectiva UNIQUE (id_institucion, id_subdirectiva),
    CONSTRAINT uq_institucion_nombre_subdirectiva UNIQUE (id_subdirectiva, nombre)
);

CREATE TABLE sede (
    id_sede         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_institucion  BIGINT       NOT NULL,
    id_subdirectiva BIGINT       NOT NULL
                        REFERENCES subdirectiva(id_subdirectiva) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    CONSTRAINT uq_sede_subdirectiva UNIQUE (id_sede, id_subdirectiva),
    CONSTRAINT uq_sede_nombre_institucion UNIQUE (id_institucion, nombre),
    CONSTRAINT fk_sede_institucion_subdirectiva
        FOREIGN KEY (id_institucion, id_subdirectiva)
        REFERENCES institucion(id_institucion, id_subdirectiva) ON DELETE CASCADE
);

-- Cargo SINDICAL (Presidente, Vicepresidente, Secretario, Tesorero, Afiliado)
CREATE TABLE cargo_sindical (
    id_cargo_sindical SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL UNIQUE,
    es_repetible      BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_cargo_sindical_repetible UNIQUE (id_cargo_sindical, es_repetible)
);

-- Rol LABORAL en la sede (independiente del cargo sindical)
CREATE TABLE rol_laboral (
    id_rol_laboral SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(50) NOT NULL UNIQUE
);

-- Afiliado <-> subdirectiva (cargo sindical dentro de una subdirectiva)
CREATE TABLE subdirectiva_afiliado (
    id_afiliado       BIGINT   NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    id_subdirectiva   BIGINT   NOT NULL REFERENCES subdirectiva(id_subdirectiva) ON DELETE CASCADE,
    id_cargo_sindical SMALLINT REFERENCES cargo_sindical(id_cargo_sindical),
    id_sede           BIGINT,
    es_repetible      BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_afiliado, id_subdirectiva),
    FOREIGN KEY (id_sede, id_subdirectiva)
        REFERENCES sede(id_sede, id_subdirectiva),
    FOREIGN KEY (id_cargo_sindical, es_repetible)
        REFERENCES cargo_sindical(id_cargo_sindical, es_repetible)
);

CREATE UNIQUE INDEX uq_subdirectiva_cargo_exclusivo
    ON subdirectiva_afiliado (id_subdirectiva, id_cargo_sindical)
    WHERE es_repetible = FALSE;

-- Afiliado <-> sede (rol laboral dentro de una sede)
CREATE TABLE afiliado_sede (
    id_afiliado    BIGINT   NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    id_sede        BIGINT   NOT NULL REFERENCES sede(id_sede) ON DELETE CASCADE,
    id_rol_laboral SMALLINT NOT NULL REFERENCES rol_laboral(id_rol_laboral),
    PRIMARY KEY (id_afiliado, id_sede, id_rol_laboral)
);

CREATE UNIQUE INDEX uq_afiliado_sede_unico_rol
    ON afiliado_sede (id_afiliado);

-- ============================================================================
-- 4. GESTIÓN DOCUMENTAL (biblioteca de actas, comunicados, material educativo)
-- ============================================================================

CREATE TABLE tipo_documento (
    id_tipo_documento SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE categoria (
    id_categoria SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE materia (
    id_materia SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     VARCHAR(50) NOT NULL UNIQUE
);

-- Documento base (superclase de documento_sindical y documento_educativo)
CREATE TABLE documento (
    id_documento      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo            VARCHAR(200) NOT NULL,
    descripcion       TEXT,
    fecha_publicacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    id_tipo_documento SMALLINT     NOT NULL
                          REFERENCES tipo_documento(id_tipo_documento),
    id_afiliado       BIGINT       REFERENCES afiliado(id_afiliado) ON DELETE SET NULL,
    id_subdirectiva   BIGINT       REFERENCES subdirectiva(id_subdirectiva) ON DELETE SET NULL,
    archivo_url       VARCHAR(255),          -- ruta/URL del archivo adjunto
    es_publico        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Subclase: documento sindical (acta, permiso, decreto, resolución, circular, comunicado)
CREATE TABLE documento_sindical (
    id_documento_sindical BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_documento          BIGINT   NOT NULL UNIQUE
                              REFERENCES documento(id_documento) ON DELETE CASCADE,
    id_categoria          SMALLINT NOT NULL REFERENCES categoria(id_categoria)
);

-- Subclase: documento educativo (material por materia y grado)
CREATE TABLE documento_educativo (
    id_documento_educativo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_documento           BIGINT       NOT NULL UNIQUE
                               REFERENCES documento(id_documento) ON DELETE CASCADE,
    tipo_recurso           VARCHAR(30)  NOT NULL DEFAULT 'guia',
    id_materia             SMALLINT     REFERENCES materia(id_materia),
    grado                  VARCHAR(30),
    CONSTRAINT ck_documento_educativo_tipo
        CHECK (tipo_recurso IN ('guia', 'metodologia_apoyo')),
    CONSTRAINT ck_documento_educativo_clasificacion
        CHECK (
            (tipo_recurso = 'guia' AND id_materia IS NOT NULL AND grado IS NOT NULL)
            OR (tipo_recurso = 'metodologia_apoyo' AND id_materia IS NULL AND grado IS NULL)
        )
);

-- Galería pública del sindicato (las imágenes cargadas por la API se guardan en BYTEA)
CREATE TABLE galeria_sutens (
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

CREATE INDEX idx_galeria_sutens_orden
    ON galeria_sutens (orden, id_foto);

CREATE UNIQUE INDEX uq_galeria_sutens_imagen_url
    ON galeria_sutens (imagen_url)
    WHERE imagen_url IS NOT NULL;

-- ============================================================================
-- 5. EVENTOS (calendario de asambleas y eventos sindicales)
-- ============================================================================

CREATE TABLE evento (
    id_evento       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(30) NOT NULL DEFAULT 'Actividad',
    estado          VARCHAR(15) NOT NULL DEFAULT 'programado',
    descripcion     TEXT,
    fecha_inicio    TIMESTAMPTZ  NOT NULL,
    fecha_fin       TIMESTAMPTZ,
    lugar           VARCHAR(200),
    completado_at   TIMESTAMPTZ,
    cancelado_at    TIMESTAMPTZ,
    motivo_cancelacion TEXT,
    id_subdirectiva BIGINT       REFERENCES subdirectiva(id_subdirectiva) ON DELETE SET NULL,
    id_usuario      BIGINT       REFERENCES usuario(id_usuario) ON DELETE SET NULL,  -- creador
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_evento_estado CHECK (estado IN ('programado', 'realizado', 'cancelado'))
);

CREATE TABLE evento_asistencia (
    id_evento      BIGINT NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
    id_afiliado    BIGINT NOT NULL REFERENCES afiliado(id_afiliado) ON DELETE CASCADE,
    confirmada     BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_evento, id_afiliado)
);

-- ============================================================================
-- ÍNDICES para consultas frecuentes
-- ============================================================================

CREATE INDEX idx_afiliado_estado      ON afiliado(estado);
CREATE INDEX idx_sede_subdirectiva    ON sede(id_subdirectiva);
CREATE INDEX idx_documento_tipo       ON documento(id_tipo_documento);
CREATE INDEX idx_documento_subdir     ON documento(id_subdirectiva);
CREATE INDEX idx_evento_fecha_inicio  ON evento(fecha_inicio);
CREATE INDEX idx_usuario_rol_usuario  ON usuario_rol(id_usuario);
