import { randomUUID } from 'node:crypto';
import path from 'node:path';
import yauzl from 'yauzl';
import { pool, query } from '../config/db.js';
import { enviarDescargaPdfConLogo } from '../utils/documento-marca.js';
import {
  descargarObjetoStorage,
  eliminarObjetoStorage,
  subirObjetoStorage,
} from '../services/supabase-storage.service.js';

const tiposMime = new Map([
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);
const cargosDirectivaDepartamental = [
  'Presidente General',
  'Vicepresidente General',
  'Secretario General',
  'Fiscal General',
  'Tesorero General',
];

async function enviarDocumentoEducativoDesdeStorage(res, documento) {
  let contenido;
  try {
    contenido = await descargarObjetoStorage('privado', `library/${documento.archivo_url}`);
  } catch (error) {
    console.error('No se pudo descargar el material educativo desde Supabase Storage:', error);
    const noEncontrado = error.code === 'STORAGE_OBJECT_NOT_FOUND';
    return res.status(noEncontrado ? 404 : 503).json({
      error: noEncontrado ? 'El archivo del material educativo no está disponible' : 'El almacenamiento de archivos no está disponible',
    });
  }
  return enviarDescargaPdfConLogo(res, {
    contenido,
    extension: path.extname(documento.archivo_url),
    nombre: documento.titulo,
    categoria: 'Material educativo',
  });
}

function validarEstructuraDocx(buffer) {
  return new Promise((resolve) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, autoClose: true }, (error, zip) => {
      if (error || !zip) return resolve(false);
      let tieneDocumento = false;
      let tieneTiposContenido = false;
      let finalizado = false;
      const terminar = (valido) => {
        if (finalizado) return;
        finalizado = true;
        resolve(valido);
      };
      zip.on('error', () => terminar(false));
      zip.on('end', () => terminar(tieneDocumento && tieneTiposContenido));
      zip.on('entry', (entrada) => {
        if (entrada.fileName === 'word/document.xml') tieneDocumento = true;
        if (entrada.fileName === '[Content_Types].xml') tieneTiposContenido = true;
        if (tieneDocumento && tieneTiposContenido) return terminar(true);
        zip.readEntry();
      });
      zip.readEntry();
    });
  });
}

