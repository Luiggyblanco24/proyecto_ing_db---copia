import { query } from '../config/db.js';
import { urlFotoPerfil } from '../services/supabase-storage.service.js';

const cargosDepartamentales = [
  'Presidente General',
  'Vicepresidente General',
  'Secretario General',
  'Fiscal General',
  'Tesorero General',
];
const cargosLocales = ['Presidente', 'Vicepresidente', 'Secretario', 'Fiscal', 'Tesorero'];

function responderConFotos(res, rows) {
  try {
    return res.json(rows.map((row) => ({ ...row, foto: urlFotoPerfil(row.foto) })));
  } catch (error) {
    console.error('No se pudieron resolver las fotos de la directiva:', error);
    return res.status(503).json({ error: 'El almacenamiento de fotos no está configurado correctamente' });
  }
}

export async function listarDirectivaDepartamental(req, res) {
  const { rows } = await query(
    `SELECT concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS nombre,
            cs.nombre AS cargo, p.foto_perfil_url AS foto
     FROM subdirectiva_afiliado sa
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = TRUE
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     JOIN afiliado a ON a.id_afiliado = sa.id_afiliado
     JOIN persona p ON p.id_persona = a.id_persona
     WHERE a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND cs.nombre = ANY($1::text[])
     ORDER BY array_position($1::text[], cs.nombre), p.apellido1, p.nombre1`,
    [cargosDepartamentales]
  );
  return responderConFotos(res, rows);
}

export async function listarDirectivasSubdirectivas(req, res) {
  const { rows } = await query(
    `SELECT sd.id_subdirectiva, sd.nombre AS subdirectiva,
            concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS nombre,
            cs.nombre AS cargo, p.foto_perfil_url AS foto
     FROM subdirectiva_afiliado sa
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     JOIN afiliado a ON a.id_afiliado = sa.id_afiliado
     JOIN persona p ON p.id_persona = a.id_persona
     WHERE a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND cs.nombre = ANY($1::text[])
     ORDER BY sd.nombre, array_position($1::text[], cs.nombre), p.apellido1, p.nombre1`,
    [cargosLocales]
  );
  return responderConFotos(res, rows);
}

export async function listarGaleriaPublica(req, res) {
  try {
    const { rows } = await query(
      `SELECT id_foto, descripcion,
              CASE WHEN imagen IS NULL THEN imagen_url
                   ELSE '/api/public/galeria/' || id_foto || '/imagen'
              END AS imagen_url
       FROM galeria_sutens
       ORDER BY orden, id_foto`,
      []
    );
    return res.json(rows);
  } catch (error) {
    console.error('No se pudo cargar la galería pública:', error);
    if (error.code === '42P01') {
      return res.status(503).json({
        error: 'Falta crear la tabla de la galería. Aplica la migración 011_galeria_publica.sql en la base de datos sutens.',
      });
    }
    return res.status(500).json({ error: 'No se pudo cargar la galería pública' });
  }
}

export async function servirImagenGaleria(req, res) {
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador de la imagen no es válido' });
  }

  const { rows } = await query(
    'SELECT imagen, tipo_mime FROM galeria_sutens WHERE id_foto = $1 AND imagen IS NOT NULL',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Imagen no encontrada' });
  res.set('Cache-Control', 'public, max-age=300');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.type(rows[0].tipo_mime).send(rows[0].imagen);
}

export async function agregarImagenGaleria(req, res) {
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  if (!req.file || !descripcion || descripcion.length > 160) {
    return res.status(400).json({ error: 'Selecciona una imagen y escribe una descripción de máximo 160 caracteres' });
  }
  const tipoMime = detectarTipoImagen(req.file.buffer);
  if (!tipoMime || tipoMime !== req.file.mimetype) {
    return res.status(400).json({ error: 'La imagen debe ser un archivo JPG, PNG o WebP válido' });
  }

  const { rows } = await query(
    `INSERT INTO galeria_sutens (descripcion, tipo_mime, imagen, id_usuario)
     VALUES ($1, $2, $3, $4)
     RETURNING id_foto, descripcion, '/api/public/galeria/' || id_foto || '/imagen' AS imagen_url`,
    [descripcion, tipoMime, req.file.buffer, req.user.id_usuario]
  );
  return res.status(201).json(rows[0]);
}

export async function actualizarImagenGaleria(req, res) {
  const { id } = req.params;
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : null;
  if (!/^\d+$/.test(String(id)) || (descripcion !== null && (!descripcion || descripcion.length > 160))) {
    return res.status(400).json({ error: 'El identificador o la descripción de la imagen no son válidos' });
  }

  let tipoMime = null;
  if (req.file) {
    tipoMime = detectarTipoImagen(req.file.buffer);
    if (!tipoMime || tipoMime !== req.file.mimetype) {
      return res.status(400).json({ error: 'La imagen debe ser un archivo JPG, PNG o WebP válido' });
    }
  }
  if (descripcion === null && !req.file) {
    return res.status(400).json({ error: 'Debes indicar una descripción o seleccionar una imagen nueva' });
  }

  const { rows } = await query(
    `UPDATE galeria_sutens
     SET descripcion = COALESCE($2, descripcion),
         imagen = COALESCE($3, imagen),
         tipo_mime = COALESCE($4, tipo_mime),
         imagen_url = CASE WHEN $3::bytea IS NULL THEN imagen_url ELSE NULL END
     WHERE id_foto = $1
     RETURNING id_foto, descripcion,
       CASE WHEN imagen IS NULL THEN imagen_url
            ELSE '/api/public/galeria/' || id_foto || '/imagen'
       END AS imagen_url`,
    [id, descripcion, req.file?.buffer || null, tipoMime]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Imagen no encontrada' });
  return res.json(rows[0]);
}

export async function eliminarImagenGaleria(req, res) {
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador de la imagen no es válido' });
  }
  const { rowCount } = await query('DELETE FROM galeria_sutens WHERE id_foto = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Imagen no encontrada' });
  return res.json({ mensaje: 'La imagen se eliminó de la galería' });
}

function detectarTipoImagen(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
