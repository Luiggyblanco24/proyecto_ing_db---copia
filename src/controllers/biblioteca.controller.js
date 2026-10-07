import path from 'node:path';
import { randomUUID } from 'node:crypto';
import yauzl from 'yauzl';
import { pool, query } from '../config/db.js';
import { enviarDescargaPdfConLogo } from '../utils/documento-marca.js';
import {
  descargarObjetoStorage,
  eliminarObjetoStorage,
  subirObjetoStorage,
} from '../services/supabase-storage.service.js';

const cargosPermitidos = new Set([
  'Presidente', 'Vicepresidente', 'Secretario', 'Fiscal',
  'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General',
]);
const cargosDirectivaDepartamental = new Set([
  'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General', 'Tesorero General',
]);
const tiposMime = new Map([
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

async function enviarDocumentoDesdeStorage(res, documento, categoria) {
  let contenido;
  try {
    contenido = await descargarObjetoStorage('privado', `library/${documento.archivo_url}`);
  } catch (error) {
    console.error('No se pudo descargar el documento sindical desde Supabase Storage:', error);
    const noEncontrado = error.code === 'STORAGE_OBJECT_NOT_FOUND';
    return res.status(noEncontrado ? 404 : 503).json({
      error: noEncontrado ? 'El archivo del documento no está disponible' : 'El almacenamiento de archivos no está disponible',
    });
  }
  return enviarDescargaPdfConLogo(res, {
    contenido,
    extension: path.extname(documento.archivo_url),
    nombre: documento.titulo,
    categoria,
  });
}

function validarFirmaArchivo(buffer, extension) {
  if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === '.doc') {
    return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  return extension === '.docx' && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
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

async function cuentaPuedeLeer(req, res) {
  const { rows } = await query(
    `SELECT 1 FROM afiliado WHERE id_afiliado = $1 AND estado = 'aprobado'`,
    [req.user.id_afiliado]
  );
  if (rows.length > 0) return true;
  res.status(403).json({ error: 'Solo los afiliados aprobados pueden consultar la biblioteca' });
  return false;
}

async function obtenerAmbitoSubida(req) {
  if (req.user.roles.includes('Administrador SUTENS')) {
    const solicitado = req.body?.id_subdirectiva;
    if (solicitado) {
      const { rows } = await query(
        'SELECT id_subdirectiva FROM subdirectiva WHERE id_subdirectiva = $1',
        [solicitado]
      );
      return rows[0]?.id_subdirectiva ?? undefined;
    }
    const { rows } = await query('SELECT id_subdirectiva FROM subdirectiva WHERE es_principal = TRUE', []);
    return rows[0]?.id_subdirectiva;
  }

  const { rows } = await query(
    `SELECT sa.id_subdirectiva, sd.es_principal, cs.nombre AS cargo
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'`,
    [req.user.id_afiliado]
  );
  const asignacion = rows.find((fila) => cargosPermitidos.has(fila.cargo));
  if (!asignacion) return undefined;
  return asignacion.id_subdirectiva;
}

async function esDirectivoDepartamental(req) {
  if (req.user.roles.includes('Administrador SUTENS')) return true;
  const { rows } = await query(
    `SELECT 1
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND sd.es_principal = TRUE
       AND cs.nombre = ANY($2::text[])
     LIMIT 1`,
    [req.user.id_afiliado, [...cargosDirectivaDepartamental]]
  );
  return rows.length > 0;
}

async function obtenerDocumentoGestionable(req, idDocumento) {
  if (!/^\d+$/.test(String(idDocumento))) return null;
  const { rows } = await query(
    `SELECT d.id_documento, d.id_afiliado, d.archivo_url
     FROM documento d
     JOIN tipo_documento td ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     WHERE d.id_documento = $1`,
    [idDocumento]
  );
  if (rows.length === 0) return null;
  const documento = rows[0];
  if (String(documento.id_afiliado) === String(req.user.id_afiliado) || await esDirectivoDepartamental(req)) {
    return documento;
  }
  return false;
}

export async function listarCategorias(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const { rows } = await query('SELECT id_categoria, nombre FROM categoria ORDER BY nombre', []);
  return res.json(rows);
}

export async function listarDocumentos(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const { rows } = await query(
        `SELECT d.id_documento, d.id_afiliado, d.titulo, d.descripcion, d.fecha_publicacion,
            d.es_publico,
            d.archivo_url, d.id_subdirectiva, sd.nombre AS subdirectiva,
          c.id_categoria, c.nombre AS categoria,
            concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS cargado_por
     FROM documento d
     JOIN tipo_documento td ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     JOIN categoria c ON c.id_categoria = ds.id_categoria
     LEFT JOIN subdirectiva sd ON sd.id_subdirectiva = d.id_subdirectiva
     LEFT JOIN afiliado a ON a.id_afiliado = d.id_afiliado
     LEFT JOIN persona p ON p.id_persona = a.id_persona
     ORDER BY d.fecha_publicacion DESC, d.id_documento DESC`,
    []
  );
  const directivoDepartamental = await esDirectivoDepartamental(req);
  return res.json(rows.map((documento) => ({
    ...documento,
    puede_editar: directivoDepartamental || String(documento.id_afiliado) === String(req.user.id_afiliado),
    puede_publicar: directivoDepartamental,
  })));
}

export async function listarDocumentosPublicos(req, res) {
  const { rows } = await query(
    `SELECT d.id_documento, d.titulo, d.descripcion, d.fecha_publicacion,
            c.nombre AS tipo_documento,
            lower(substring(d.archivo_url FROM '\\.(pdf|doc|docx)$')) AS extension
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     JOIN categoria c ON c.id_categoria = ds.id_categoria
     WHERE d.es_publico = TRUE
       AND d.archivo_url ~* '^[0-9a-f-]{36}\\.(pdf|doc|docx)$'
     ORDER BY d.fecha_publicacion DESC, d.id_documento DESC`,
    []
  );
  return res.json(rows);
}

export async function descargarDocumentoPublico(req, res) {
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador del documento no es válido' });
  }
  const { rows } = await query(
    `SELECT d.titulo, d.archivo_url
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     JOIN categoria c ON c.id_categoria = ds.id_categoria
     WHERE d.id_documento = $1 AND d.es_publico = TRUE`,
    [req.params.id]
  );
  if (rows.length === 0 || !/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(rows[0].archivo_url || '')) {
    return res.status(404).json({ error: 'Documento público no encontrado' });
  }
  return enviarDocumentoDesdeStorage(res, rows[0], 'Documento sindical público');
}

export async function actualizarPublicacionDocumento(req, res) {
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'El identificador del documento no es válido' });
  }
  if (typeof req.body?.publico !== 'boolean') {
    return res.status(400).json({ error: 'Indica si el documento debe aparecer en Comunicaciones' });
  }
  if (!await esDirectivoDepartamental(req)) {
    return res.status(403).json({ error: 'Solo Administración o la Directiva Departamental puede publicar documentos' });
  }
  const { rows: documentos } = await query(
    `SELECT d.id_documento, c.nombre AS categoria
     FROM documento d
     JOIN tipo_documento td
       ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     JOIN categoria c ON c.id_categoria = ds.id_categoria
     WHERE d.id_documento = $1`,
    [req.params.id]
  );
  if (documentos.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });
  const { rows } = await query(
    `UPDATE documento
     SET es_publico = $1
     WHERE id_documento = $2
     RETURNING es_publico`,
    [req.body.publico, documentos[0].id_documento]
  );
  return res.json({
    mensaje: rows[0].es_publico
      ? 'El documento ya aparece en Comunicaciones'
      : 'El documento dejó de aparecer en Comunicaciones',
    es_publico: rows[0].es_publico,
  });
}

