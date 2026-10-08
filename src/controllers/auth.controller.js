import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { pool, query } from '../config/db.js';
import { normalizarNombre } from '../utils/nombre.js';
import {
  eliminarObjetoStorage,
  rutaObjetoFotoPerfil,
  subirObjetoStorage,
  urlFotoPerfil,
  urlPublicaStorage,
} from '../services/supabase-storage.service.js';

function detectarTipoImagen(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function eliminarFotoAnterior(url) {
  const ruta = rutaObjetoFotoPerfil(url);
  if (!ruta) return;
  try {
    await eliminarObjetoStorage('publico', ruta);
  } catch (error) {
    if (error.code !== 'STORAGE_OBJECT_NOT_FOUND') throw error;
  }
}

// Registro público de afiliación (crea persona + afiliado en estado "pendiente")
export async function registrar(req, res) {
  const {
    nombre1, nombre2, apellido1, apellido2,
    cedula, fecha_nacimiento, correo, celular,
    usuario, password,
  } = req.body;
  const primerNombre = typeof nombre1 === 'string' ? nombre1.trim() : '';
  const primerApellido = typeof apellido1 === 'string' ? apellido1.trim() : '';
  const correoNormalizado = typeof correo === 'string' ? correo.trim().toLocaleLowerCase('es') : '';
  const usuarioNormalizado = typeof usuario === 'string' ? usuario.trim() : '';
  const cedulaNormalizada = typeof cedula === 'string' ? cedula.trim() : '';
  const celularNormalizado = typeof celular === 'string' ? celular.trim() : '';

  if (!primerNombre || !primerApellido || !cedulaNormalizada || !correoNormalizado || !usuarioNormalizado || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado) || correoNormalizado.length > 120) {
    return res.status(400).json({ error: 'Escribe un correo válido de máximo 120 caracteres' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres y máximo 72 bytes' });
  }
  if (
    usuarioNormalizado.length > 50 || cedulaNormalizada.length > 20 ||
    primerNombre.length > 50 || primerApellido.length > 50 ||
    (typeof nombre2 === 'string' && nombre2.trim().length > 50) ||
    (typeof apellido2 === 'string' && apellido2.trim().length > 50) ||
    celularNormalizado.length > 20
  ) {
    return res.status(400).json({ error: 'Revisa la longitud de los nombres, apellidos, cédula, usuario o celular' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: roles } = await client.query(
      "SELECT id_rol_sistema FROM rol_sistema WHERE nombre = 'Afiliado'"
    );
    if (roles.length === 0) throw new Error('No está configurado el rol de sistema Afiliado');

    const { rows: personas } = await client.query(
      `INSERT INTO persona (nombre1, nombre2, apellido1, apellido2, cedula, fecha_nacimiento, correo, celular)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_persona`,
      [
        normalizarNombre(primerNombre),
        nombre2 ? normalizarNombre(nombre2) : null,
        normalizarNombre(primerApellido),
        apellido2 ? normalizarNombre(apellido2) : null,
        cedulaNormalizada,
        fecha_nacimiento || null,
        correoNormalizado,
        celularNormalizado || null,
      ]
    );
    const { rows: afiliados } = await client.query(
      `INSERT INTO afiliado (id_persona)
       VALUES ($1)
       RETURNING id_afiliado`,
      [personas[0].id_persona]
    );
    const { rows: usuarios } = await client.query(
      `INSERT INTO usuario (id_afiliado, usuario, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id_usuario`,
      [afiliados[0].id_afiliado, usuarioNormalizado, bcrypt.hashSync(password, 10)]
    );
    await client.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol_sistema)
       VALUES ($1, $2)`,
      [usuarios[0].id_usuario, roles[0].id_rol_sistema]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      mensaje: 'Tu solicitud de afiliación fue recibida y quedó pendiente de validación por la Directiva.',
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'La cédula, correo o usuario ya están registrados' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar la afiliación' });
  } finally {
    client?.release();
  }
}

// Inicio de sesión
export async function login(req, res) {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const { rows } = await query(
    `SELECT u.id_usuario, u.id_afiliado, u.usuario, u.password_hash, u.activo,
            u.requiere_cambio_contrasena, u.auth_version,
            a.estado AS estado_afiliado,
            COALESCE(array_agg(rs.nombre) FILTER (WHERE rs.nombre IS NOT NULL), '{}') AS roles
     FROM usuario u
     JOIN afiliado a ON a.id_afiliado = u.id_afiliado
     LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
     LEFT JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
     WHERE u.usuario = $1
     GROUP BY u.id_usuario, a.estado`,
    [usuario]
  );

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.activo) {
    return res.status(403).json({ error: 'Usuario inactivo' });
  }

  if (user.estado_afiliado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu afiliación aún no ha sido aprobada' });
  }

  const valido = bcrypt.compareSync(password, user.password_hash);
  if (!valido) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    {
      id_usuario: user.id_usuario,
      id_afiliado: user.id_afiliado,
      usuario: user.usuario,
      roles: user.roles,
      auth_version: user.auth_version,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return res.json({
    token,
    usuario: user.usuario,
    roles: user.roles,
    requiere_cambio_contrasena: user.requiere_cambio_contrasena,
  });
}

export async function cambiarContrasenaTemporal(req, res) {
  const { nuevaContrasena } = req.body || {};
  if (typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 8 || Buffer.byteLength(nuevaContrasena, 'utf8') > 72) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres y máximo 72 bytes' });
  }

  try {
    const { rows } = await query(
      `UPDATE usuario
       SET password_hash = $1, requiere_cambio_contrasena = FALSE,
           auth_version = auth_version + 1, updated_at = now()
       WHERE id_usuario = $2 AND requiere_cambio_contrasena = TRUE
       RETURNING auth_version`,
      [bcrypt.hashSync(nuevaContrasena, 10), req.user.id_usuario]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'La contraseña temporal ya fue cambiada o la cuenta no requiere este cambio' });
    }
    const token = jwt.sign(
      {
        id_usuario: req.user.id_usuario,
        id_afiliado: req.user.id_afiliado,
        usuario: req.user.usuario,
        roles: req.user.roles,
        auth_version: rows[0].auth_version,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    return res.json({ mensaje: 'Contraseña actualizada. Ya puedes continuar.', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }
}

// Perfil del usuario autenticado (nombre completo + roles)
export async function me(req, res) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.id_afiliado, u.usuario, u.requiere_cambio_contrasena,
            p.nombre1, p.nombre2, p.apellido1, p.apellido2, p.correo, p.foto_perfil_url,
           a.estado, a.estado_sindical,
           asignacion.id_subdirectiva, asignacion.subdirectiva,
           asignacion.es_principal AS subdirectiva_principal,
           asignacion.id_institucion, asignacion.institucion,
           asignacion.id_sede, asignacion.sede,
           asignacion.cargo_sindical, asignacion.rol_laboral,
           cargo_departamental.nombre AS cargo_departamental,
           COALESCE(array_agg(DISTINCT rs.nombre) FILTER (WHERE rs.nombre IS NOT NULL), '{}') AS roles
     FROM usuario u
     JOIN afiliado a ON a.id_afiliado = u.id_afiliado
     JOIN persona p ON p.id_persona = a.id_persona
         LEFT JOIN LATERAL (
           SELECT sa0.id_subdirectiva, sd0.nombre AS subdirectiva, sd0.es_principal,
                  i0.id_institucion, i0.nombre AS institucion,
                  sa0.id_sede, s0.nombre AS sede,
                  cs0.nombre AS cargo_sindical, rl0.nombre AS rol_laboral
           FROM subdirectiva_afiliado sa0
           JOIN subdirectiva sd0 ON sd0.id_subdirectiva = sa0.id_subdirectiva
           LEFT JOIN sede s0 ON s0.id_sede = sa0.id_sede AND s0.id_subdirectiva = sa0.id_subdirectiva
           LEFT JOIN institucion i0 ON i0.id_institucion = s0.id_institucion
           LEFT JOIN cargo_sindical cs0 ON cs0.id_cargo_sindical = sa0.id_cargo_sindical
           LEFT JOIN afiliado_sede afs0
             ON afs0.id_afiliado = sa0.id_afiliado AND afs0.id_sede = sa0.id_sede
           LEFT JOIN rol_laboral rl0 ON rl0.id_rol_laboral = afs0.id_rol_laboral
           WHERE sa0.id_afiliado = a.id_afiliado
           ORDER BY sd0.es_principal, sa0.id_subdirectiva
           LIMIT 1
         ) asignacion ON TRUE
         LEFT JOIN LATERAL (
           SELECT cs0.nombre
           FROM subdirectiva_afiliado sa0
           JOIN subdirectiva sd0 ON sd0.id_subdirectiva = sa0.id_subdirectiva AND sd0.es_principal = TRUE
           JOIN cargo_sindical cs0 ON cs0.id_cargo_sindical = sa0.id_cargo_sindical
           WHERE sa0.id_afiliado = a.id_afiliado
           ORDER BY sa0.id_subdirectiva
           LIMIT 1
         ) cargo_departamental ON TRUE
     LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
     LEFT JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
     WHERE u.id_usuario = $1
         GROUP BY u.id_usuario, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
                  p.correo, p.foto_perfil_url,
        a.estado, a.estado_sindical, asignacion.id_subdirectiva, asignacion.subdirectiva,
              asignacion.es_principal, asignacion.id_institucion, asignacion.institucion,
              asignacion.id_sede, asignacion.sede, asignacion.cargo_sindical,
              asignacion.rol_laboral, cargo_departamental.nombre`,
    [req.user.id_usuario]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  try {
    return res.json({
      ...rows[0],
      foto_perfil_url: urlFotoPerfil(rows[0].foto_perfil_url),
    });
  } catch (error) {
    console.error('No se pudo resolver la URL de la foto del perfil:', error);
    return res.status(503).json({ error: 'El almacenamiento de fotos no está configurado correctamente' });
  }
}

export async function actualizarPerfil(req, res) {
  const {
    nombre1, nombre2, apellido1, apellido2, correo,
    contrasenaActual, nuevaContrasena,
  } = req.body || {};
  const nombrePrincipal = typeof nombre1 === 'string' ? nombre1.trim() : '';
  const apellidoPrincipal = typeof apellido1 === 'string' ? apellido1.trim() : '';
  const correoNormalizado = typeof correo === 'string' ? correo.trim().toLocaleLowerCase('es') : '';

  if (!nombrePrincipal || !apellidoPrincipal || !correoNormalizado || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)) {
    return res.status(400).json({ error: 'Nombre, apellido y un correo válido son obligatorios' });
  }
  if (nuevaContrasena && (typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 8)) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  if (nuevaContrasena && !contrasenaActual) {
    return res.status(400).json({ error: 'Escribe tu contraseña actual para cambiarla' });
  }

  let extensionFoto = null;
  if (req.file) {
    extensionFoto = detectarTipoImagen(req.file.buffer);
    if (!extensionFoto) {
      return res.status(400).json({ error: 'La foto debe ser una imagen JPG, PNG o WebP válida' });
    }
  }

  const client = await pool.connect();
  let fotoNueva = null;
  let fotoAnterior = null;
  let transaccionAbierta = false;
  try {
    await client.query('BEGIN');
    transaccionAbierta = true;
    const { rows: cuentas } = await client.query(
      `SELECT u.password_hash, p.foto_perfil_url
       FROM usuario u
       JOIN afiliado a ON a.id_afiliado = u.id_afiliado
       JOIN persona p ON p.id_persona = a.id_persona
       WHERE u.id_usuario = $1
       FOR UPDATE OF u, p`,
      [req.user.id_usuario]
    );
    if (cuentas.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró tu cuenta' });
    }

    if (nuevaContrasena && !bcrypt.compareSync(contrasenaActual, cuentas[0].password_hash)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La contraseña actual no coincide' });
    }

    if (req.file) {
      const nombreArchivo = `${randomUUID()}.${extensionFoto}`;
      const rutaFoto = `avatars/${nombreArchivo}`;
      await subirObjetoStorage('publico', rutaFoto, req.file.buffer, {
        contentType: extensionFoto === 'jpg' ? 'image/jpeg' : `image/${extensionFoto}`,
      });
      fotoNueva = urlPublicaStorage(rutaFoto);
    }

    const { rows: personas } = await client.query(
      `UPDATE persona
       SET nombre1 = $1, nombre2 = $2, apellido1 = $3, apellido2 = $4,
           correo = $5, foto_perfil_url = COALESCE($6, foto_perfil_url)
       FROM afiliado a
       WHERE a.id_persona = persona.id_persona AND a.id_afiliado = $7
       RETURNING persona.foto_perfil_url`,
      [
        normalizarNombre(nombrePrincipal),
        typeof nombre2 === 'string' && nombre2.trim() ? normalizarNombre(nombre2) : null,
        normalizarNombre(apellidoPrincipal),
        typeof apellido2 === 'string' && apellido2.trim() ? normalizarNombre(apellido2) : null,
        correoNormalizado,
        fotoNueva,
        req.user.id_afiliado,
      ]
    );
    if (personas.length === 0) throw new Error('No se encontró el perfil de la cuenta');
    fotoAnterior = cuentas[0].foto_perfil_url;

    if (nuevaContrasena) {
      await client.query(
        'UPDATE usuario SET password_hash = $1, updated_at = now() WHERE id_usuario = $2',
        [bcrypt.hashSync(nuevaContrasena, 10), req.user.id_usuario]
      );
    }

    await client.query('COMMIT');
    transaccionAbierta = false;
    let advertencia;
    if (fotoNueva && fotoAnterior !== fotoNueva) {
      try {
        await eliminarFotoAnterior(fotoAnterior);
      } catch (error) {
        console.error('El perfil se actualizó, pero no se pudo limpiar la foto anterior:', error);
        advertencia = 'No se pudo limpiar la foto de perfil anterior';
      }
    }
    return res.json({
      mensaje: 'Tu perfil se actualizó correctamente',
      ...(advertencia ? { advertencia } : {}),
    });
  } catch (err) {
    if (transaccionAbierta) await client.query('ROLLBACK').catch(() => {});
    if (fotoNueva) {
      const ruta = rutaObjetoFotoPerfil(fotoNueva);
      if (ruta) {
        await eliminarObjetoStorage('publico', ruta).catch((storageError) => {
          console.error('No se pudo limpiar la foto nueva después de un error de actualización:', storageError);
        });
      }
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese correo ya está registrado en otra cuenta' });
    }
    console.error(err);
    const errorStorage = typeof err.code === 'string' && (err.code.startsWith('STORAGE_') || err.code === 'STORAGE_CONFIGURATION_INVALID');
    return res.status(errorStorage ? 503 : 500).json({
      error: errorStorage ? 'El almacenamiento de archivos no está disponible' : 'No se pudo actualizar tu perfil',
    });
  } finally {
    client.release();
  }
}
