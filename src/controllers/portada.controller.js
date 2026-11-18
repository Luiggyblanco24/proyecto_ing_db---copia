import { query } from '../config/db.js';
import { detectarTipoImagen } from './public.controller.js';

const espacios = [
  ['inicio-1', 'Carrusel', 'Imagen 1'],
  ['inicio-2', 'Carrusel', 'Imagen 2'],
  ['inicio-3', 'Carrusel', 'Imagen 3'],
  ['quienes-somos', 'Quiénes somos', 'Fotografía institucional'],
  ['beneficios-derechos', 'Beneficios', 'Defensa de derechos laborales'],
  ['beneficios-negociacion', 'Beneficios', 'Negociación colectiva'],
  ['beneficios-asesoria', 'Beneficios', 'Asesoría legal especializada'],
  ['beneficios-representacion', 'Beneficios', 'Representación gremial'],
  ['beneficios-formacion', 'Beneficios', 'Bienestar y formación sindical'],
  ['actividades-asamblea', 'Actividades', 'Asamblea Departamental de Afiliados'],
  ['actividades-dialogo', 'Actividades', 'Encuentro Sindical y Diálogo Territorial'],
  ['actividades-formacion', 'Actividades', 'Jornada de Formación y Actualización'],
  ['actividades-delegados', 'Actividades', 'Reunión de Delegados Municipales'],
  ['actividades-territorio', 'Actividades', 'Acompañamiento a Subdirectivas'],
].map(([clave, seccion, nombre]) => ({ clave, seccion, nombre }));
const claves = new Set(espacios.map(({ clave }) => clave));

const columnasPublicas = `clave_portada AS clave, descripcion,
  COALESCE(imagen_url, '/api/public/portada/' || clave_portada || '/imagen') AS imagen_url`;

const guardarImagen = `ON CONFLICT (clave_portada) DO UPDATE SET
  descripcion = EXCLUDED.descripcion, imagen_url = EXCLUDED.imagen_url,
  imagen = EXCLUDED.imagen, tipo_mime = EXCLUDED.tipo_mime,
  id_usuario = EXCLUDED.id_usuario
  RETURNING ${columnasPublicas}`;

function responderError(res, error) {
  console.error('No se pudieron gestionar las imágenes de la portada:', error);
  if (['42P01', '42703'].includes(error.code)) {
    return res.status(503).json({ error: 'Aplica la migración 022_imagenes_portada.sql para habilitar el editor.' });
  }
  return res.status(500).json({ error: 'No se pudieron gestionar las imágenes de la portada.' });
}

export function listarEspaciosPortada(req, res) {
  return res.json(espacios);
}

export async function listarImagenesPortada(req, res) {
  try {
    const { rows } = await query(
      `SELECT ${columnasPublicas} FROM galeria_sutens WHERE clave_portada = ANY($1::text[])`,
      [[...claves]]
    );
    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (error) {
    return responderError(res, error);
  }
}

export async function servirImagenPortada(req, res) {
  const { clave } = req.params;
  if (!claves.has(clave)) return res.sendStatus(404);
  try {
    const { rows: [foto] } = await query(
      'SELECT imagen, tipo_mime FROM galeria_sutens WHERE clave_portada = $1 AND imagen IS NOT NULL',
      [clave]
    );
    if (!foto) return res.sendStatus(404);
    res.set('Cache-Control', 'public, no-cache');
    res.set('X-Content-Type-Options', 'nosniff');
    return res.type(foto.tipo_mime).send(foto.imagen);
  } catch (error) {
    return responderError(res, error);
  }
}

export async function publicarImagenPortada(req, res) {
  const { clave } = req.params;
  const { id_foto: idFoto } = req.body ?? {};
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  if (!claves.has(clave)) return res.status(404).json({ error: 'Espacio de portada desconocido.' });
  if (!descripcion || descripcion.length > 160) {
    return res.status(400).json({ error: 'Escribe una descripción de entre 1 y 160 caracteres.' });
  }
  if (Boolean(req.file) === Boolean(idFoto)) {
    return res.status(400).json({ error: 'Selecciona una foto de Comunicaciones o carga un archivo.' });
  }

  try {
    const columnas = 'clave_portada, descripcion, imagen_url, imagen, tipo_mime, id_usuario';
    const parametros = [clave, descripcion, req.user.id_usuario];
    if (req.file) {
      const tipoMime = detectarTipoImagen(req.file.buffer);
      if (!tipoMime || tipoMime !== req.file.mimetype) {
        return res.status(400).json({ error: 'El archivo debe ser una imagen JPG, PNG o WebP válida.' });
      }
      const { rows } = await query(
        `INSERT INTO galeria_sutens (${columnas}) VALUES ($1, $2, NULL, $4, $5, $3) ${guardarImagen}`,
        [...parametros, req.file.buffer, tipoMime]
      );
      return res.json(rows[0]);
    }

    if (typeof idFoto !== 'string' || !/^[1-9][0-9]{0,18}$/.test(idFoto) || BigInt(idFoto) > 9223372036854775807n) {
      return res.status(400).json({ error: 'Selecciona una imagen válida de Comunicaciones.' });
    }
    const { rows } = await query(
      `INSERT INTO galeria_sutens (${columnas})
       SELECT $1, $2, CASE WHEN imagen IS NULL THEN imagen_url END, imagen,
              CASE WHEN imagen IS NOT NULL THEN tipo_mime END, $3
       FROM galeria_sutens
       WHERE id_foto = $4 AND clave_portada IS NULL
         AND (imagen IS NOT NULL OR imagen_url ~ '^(/Actividades/|https://)')
       ${guardarImagen}`,
      [...parametros, idFoto]
    );
    if (!rows.length) return res.status(404).json({ error: 'La imagen de Comunicaciones ya no está disponible.' });
    return res.json(rows[0]);
  } catch (error) {
    return responderError(res, error);
  }
}

export async function restaurarImagenPortada(req, res) {
  const { clave } = req.params;
  if (!claves.has(clave)) return res.status(404).json({ error: 'Espacio de portada desconocido.' });
  try {
    await query('DELETE FROM galeria_sutens WHERE clave_portada = $1', [clave]);
    return res.json({ clave });
  } catch (error) {
    return responderError(res, error);
  }
}
