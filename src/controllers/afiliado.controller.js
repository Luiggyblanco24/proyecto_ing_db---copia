import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { pool, query } from '../config/db.js';
import { normalizarNombre } from '../utils/nombre.js';

// Lista de afiliados (con filtro opcional por estado). Solo Administrador.
export async function consultarAfiliados(req, idSubdirectiva = null) {
  const params = [];
  const condiciones = [];
  const condicionesAsignacion = [];
  let filtraAsignacion = false;
  if (idSubdirectiva) {
    params.push(idSubdirectiva);
    condicionesAsignacion.push(`sa0.id_subdirectiva = $${params.length}`);
    filtraAsignacion = true;
    condiciones.push("a.estado = 'aprobado'");
  } else if (req.query.id_subdirectiva) {
    params.push(req.query.id_subdirectiva);
    condicionesAsignacion.push(`sa0.id_subdirectiva = $${params.length}`);
    filtraAsignacion = true;
  }

  const busqueda = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (busqueda) {
    params.push(`%${busqueda}%`);
    condiciones.push(`(
      concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) ILIKE $${params.length}
      OR p.cedula ILIKE $${params.length}
    )`);
  }

  const { cargo, rol, estado, estado_sindical: estadoSindical } = req.query;
  if (typeof cargo === 'string' && cargo) {
    params.push(cargo);
    condicionesAsignacion.push(`cs0.nombre = $${params.length}`);
    filtraAsignacion = true;
  }
  if (typeof rol === 'string' && rol) {
    params.push(rol);
    condicionesAsignacion.push(`rl0.nombre = $${params.length}`);
    filtraAsignacion = true;
  }
  if (filtraAsignacion) condiciones.push('asignacion.id_subdirectiva IS NOT NULL');
  if (estado) {
    params.push(estado);
    condiciones.push(`a.estado = $${params.length}`);
  }
  if (['activo', 'inactivo'].includes(estadoSindical)) {
    params.push(estadoSindical);
    condiciones.push(`a.estado_sindical = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT a.id_afiliado, a.estado, a.estado_sindical, a.fecha_solicitud, a.fecha_aprobacion,
            p.nombre1, p.nombre2, p.apellido1, p.apellido2,
            p.cedula, p.correo, p.celular,
            u.usuario,
          COALESCE(array_agg(DISTINCT rs.nombre) FILTER (WHERE rs.nombre IS NOT NULL), '{}') AS roles,
          sd.id_subdirectiva, sd.nombre AS subdirectiva,
          i.id_institucion, i.nombre AS institucion,
          asignacion.id_sede, s.nombre AS sede,
            asignacion.id_cargo_sindical, cs.nombre AS cargo_sindical,
            rl.nombre AS rol_laboral, cargo_departamental.nombre AS cargo_departamental
     FROM afiliado a
     JOIN persona p ON p.id_persona = a.id_persona
     LEFT JOIN usuario u ON u.id_afiliado = a.id_afiliado
     LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
     LEFT JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
    LEFT JOIN LATERAL (
      SELECT sa0.id_subdirectiva, sa0.id_sede, sa0.id_cargo_sindical,
             sd0.nombre AS subdirectiva, sd0.es_principal,
             i0.id_institucion, i0.nombre AS institucion,
             s0.nombre AS sede, cs0.nombre AS cargo_sindical, rl0.nombre AS rol_laboral
      FROM subdirectiva_afiliado sa0
      JOIN subdirectiva sd0 ON sd0.id_subdirectiva = sa0.id_subdirectiva
      LEFT JOIN sede s0 ON s0.id_sede = sa0.id_sede AND s0.id_subdirectiva = sa0.id_subdirectiva
      LEFT JOIN institucion i0 ON i0.id_institucion = s0.id_institucion
      LEFT JOIN cargo_sindical cs0 ON cs0.id_cargo_sindical = sa0.id_cargo_sindical
      LEFT JOIN afiliado_sede afs0
        ON afs0.id_afiliado = sa0.id_afiliado AND afs0.id_sede = sa0.id_sede
      LEFT JOIN rol_laboral rl0 ON rl0.id_rol_laboral = afs0.id_rol_laboral
      WHERE sa0.id_afiliado = a.id_afiliado
        ${condicionesAsignacion.length ? `AND ${condicionesAsignacion.join(' AND ')}` : ''}
      ORDER BY sd0.es_principal, sa0.id_subdirectiva
      LIMIT 1
    ) asignacion ON TRUE
    LEFT JOIN subdirectiva sd ON sd.id_subdirectiva = asignacion.id_subdirectiva
    LEFT JOIN sede s ON s.id_sede = asignacion.id_sede
    LEFT JOIN institucion i ON i.id_institucion = s.id_institucion
    LEFT JOIN cargo_sindical cs ON cs.id_cargo_sindical = asignacion.id_cargo_sindical
    LEFT JOIN rol_laboral rl ON rl.nombre = asignacion.rol_laboral
    LEFT JOIN LATERAL (
      SELECT cs0.nombre
      FROM subdirectiva_afiliado sa0
      JOIN subdirectiva sd0 ON sd0.id_subdirectiva = sa0.id_subdirectiva AND sd0.es_principal = TRUE
      JOIN cargo_sindical cs0 ON cs0.id_cargo_sindical = sa0.id_cargo_sindical
      WHERE sa0.id_afiliado = a.id_afiliado
      ORDER BY sa0.id_subdirectiva
      LIMIT 1
    ) cargo_departamental ON TRUE
    ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     GROUP BY a.id_afiliado, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
          p.cedula, p.correo, p.celular, u.usuario,
          sd.id_subdirectiva, sd.nombre, i.id_institucion, i.nombre, asignacion.id_sede, s.nombre,
          asignacion.id_cargo_sindical, cs.nombre, rl.nombre, cargo_departamental.nombre
     ORDER BY
       CASE COALESCE(cargo_departamental.nombre, cs.nombre)
         WHEN 'Presidente General' THEN 1
         WHEN 'Presidente' THEN 1
         WHEN 'Vicepresidente General' THEN 2
         WHEN 'Vicepresidente' THEN 2
         WHEN 'Secretario General' THEN 3
         WHEN 'Secretario' THEN 3
         WHEN 'Tesorero General' THEN 4
         WHEN 'Tesorero' THEN 4
         WHEN 'Fiscal General' THEN 5
         WHEN 'Fiscal' THEN 5
         WHEN 'Afiliado' THEN 6
         ELSE 7
       END,
       sd.nombre NULLS LAST,
       p.apellido1,
       p.apellido2,
       p.nombre1,
       p.nombre2,
       a.fecha_solicitud DESC`,
    params
  );

  return rows;
}

export function validarFiltroSubdirectiva(req, res) {
  const idSubdirectiva = req.query.id_subdirectiva;
  if (idSubdirectiva === undefined || idSubdirectiva === '') return true;
  if (typeof idSubdirectiva === 'string' && /^[1-9]\d*$/.test(idSubdirectiva)) return true;
  res.status(400).json({ error: 'El filtro de subdirectiva no es válido' });
  return false;
}

export async function listarAfiliados(req, res) {
  if (!validarFiltroSubdirectiva(req, res)) return;
  const rows = await consultarAfiliados(req);
  return res.json(rows);
}

export async function listarRoles(req, res) {
  const { rows } = await query(
    'SELECT id_rol_sistema, nombre, descripcion FROM rol_sistema ORDER BY nombre',
    []
  );

  return res.json(rows);
}

export async function actualizarRoles(req, res) {
  const { id } = req.params;
  const roles = req.body?.roles;

  if (!/^\d+$/.test(id) || !Array.isArray(roles) || roles.some((rol) => typeof rol !== 'string' || !rol.trim())) {
    return res.status(400).json({ error: 'Se requiere un afiliado válido y una lista de roles' });
  }

  const nombresRoles = roles.map((rol) => rol.trim());
  if (new Set(nombresRoles).size !== nombresRoles.length) {
    return res.status(400).json({ error: 'La lista contiene roles duplicados' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(781204)');

    const { rows: usuarios } = await client.query(
      `SELECT u.id_usuario
       FROM afiliado a
       JOIN usuario u ON u.id_afiliado = a.id_afiliado
       WHERE a.id_afiliado = $1
       FOR UPDATE OF u`,
      [id]
    );

    if (usuarios.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const idUsuario = usuarios[0].id_usuario;
    if (String(idUsuario) === String(req.user.id_usuario)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No puedes modificar tus propios roles' });
    }

    const { rows: rolesEncontrados } = await client.query(
      'SELECT id_rol_sistema, nombre FROM rol_sistema WHERE nombre = ANY($1::text[])',
      [nombresRoles]
    );

    if (rolesEncontrados.length !== nombresRoles.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Uno o más roles no existen' });
    }

    const { rows: administradores } = await client.query(
      `SELECT rs.id_rol_sistema,
              COUNT(ur.id_usuario)::int AS total,
              COALESCE(BOOL_OR(ur.id_usuario = $1), false) AS asignado
       FROM rol_sistema rs
       LEFT JOIN usuario_rol ur ON ur.id_rol_sistema = rs.id_rol_sistema
       WHERE rs.nombre = 'Administrador SUTENS'
       GROUP BY rs.id_rol_sistema`,
      [idUsuario]
    );

    const administrador = administradores[0];
    const conservaAdministrador = administrador && rolesEncontrados.some(
      (rol) => rol.id_rol_sistema === administrador.id_rol_sistema
    );
    if (administrador?.asignado && !conservaAdministrador && administrador.total <= 1) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No se puede retirar el rol del último administrador' });
    }

    await client.query('DELETE FROM usuario_rol WHERE id_usuario = $1', [idUsuario]);
    if (rolesEncontrados.length > 0) {
      await client.query(
        `INSERT INTO usuario_rol (id_usuario, id_rol_sistema)
         SELECT $1, id_rol_sistema
         FROM unnest($2::smallint[]) AS seleccionados(id_rol_sistema)`,
        [idUsuario, rolesEncontrados.map((rol) => rol.id_rol_sistema)]
      );
    }

    await client.query('COMMIT');
    return res.json({
      mensaje: 'Roles actualizados',
      roles: rolesEncontrados.map((rol) => rol.nombre),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar los roles' });
  } finally {
    client.release();
  }
}

export async function eliminarAfiliado(req, res) {
  const { id } = req.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'El afiliado indicado no es válido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(781204)');

    const { rows: afiliados } = await client.query(
      `SELECT u.id_usuario
       FROM afiliado a
       LEFT JOIN usuario u ON u.id_afiliado = a.id_afiliado
       WHERE a.id_afiliado = $1
       FOR UPDATE OF a`,
      [id]
    );
    if (afiliados.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Afiliado no encontrado' });
    }

    const idUsuario = afiliados[0].id_usuario;
    if (String(idUsuario) === String(req.user.id_usuario)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    if (idUsuario) {
      const { rows: administradores } = await client.query(
        `SELECT COUNT(DISTINCT u.id_usuario)::int AS total,
                BOOL_OR(u.id_usuario = $1) AS es_administrador
         FROM usuario u
         JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
         JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
         WHERE rs.nombre = 'Administrador SUTENS'`,
        [idUsuario]
      );

      if (administradores[0].es_administrador && administradores[0].total <= 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'No se puede eliminar al último administrador' });
      }
    }

    await client.query('DELETE FROM afiliado WHERE id_afiliado = $1', [id]);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Afiliado eliminado permanentemente' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar el afiliado' });
  } finally {
    client.release();
  }
}

