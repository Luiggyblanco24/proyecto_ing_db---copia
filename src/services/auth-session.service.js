import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const expiracionJwt = process.env.JWT_EXPIRES_IN || '7d';

function segundosDeExpiracion(valor) {
  const coincidencia = /^(\d+)(s|m|h|d)$/i.exec(valor);
  if (coincidencia) {
    const unidades = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(coincidencia[1]) * unidades[coincidencia[2].toLowerCase()];
  }

  if (/^\d+$/.test(valor)) return Number(valor);
  throw new Error('JWT_EXPIRES_IN debe usar segundos o un sufijo s, m, h o d');
}

export async function emitirTokenSesion(usuario) {
  const duracionSegundos = segundosDeExpiracion(expiracionJwt);
  if (!Number.isSafeInteger(duracionSegundos) || duracionSegundos < 1) {
    throw new Error('JWT_EXPIRES_IN debe ser una duración positiva válida');
  }

  const idSesion = randomUUID();
  await query(
    `INSERT INTO sesion_usuario (id_sesion, id_usuario, auth_version, expira_at)
     VALUES ($1, $2, $3, now() + ($4 * INTERVAL '1 second'))`,
    [idSesion, usuario.id_usuario, usuario.auth_version, duracionSegundos]
  );

  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      id_afiliado: usuario.id_afiliado,
      usuario: usuario.usuario,
      roles: usuario.roles,
      auth_version: usuario.auth_version,
      sid: idSesion,
    },
    process.env.JWT_SECRET,
    { expiresIn: duracionSegundos }
  );
}
