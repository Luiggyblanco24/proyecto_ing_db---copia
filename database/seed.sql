-- ============================================================================
-- SUTENS - Datos semilla (catálogos base y galería)
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

INSERT INTO galeria_sutens (descripcion, imagen_url, orden) VALUES
    ('Actividad sindical SUTENS 1', '/Actividades/1.jpg', 1),
    ('Actividad sindical SUTENS 2', '/Actividades/2.jpg', 2),
    ('Actividad sindical SUTENS 3', '/Actividades/3.jpg', 3),
    ('Actividad sindical SUTENS 4', '/Actividades/4.jpg', 4),
    ('Actividad sindical SUTENS 5', '/Actividades/5.jpg', 5),
    ('Actividad sindical SUTENS 6', '/Actividades/6.jpg', 6);
