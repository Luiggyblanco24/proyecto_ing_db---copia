-- ============================================================================
-- SUTENS - Datos semilla (catálogos base + ejemplos)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catálogos
-- ----------------------------------------------------------------------------

-- Roles de acceso (RBAC)
INSERT INTO rol_sistema (nombre, descripcion) VALUES
    ('Administrador SUTENS', 'Acceso total: panel, afiliados, subdirectivas, actas, eventos'),
    ('Afiliado',             'Acceso a su perfil, actas y eventos'),
    ('Público',              'Solo portal y formulario de afiliación');

-- Cargos sindicales
INSERT INTO cargo_sindical (nombre, es_repetible, es_departamental) VALUES
    ('Presidente', FALSE, FALSE), ('Vicepresidente', FALSE, FALSE), ('Tesorero', FALSE, FALSE),
    ('Secretario', FALSE, FALSE), ('Fiscal', FALSE, FALSE), ('Afiliado', TRUE, FALSE),
    ('Presidente General', FALSE, TRUE), ('Vicepresidente General', FALSE, TRUE),
    ('Secretario General', TRUE, TRUE), ('Fiscal General', FALSE, TRUE),
    ('Tesorero General', FALSE, TRUE);

-- Roles laborales
INSERT INTO rol_laboral (nombre) VALUES
    ('Rector'), ('Coordinador'), ('Psicoorientador'), ('Profesor'),
    ('Profesor especial'), ('Administrativos');

-- Tipos de documento
INSERT INTO tipo_documento (nombre) VALUES
    ('Sindical'), ('Educativo');

-- Categorías de documento sindical
INSERT INTO categoria (nombre) VALUES
    ('Acta'), ('Permiso'), ('Decreto'), ('Resolución'), ('Circular'), ('Comunicado');

-- Materias
INSERT INTO materia (nombre) VALUES
    ('Inglés'), ('Español'), ('Matemáticas'), ('Pedagogía'), ('Ciencias');

-- Subdirectivas, instituciones y sedes de ejemplo
INSERT INTO subdirectiva (nombre, es_principal) VALUES
    ('Directiva Departamental', TRUE),
    ('Subdirectiva Ocaña', FALSE),
    ('Subdirectiva Ábrego', FALSE);

INSERT INTO institucion (id_subdirectiva, nombre)
SELECT sd.id_subdirectiva, instituciones.nombre
FROM (VALUES
    ('Directiva Departamental', 'Institución Educativa Departamental'),
    ('Subdirectiva Ocaña', 'Institución Educativa Ocaña'),
    ('Subdirectiva Ocaña', 'Centro Educativo Ocaña'),
    ('Subdirectiva Ábrego', 'Institución Educativa Ábrego')
) AS instituciones(subdirectiva, nombre)
JOIN subdirectiva sd ON sd.nombre = instituciones.subdirectiva;

INSERT INTO sede (id_institucion, id_subdirectiva, nombre)
SELECT i.id_institucion, i.id_subdirectiva, sedes.nombre
FROM (VALUES
    ('Directiva Departamental', 'Institución Educativa Departamental', 'Sede Central'),
    ('Subdirectiva Ocaña', 'Institución Educativa Ocaña', 'Sede Ocaña Norte'),
    ('Subdirectiva Ocaña', 'Centro Educativo Ocaña', 'Sede Ocaña Sur'),
    ('Subdirectiva Ábrego', 'Institución Educativa Ábrego', 'Sede Ábrego')
) AS sedes(subdirectiva, institucion, nombre)
JOIN subdirectiva sd ON sd.nombre = sedes.subdirectiva
JOIN institucion i ON i.id_subdirectiva = sd.id_subdirectiva
                 AND i.nombre = sedes.institucion;

-- ----------------------------------------------------------------------------
-- Ejemplo: un administrador (persona -> afiliado -> usuario -> rol)
-- ----------------------------------------------------------------------------

INSERT INTO persona (nombre1, nombre2, apellido1, apellido2, cedula, fecha_nacimiento, correo, celular)
VALUES ('Ana', 'María', 'Pérez', 'López', '1090123456', '1985-04-12', 'ana.perez@sutens.org', '3001234567');

INSERT INTO afiliado (id_persona, estado, fecha_aprobacion, estado_sindical)
VALUES (1, 'aprobado', now(), 'activo');

-- Contraseña: "admin123" (hash bcrypt generado; cámbialo con tu propio bcrypt)
INSERT INTO usuario (id_afiliado, usuario, password_hash)
VALUES (1, 'admin', '$2a$10$mj.5ACt7xJMOMXma4Nc3F.W6fUL6eU9B3TviE4sajCahkUCRAhRdC');

INSERT INTO usuario_rol (id_usuario, id_rol_sistema)
VALUES (1, 1);  -- Administrador SUTENS

-- ----------------------------------------------------------------------------
-- Ejemplo: un documento sindical y uno educativo
-- ----------------------------------------------------------------------------

INSERT INTO documento (titulo, descripcion, id_tipo_documento, id_afiliado, id_subdirectiva)
VALUES ('Acta de asamblea general 2026', 'Acta de la asamblea ordinaria de docentes.', 1, 1, 1);

INSERT INTO documento_sindical (id_documento, id_categoria)
VALUES (1, 1);  -- Acta

INSERT INTO documento (titulo, descripcion, id_tipo_documento, id_afiliado, id_subdirectiva)
VALUES ('Guía de matemáticas grado 10', 'Material de apoyo para docentes.', 2, 1, 2);

INSERT INTO documento_educativo (id_documento, id_materia, grado)
VALUES (2, 3, '10');

-- ----------------------------------------------------------------------------
-- Ejemplo: un evento
-- ----------------------------------------------------------------------------

INSERT INTO evento (titulo, descripcion, fecha_inicio, fecha_fin, lugar, id_subdirectiva, id_usuario)
VALUES ('Asamblea de docentes', 'Asamblea ordinaria del sindicato.',
        '2026-10-15 09:00:00-05', '2026-10-15 12:00:00-05', 'Auditorio Central', 1, 1);

INSERT INTO galeria_sutens (descripcion, imagen_url, orden) VALUES
    ('Actividad sindical SUTENS 1', '/Actividades/1.jpg', 1),
    ('Actividad sindical SUTENS 2', '/Actividades/2.jpg', 2),
    ('Actividad sindical SUTENS 3', '/Actividades/3.jpg', 3),
    ('Actividad sindical SUTENS 4', '/Actividades/4.jpg', 4),
    ('Actividad sindical SUTENS 5', '/Actividades/5.jpg', 5),
    ('Actividad sindical SUTENS 6', '/Actividades/6.jpg', 6);
