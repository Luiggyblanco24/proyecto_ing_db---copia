-- Ejecutar con psql tras verificar la identidad del titular del radicado.
\set ON_ERROR_STOP on
\prompt 'Radicado verificado del primer administrador: ' radicado
BEGIN;
SELECT pg_advisory_xact_lock(781204);
SELECT set_config('sutens.radicado', :'radicado', true);
DO $$
DECLARE
  cuenta usuario%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol_sistema r USING (id_rol_sistema)
             JOIN usuario u USING (id_usuario)
             WHERE r.nombre = 'Administrador SUTENS' AND u.activo) THEN
    RAISE EXCEPTION 'Ya existe un administrador activo';
  END IF;
  SELECT u.* INTO STRICT cuenta FROM usuario u JOIN afiliado a USING (id_afiliado)
  WHERE a.radicado = current_setting('sutens.radicado') AND a.estado = 'pendiente' AND u.activo
  FOR UPDATE OF u, a;
  UPDATE afiliado SET estado = 'aprobado', fecha_aprobacion = now() WHERE id_afiliado = cuenta.id_afiliado;
  INSERT INTO auditoria_decision_afiliado (id_afiliado, id_usuario_actor, usuario_actor, estado_anterior, estado_nuevo)
  VALUES (cuenta.id_afiliado, NULL, 'Instalación SUTENS', 'pendiente', 'aprobado');
  INSERT INTO usuario_rol (id_usuario, id_rol_sistema)
  VALUES (cuenta.id_usuario, (SELECT id_rol_sistema FROM rol_sistema WHERE nombre = 'Administrador SUTENS'));
END $$;
COMMIT;
