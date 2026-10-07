import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// Verifica el token JWT y carga el usuario en req.user
export async function autenticar(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  try {
    const { rows } = await query(
      `SELECT u.activo, a.estado AS estado_afiliado,
              COALESCE(array_agg(rs.nombre) FILTER (WHERE rs.nombre IS NOT NULL), '{}') AS roles
       FROM usuario u
       JOIN afiliado a ON a.id_afiliado = u.id_afiliado
       LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN rol_sistema rs ON rs.id_rol_sistema = ur.id_rol_sistema
       WHERE u.id_usuario = $1
       GROUP BY u.id_usuario, a.estado`,
      [payload.id_usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!rows[0].activo || rows[0].estado_afiliado !== 'aprobado') {
      return res.status(403).json({ error: 'La cuenta está inactiva o la afiliación no está aprobada' });
    }

    req.user = { ...payload, roles: rows[0].roles };
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al verificar los permisos del usuario' });
  }
}
