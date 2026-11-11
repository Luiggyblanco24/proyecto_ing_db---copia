const cache = new Map();

async function fetchJSON(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`No se pudo cargar ${url} (${response.status})`);
  return response.json();
}

function cached(key, loader) {
  if (!cache.has(key)) {
    const promise = loader().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return cache.get(key);
}

export function getDirectivaDepartamental() {
  return cached('directiva-departamental', () => fetchJSON('/api/public/directivas/departamental'));
}

export function getDirectivasSubdirectivas() {
  return cached('directivas-subdirectivas', () => fetchJSON('/api/public/directivas/subdirectivas'));
}

export function getDocumentosPublicos() {
  return cached('documentos-publicos', () => fetchJSON('/api/public/documentos'));
}

export function getGaleriaPublica() {
  return cached('galeria-publica', () => fetchJSON('/api/public/galeria'));
}

export function agruparSubdirectivas(integrantes) {
  const grupos = new Map();
  for (const integrante of integrantes) {
    if (!grupos.has(integrante.id_subdirectiva)) {
      grupos.set(integrante.id_subdirectiva, {
        id: integrante.id_subdirectiva,
        nombre: integrante.subdirectiva,
        integrantes: [],
      });
    }
    grupos.get(integrante.id_subdirectiva).integrantes.push(integrante);
  }
  return [...grupos.values()];
}

export function formatearFecha(fecha, opciones = {}) {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return valor.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opciones,
  });
}