export async function cargarDocumento(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const categoriaId = req.body?.id_categoria;
  if (!titulo || titulo.length > 200 || !/^\d+$/.test(String(categoriaId))) {
    return res.status(400).json({ error: 'Escribe un título y selecciona una categoría' });
  }
  if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo PDF o Word' });

  const extension = path.extname(req.file.originalname).toLocaleLowerCase('en');
  if (!tiposMime.has(extension) || req.file.mimetype !== tiposMime.get(extension) || !validarFirmaArchivo(req.file.buffer, extension)) {
    return res.status(400).json({ error: 'El contenido no coincide con un PDF o Word válido' });
  }
  if (extension === '.docx' && !await validarEstructuraDocx(req.file.buffer)) {
    return res.status(400).json({ error: 'El archivo no contiene un documento Word válido' });
  }

  const idSubdirectiva = await obtenerAmbitoSubida(req);
  if (idSubdirectiva === undefined) {
    if (req.user.roles.includes('Administrador SUTENS') && req.body?.id_subdirectiva) {
      return res.status(400).json({ error: 'La subdirectiva seleccionada no existe' });
    }
    return res.status(403).json({ error: 'Solo presidentes, vicepresidentes, secretarios y fiscales pueden subir documentos' });
  }
  const { rows: categorias } = await query('SELECT id_categoria, nombre FROM categoria WHERE id_categoria = $1', [categoriaId]);
  if (categorias.length === 0) return res.status(400).json({ error: 'La categoría seleccionada no existe' });
  const publicar = req.body?.publico === 'true'
    && await esDirectivoDepartamental(req);
  const { rows: tipos } = await query("SELECT id_tipo_documento FROM tipo_documento WHERE nombre = 'Sindical'", []);
  if (tipos.length === 0) return res.status(500).json({ error: 'No está configurado el tipo documental sindical' });

  const nombreArchivo = `${randomUUID()}${extension}`;
  try {
    await subirObjetoStorage('privado', `library/${nombreArchivo}`, req.file.buffer, {
      contentType: tiposMime.get(extension),
    });
  } catch (error) {
    console.error('No se pudo guardar el documento sindical en Supabase Storage:', error);
    return res.status(503).json({ error: 'No se pudo guardar el archivo; inténtalo de nuevo más tarde' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows: documentos } = await client.query(
      `INSERT INTO documento (titulo, descripcion, id_tipo_documento, id_afiliado, id_subdirectiva, archivo_url, es_publico)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_documento, fecha_publicacion`,
      [titulo, descripcion || null, tipos[0].id_tipo_documento, req.user.id_afiliado, idSubdirectiva, nombreArchivo, publicar]
    );
    await client.query(
      'INSERT INTO documento_sindical (id_documento, id_categoria) VALUES ($1, $2)',
      [documentos[0].id_documento, categoriaId]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      mensaje: 'Documento agregado a la biblioteca',
      documento: { id_documento: documentos[0].id_documento, titulo, fecha_publicacion: documentos[0].fecha_publicacion },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await eliminarObjetoStorage('privado', `library/${nombreArchivo}`).catch((storageError) => {
      console.error('No se pudo limpiar el archivo sindical después de un error de base de datos:', storageError);
    });
    if (error.code === '23503') return res.status(400).json({ error: 'La categoría seleccionada ya no existe' });
    console.error(error);
    return res.status(500).json({ error: 'No se pudo agregar el documento' });
  } finally {
    client?.release();
  }
}

export async function editarDocumento(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const documento = await obtenerDocumentoGestionable(req, req.params.id);
  if (documento === false) return res.status(403).json({ error: 'No tienes permisos para editar este documento' });
  if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const categoriaId = req.body?.id_categoria;
  if (!titulo || titulo.length > 200 || !/^\d+$/.test(String(categoriaId))) {
    return res.status(400).json({ error: 'Escribe un título y selecciona una categoría' });
  }
  const { rows: categorias } = await query('SELECT id_categoria, nombre FROM categoria WHERE id_categoria = $1', [categoriaId]);
  if (categorias.length === 0) return res.status(400).json({ error: 'La categoría seleccionada no existe' });
  const cambiarPublicacion = typeof req.body?.publico === 'string';
  const puedePublicar = cambiarPublicacion && await esDirectivoDepartamental(req);
  if (cambiarPublicacion && !puedePublicar) {
    return res.status(403).json({ error: 'Solo Administración o la Directiva Departamental puede publicar documentos' });
  }
  const publicar = puedePublicar
    ? req.body.publico === 'true'
    : null;

  let nombreNuevo = null;
  let extensionNueva = null;
  if (req.file) {
    extensionNueva = path.extname(req.file.originalname).toLocaleLowerCase('en');
    if (!tiposMime.has(extensionNueva) || req.file.mimetype !== tiposMime.get(extensionNueva) || !validarFirmaArchivo(req.file.buffer, extensionNueva)) {
      return res.status(400).json({ error: 'El contenido no coincide con un PDF o Word válido' });
    }
    if (extensionNueva === '.docx' && !await validarEstructuraDocx(req.file.buffer)) {
      return res.status(400).json({ error: 'El archivo no contiene un documento Word válido' });
    }
    nombreNuevo = `${randomUUID()}${extensionNueva}`;
    try {
      await subirObjetoStorage('privado', `library/${nombreNuevo}`, req.file.buffer, {
        contentType: tiposMime.get(extensionNueva),
      });
    } catch (error) {
      console.error('No se pudo guardar el documento sindical en Supabase Storage:', error);
      return res.status(503).json({ error: 'No se pudo guardar el archivo; inténtalo de nuevo más tarde' });
    }
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE documento
       SET titulo = $1, descripcion = $2,
           archivo_url = COALESCE($3, archivo_url),
           es_publico = COALESCE($4, es_publico)
       WHERE id_documento = $5
       RETURNING id_documento, titulo`,
      [titulo, descripcion || null, nombreNuevo, publicar, documento.id_documento]
    );
    await client.query(
      'UPDATE documento_sindical SET id_categoria = $1 WHERE id_documento = $2',
      [categoriaId, documento.id_documento]
    );
    await client.query('COMMIT');

    let advertencia;
    if (nombreNuevo) {
      try {
        await eliminarObjetoStorage('privado', `library/${documento.archivo_url}`);
      } catch (error) {
        if (error.code !== 'STORAGE_OBJECT_NOT_FOUND') {
          console.error('El documento se actualizó, pero no se pudo limpiar la versión anterior:', error);
          advertencia = 'No se pudo limpiar la versión anterior del archivo';
        }
      }
    }
    return res.json({
      mensaje: 'Documento actualizado',
      documento: rows[0],
      ...(advertencia ? { advertencia } : {}),
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (nombreNuevo) {
      await eliminarObjetoStorage('privado', `library/${nombreNuevo}`).catch((storageError) => {
        console.error('No se pudo limpiar el nuevo archivo sindical después de un error de base de datos:', storageError);
      });
    }
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar el documento' });
  } finally {
    client?.release();
  }
}

export async function eliminarDocumento(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const documento = await obtenerDocumentoGestionable(req, req.params.id);
  if (documento === false) return res.status(403).json({ error: 'No tienes permisos para eliminar este documento' });
  if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

  const { rows } = await query('DELETE FROM documento WHERE id_documento = $1 RETURNING id_documento', [documento.id_documento]);
  if (rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });
  if (/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(documento.archivo_url || '')) {
    try {
      await eliminarObjetoStorage('privado', `library/${documento.archivo_url}`);
    } catch (error) {
      if (error.code !== 'STORAGE_OBJECT_NOT_FOUND') {
        console.error('El documento sindical se eliminó de la base, pero no se pudo borrar su archivo:', error);
        return res.status(500).json({ error: 'El documento se eliminó, pero no se pudo limpiar el archivo almacenado' });
      }
    }
  }
  return res.json({ mensaje: 'Documento eliminado' });
}

export async function descargarDocumento(req, res) {
  if (!await cuentaPuedeLeer(req, res)) return;
  const { rows } = await query(
    `SELECT d.titulo, d.archivo_url
     FROM documento d
     JOIN tipo_documento td ON td.id_tipo_documento = d.id_tipo_documento AND td.nombre = 'Sindical'
     JOIN documento_sindical ds ON ds.id_documento = d.id_documento
     WHERE d.id_documento = $1`,
    [req.params.id]
  );
  if (rows.length === 0 || !/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(rows[0].archivo_url || '')) {
    return res.status(404).json({ error: 'Documento no encontrado' });
  }

  return enviarDocumentoDesdeStorage(res, rows[0], 'Documento sindical');
}