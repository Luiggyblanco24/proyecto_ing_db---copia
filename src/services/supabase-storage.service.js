const mimeTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);
const requestTimeoutMs = 30000;

function storageBaseUrl() {
  const baseUrl = process.env.SUPABASE_URL;
  if (!baseUrl) {
    const error = new Error('Configura SUPABASE_URL en el servidor');
    error.code = 'STORAGE_CONFIGURATION_MISSING';
    throw error;
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    const error = new Error('SUPABASE_URL no es válida');
    error.code = 'STORAGE_CONFIGURATION_INVALID';
    throw error;
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    const error = new Error('SUPABASE_URL debe ser la URL base del proyecto, sin rutas ni credenciales');
    error.code = 'STORAGE_CONFIGURATION_INVALID';
    throw error;
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    const error = new Error('SUPABASE_URL debe usar HTTPS en producción');
    error.code = 'STORAGE_CONFIGURATION_INVALID';
    throw error;
  }
  return url.origin;
}

function storageConfig() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    const error = new Error('Configura SUPABASE_SERVICE_ROLE_KEY en el servidor');
    error.code = 'STORAGE_CONFIGURATION_MISSING';
    throw error;
  }
  return { baseUrl: storageBaseUrl(), serviceRoleKey };
}

function bucketName(tipo) {
  if (tipo === 'publico') return 'sutens-public';
  if (tipo === 'privado') return 'sutens-private';
  throw new Error('El tipo de almacenamiento no es válido');
}

function objectPath(ruta) {
  if (typeof ruta !== 'string' || !ruta || ruta.includes('\\')) {
    throw new Error('La ruta del archivo no es válida');
  }
  const partes = ruta.split('/');
  if (partes.some((parte) => !parte || parte === '.' || parte === '..' || !/^[A-Za-z0-9._-]+$/.test(parte))) {
    throw new Error('La ruta del archivo no es válida');
  }
  return partes.map(encodeURIComponent).join('/');
}

function urlObjeto(tipo, ruta, publico = false) {
  const baseUrl = storageBaseUrl();
  const bucket = encodeURIComponent(bucketName(tipo));
  const prefijo = publico ? 'public/' : '';
  return `${baseUrl}/storage/v1/object/${prefijo}${bucket}/${objectPath(ruta)}`;
}

function headersStorage(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra,
  };
}

async function comprobarRespuesta(respuesta, operacion) {
  if (respuesta.ok) return;
  const error = new Error(`No se pudo ${operacion} el archivo en Supabase Storage (HTTP ${respuesta.status})`);
  error.code = respuesta.status === 404 ? 'STORAGE_OBJECT_NOT_FOUND' : 'STORAGE_REQUEST_FAILED';
  error.status = respuesta.status;
  throw error;
}

export function tipoMimeDeArchivo(nombreArchivo) {
  const extension = nombreArchivo.slice(nombreArchivo.lastIndexOf('.')).toLowerCase();
  return mimeTypes.get(extension) || 'application/octet-stream';
}

export async function subirObjetoStorage(tipo, ruta, contenido, { contentType, upsert = false } = {}) {
  if (!Buffer.isBuffer(contenido)) throw new TypeError('El contenido del archivo debe ser un Buffer');
  const { serviceRoleKey } = storageConfig();
  const respuesta = await fetch(urlObjeto(tipo, ruta), {
    method: 'POST',
    headers: headersStorage(serviceRoleKey, {
      'Content-Type': contentType || tipoMimeDeArchivo(ruta),
      'Cache-Control': '3600',
      'x-upsert': String(upsert),
    }),
    body: contenido,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  await comprobarRespuesta(respuesta, 'guardar');
}

export async function descargarObjetoStorage(tipo, ruta) {
  const { serviceRoleKey } = storageConfig();
  const respuesta = await fetch(urlObjeto(tipo, ruta), {
    method: 'GET',
    headers: headersStorage(serviceRoleKey),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  await comprobarRespuesta(respuesta, 'descargar');
  return Buffer.from(await respuesta.arrayBuffer());
}

export async function eliminarObjetoStorage(tipo, ruta) {
  const { baseUrl, serviceRoleKey } = storageConfig();
  const bucket = bucketName(tipo);
  objectPath(ruta);
  const respuesta = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: headersStorage(serviceRoleKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [ruta] }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  await comprobarRespuesta(respuesta, 'eliminar');
}

export function urlPublicaStorage(ruta) {
  return urlObjeto('publico', ruta, true);
}

export function urlFotoPerfil(foto) {
  if (typeof foto !== 'string' || !foto) return foto;
  const local = foto.match(/^\/uploads\/avatars\/([0-9a-f-]{36}\.(?:jpg|jpeg|png|webp))$/i);
  if (local) return urlPublicaStorage(`avatars/${local[1]}`);
  return foto;
}

export function rutaObjetoFotoPerfil(foto) {
  if (typeof foto !== 'string' || !foto) return null;
  const local = foto.match(/^\/uploads\/avatars\/([0-9a-f-]{36}\.(?:jpg|jpeg|png|webp))$/i);
  if (local) return `avatars/${local[1]}`;

  try {
    const baseUrl = storageBaseUrl();
    const url = new URL(foto);
    const prefijo = `/storage/v1/object/public/${bucketName('publico')}/`;
    if (url.origin !== baseUrl || !url.pathname.startsWith(prefijo)) return null;
    const ruta = decodeURIComponent(url.pathname.slice(prefijo.length));
    if (!/^avatars\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(ruta)) return null;
    return ruta;
  } catch {
    return null;
  }
}
