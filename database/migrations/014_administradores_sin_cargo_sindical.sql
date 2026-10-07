-- Los administradores conservan su rol de acceso, pero no ocupan cargos ni
-- afiliaciones sindicales por ese solo hecho.
BEGIN;

DELETE FROM afiliado_sede afs
USING usuario u
JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
WHERE afs.id_afiliado = u.id_afiliado
  AND rs.nombre = 'Administrador SUTENS';

DELETE FROM subdirectiva_afiliado sa
USING usuario u
JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
WHERE sa.id_afiliado = u.id_afiliado
  AND rs.nombre = 'Administrador SUTENS';

COMMIT;