function validarFirma(buffer, extension) {
  if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === '.doc') {
    return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  return extension === '.docx' && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

async function cuentaPuedeLeer(req, res) {
  const { rows } = await query(
    `SELECT 1 FROM afiliado WHERE id_afiliado = $1 AND estado = 'aprobado'`,
    [req.user.id_afiliado]
  );
  if (rows.length > 0) return true;
  res.status(403).json({ error: 'Solo los afiliados aprobados pueden consultar la biblioteca educativa' });
  return false;
}

async function esDirectivoDepartamental(req) {
  const { rows } = await query(
    `SELECT 1
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = TRUE
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND cs.nombre = ANY($2::text[])
     LIMIT 1`,
    [req.user.id_afiliado, cargosDirectivaDepartamental]
  );
  return rows.length > 0;
}

export async function listarMateriasEducativas(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const { rows } = await query('SELECT id_materia, nombre FROM materia ORDER BY nombre', []);
  return res.json(rows);
}

export async function listarBibliotecaEducativa(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const { rows } = await query(
    `SELECT d.id_documento, d.id_afiliado, d.titulo, d.descripcion, d.fecha_publicacion,
            d.archivo_url, de.tipo_recurso, de.grado,
            m.id_materia, m.nombre AS materia,
            concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS cargado_por
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Educativo'
     JOIN documento_educativo de ON de.id_documento = d.id_documento
     LEFT JOIN materia m ON m.id_materia = de.id_materia
     LEFT JOIN afiliado a ON a.id_afiliado = d.id_afiliado
     LEFT JOIN persona p ON p.id_persona = a.id_persona
     ORDER BY
       CASE WHEN de.tipo_recurso = 'guia' THEN 0 ELSE 1 END,
       de.grado NULLS LAST, m.nombre NULLS LAST, d.fecha_publicacion DESC, d.id_documento DESC`,
    []
  );
  const directiva = await esDirectivoDepartamental(req);
  return res.json(rows.map((documento) => ({
    ...documento,
    puede_eliminar: directiva || String(documento.id_afiliado) === String(req.user.id_afiliado),
  })));
}

export async function cargarDocumentoEducativo(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const tipoRecurso = req.body?.tipo_recurso;
  const guia = tipoRecurso === 'guia';
  const grado = typeof req.body?.grado === 'string' ? req.body.grado.trim() : '';
  const idMateria = req.body?.id_materia;

  if (!titulo || titulo.length > 200 || descripcion.length > 4000) {
    return res.status(400).json({ error: 'El título es obligatorio y la descripción admite máximo 4000 caracteres' });
  }
  if (!['guia', 'metodologia_apoyo'].includes(tipoRecurso)) {
    return res.status(400).json({ error: 'Selecciona si el material es una guía o una metodología de apoyo' });
  }
  if (guia && (!grado || grado.length > 30 || !/^\d+$/.test(String(idMateria)))) {
    return res.status(400).json({ error: 'Las guías requieren grado y materia' });
  }
  if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo PDF o Word' });

  const extension = path.extname(req.file.originalname).toLocaleLowerCase('en');
  if (tiposMime.get(extension) !== req.file.mimetype || !validarFirma(req.file.buffer, extension)) {
    return res.status(400).json({ error: 'El contenido no coincide con un PDF o Word válido' });
  }
  if (extension === '.docx' && !await validarEstructuraDocx(req.file.buffer)) {
    return res.status(400).json({ error: 'El archivo no contiene un documento Word válido' });
  }
  if (guia) {
    const { rows: materias } = await query('SELECT id_materia FROM materia WHERE id_materia = $1', [idMateria]);
    if (materias.length === 0) return res.status(400).json({ error: 'La materia seleccionada no existe' });
  }

  const { rows: tipos } = await query("SELECT id_tipo_documento FROM tipo_documento WHERE nombre = 'Educativo'", []);
  if (tipos.length === 0) return res.status(500).json({ error: 'No está configurado el tipo documental educativo' });

  const nombreArchivo = `${randomUUID()}${extension}`;
  try {
    await subirObjetoStorage('privado', `library/${nombreArchivo}`, req.file.buffer, {
      contentType: tiposMime.get(extension),
    });
  } catch (error) {
    console.error('No se pudo guardar el material educativo en Supabase Storage:', error);
    return res.status(503).json({ error: 'No se pudo guardar el archivo; inténtalo de nuevo más tarde' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows: documentos } = await client.query(
      `INSERT INTO documento (titulo, descripcion, id_tipo_documento, id_afiliado, archivo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_documento, fecha_publicacion`,
      [titulo, descripcion || null, tipos[0].id_tipo_documento, req.user.id_afiliado, nombreArchivo]
    );
    await client.query(
      `INSERT INTO documento_educativo (id_documento, tipo_recurso, id_materia, grado)
       VALUES ($1, $2, $3, $4)`,
      [documentos[0].id_documento, tipoRecurso, guia ? idMateria : null, guia ? grado : null]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      mensaje: 'El material se agregó a la biblioteca educativa',
      documento: { id_documento: documentos[0].id_documento, fecha_publicacion: documentos[0].fecha_publicacion },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await eliminarObjetoStorage('privado', `library/${nombreArchivo}`).catch((storageError) => {
      console.error('No se pudo limpiar el material educativo después de un error de base de datos:', storageError);
    });
    console.error('No se pudo guardar el material educativo:', error);
    return res.status(500).json({ error: 'No se pudo guardar el material educativo' });
  } finally {
    client?.release();
  }
}

export async function descargarDocumentoEducativo(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador del documento no es válido' });
  }
  const { rows } = await query(
    `SELECT d.titulo, d.archivo_url
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Educativo'
     JOIN documento_educativo de ON de.id_documento = d.id_documento
     WHERE d.id_documento = $1`,
    [req.params.id]
  );
  if (rows.length === 0 || !/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(rows[0].archivo_url || '')) {
    return res.status(404).json({ error: 'Material educativo no encontrado' });
  }
  return enviarDocumentoEducativoDesdeStorage(res, rows[0]);
}

export async function eliminarDocumentoEducativo(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador del documento no es válido' });
  }
  const { rows } = await query(
    `SELECT d.id_documento, d.id_afiliado, d.archivo_url
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Educativo'
     JOIN documento_educativo de ON de.id_documento = d.id_documento
     WHERE d.id_documento = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Material educativo no encontrado' });
  const documento = rows[0];
  const esDirectivo = await esDirectivoDepartamental(req);
  if (!esDirectivo && String(documento.id_afiliado) !== String(req.user.id_afiliado)) {
    return res.status(403).json({ error: 'Solo quien subió el documento o la Directiva Departamental puede eliminarlo' });
  }

  await query('DELETE FROM documento WHERE id_documento = $1', [documento.id_documento]);
  if (/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(documento.archivo_url || '')) {
    try {
      await eliminarObjetoStorage('privado', `library/${documento.archivo_url}`);
    } catch (error) {
      if (error.code !== 'STORAGE_OBJECT_NOT_FOUND') {
        console.error('El material se eliminó de la base, pero no se pudo borrar el archivo:', error);
        return res.status(500).json({ error: 'El material se eliminó, pero no se pudo limpiar el archivo almacenado' });
      }
    }
  }
  return res.json({ mensaje: 'El material educativo se eliminó' });
}