export async function restablecerContrasenaTemporal(req, res) {
  const { id } = req.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'El afiliado indicado no es válido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(781204)');
    const { rows: afiliados } = await client.query(
      `SELECT u.id_usuario
       FROM afiliado a
       JOIN usuario u ON u.id_afiliado = a.id_afiliado
       WHERE a.id_afiliado = $1
       FOR UPDATE OF u`,
      [id]
    );
    if (afiliados.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Afiliado con cuenta no encontrado' });
    }
    if (String(afiliados[0].id_usuario) === String(req.user.id_usuario)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Para cambiar tu propia contraseña, usa Mi cuenta' });
    }

    const contrasenaTemporal = randomBytes(9).toString('base64url');
    await client.query(
      `UPDATE usuario
       SET password_hash = $1, requiere_cambio_contrasena = TRUE,
           auth_version = auth_version + 1, updated_at = now()
       WHERE id_usuario = $2`,
      [bcrypt.hashSync(contrasenaTemporal, 10), afiliados[0].id_usuario]
    );
    await client.query('COMMIT');
    return res.json({
      mensaje: 'Contraseña temporal generada. Compártela con el afiliado de forma privada.',
      contrasenaTemporal,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  } finally {
    client.release();
  }
}

// Aprobar o rechazar una solicitud de afiliación (HU-07)
export async function cambiarEstado(req, res) {
  const { id } = req.params;
  const { estado } = req.body; // 'aprobado' | 'rechazado'

  if (!['aprobado', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa "aprobado" o "rechazado"' });
  }

  const fechaAprobacion = estado === 'aprobado' ? new Date() : null;
  const estadoSindical = 'inactivo';

  const { rows } = await query(
    `UPDATE afiliado
     SET estado = $1,
       fecha_aprobacion = $2,
       estado_sindical = $3
     WHERE id_afiliado = $4
     RETURNING id_afiliado, estado`,
    [estado, fechaAprobacion, estadoSindical, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Afiliado no encontrado' });
  }

  return res.json({ mensaje: `Solicitud ${estado}`, afiliado: rows[0] });
}

// Registro de usuario hecho por un Administrador (afiliado queda aprobado y con rol)
export async function registrarPorAdmin(req, res) {
  const {
    nombre1, nombre2, apellido1, apellido2,
    cedula, fecha_nacimiento, correo, celular,
    usuario, password, rol,
  } = req.body;

  if (!nombre1 || !apellido1 || !cedula || !correo || !usuario || !password || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const { rows } = await query(
      `WITH nueva_persona AS (
         INSERT INTO persona (nombre1, nombre2, apellido1, apellido2, cedula, fecha_nacimiento, correo, celular)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id_persona
       ),
       nuevo_afiliado AS (
         INSERT INTO afiliado (id_persona, estado, fecha_aprobacion, estado_sindical)
         SELECT id_persona, 'aprobado', now(), 'inactivo' FROM nueva_persona
         RETURNING id_afiliado
       ),
       nuevo_usuario AS (
         INSERT INTO usuario (id_afiliado, usuario, password_hash)
         SELECT id_afiliado, $9, $10 FROM nuevo_afiliado
         RETURNING id_usuario
       )
       INSERT INTO usuario_rol (id_usuario, id_rol_sistema)
       SELECT u.id_usuario, rs.id_rol_sistema
       FROM nuevo_usuario u, rol_sistema rs
       WHERE rs.nombre = $11
       RETURNING id_usuario`,
      [
        normalizarNombre(nombre1), nombre2 ? normalizarNombre(nombre2) : null,
        normalizarNombre(apellido1), apellido2 ? normalizarNombre(apellido2) : null,
        cedula, fecha_nacimiento || null, correo, celular || null,
        usuario, bcrypt.hashSync(password, 10), rol,
      ]
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado y aprobado',
      id_usuario: rows[0].id_usuario,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'La cédula, correo o usuario ya están registrados' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar el usuario' });
  }
}
