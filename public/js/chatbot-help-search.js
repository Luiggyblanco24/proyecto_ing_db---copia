export const MAX_LONGITUD_PREGUNTA = 500;

const VISTAS_PERMITIDAS = new Set([
  'inicio',
  'calendario',
  'mi-cuenta',
  'estructura',
  'biblioteca',
  'afiliados',
  'administracion',
]);

const RUTAS_PERMITIDAS = new Set([
  '/change-password.html',
  '/login.html',
]);

const PALABRAS_COMUNES = new Set([
  'a', 'al', 'como', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los',
  'mi', 'mis', 'o', 'para', 'por', 'que', 'se', 'un', 'una', 'y',
]);

const UMBRAL_RESPUESTA = 0.6;
const UMBRAL_SUGERENCIA = 0.35;

export function normalizarPregunta(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validarDestinoChatbot(destino) {
  if (!destino || typeof destino !== 'object' || Array.isArray(destino)) return false;
  const claves = Object.keys(destino).sort().join(',');

  if (destino.tipo === 'vista') {
    return claves === 'id,tipo' && VISTAS_PERMITIDAS.has(destino.id);
  }
  if (destino.tipo === 'ruta') {
    return claves === 'ruta,tipo' && RUTAS_PERMITIDAS.has(destino.ruta);
  }
  return false;
}

function tieneCapacidadesRequeridas(entrada, capacidades) {
  return (entrada.capabilities || []).every((capacidad) => capacidades?.[capacidad] === true);
}

function puntuar(pregunta, entrada) {
  const consultasExactas = [...(entrada.preguntas || []), ...(entrada.sinonimos || [])]
    .map(normalizarPregunta)
    .filter(Boolean);

  if (consultasExactas.some((consulta) => consulta === pregunta)) return 1;
  if (consultasExactas.some((consulta) => pregunta.includes(consulta))) return 0.9;

  const tokensPregunta = [...new Set(pregunta.split(' ').filter(
    (token) => token.length > 1 && !PALABRAS_COMUNES.has(token)
  ))];
  if (tokensPregunta.length === 0) return 0;
  const tokensEntrada = new Set([
    ...(entrada.palabrasClave || []),
    ...(entrada.preguntas || []),
    ...(entrada.sinonimos || []),
  ].flatMap((texto) => normalizarPregunta(texto).split(' '))
    .filter((token) => token && !PALABRAS_COMUNES.has(token)));
  const coincidencias = tokensPregunta.filter((token) => tokensEntrada.has(token)).length;
  return coincidencias / tokensPregunta.length;
}

function ordenarCoincidencias(pregunta, entradas) {
  return entradas
    .map((entrada) => ({ entrada, puntaje: puntuar(pregunta, entrada) }))
    .filter((resultado) => resultado.puntaje >= UMBRAL_SUGERENCIA)
    .sort((a, b) => b.puntaje - a.puntaje || a.entrada.id.localeCompare(b.entrada.id));
}

function prepararEntrada(entrada) {
  const { destino, ...resto } = entrada;
  return {
    ...resto,
    ...(validarDestinoChatbot(destino) ? { destino } : {}),
  };
}

export function buscarAyuda(texto, catalogo, capacidades = {}) {
  const textoOriginal = String(texto ?? '');
  if (!textoOriginal.trim()) return { estado: 'vacio' };
  if (textoOriginal.length > MAX_LONGITUD_PREGUNTA) return { estado: 'demasiado-largo' };

  const pregunta = normalizarPregunta(textoOriginal);
  if (!pregunta || pregunta.split(' ').every((token) => PALABRAS_COMUNES.has(token))) {
    return { estado: 'vacio' };
  }

  const entradasVisibles = catalogo.filter((entrada) => tieneCapacidadesRequeridas(entrada, capacidades));
  const verificadas = ordenarCoincidencias(
    pregunta,
    entradasVisibles.filter((entrada) => entrada.contentVerified === true)
  );
  const pendientes = ordenarCoincidencias(
    pregunta,
    entradasVisibles.filter((entrada) => entrada.contentVerified !== true)
  );
  const mejorVerificada = verificadas[0];
  const mejorPendiente = pendientes[0];

  if (mejorPendiente &&
      mejorPendiente.puntaje >= UMBRAL_RESPUESTA &&
      (!mejorVerificada || mejorPendiente.puntaje >= mejorVerificada.puntaje)) {
    return { estado: 'pendiente' };
  }

  if (mejorVerificada?.puntaje >= UMBRAL_RESPUESTA) {
    const segunda = verificadas[1];
    if (!segunda || mejorVerificada.puntaje - segunda.puntaje >= 0.2) {
      return {
        estado: 'respuesta',
        entrada: prepararEntrada(mejorVerificada.entrada),
      };
    }
  }

  if (verificadas.length > 0) {
    return {
      estado: 'sugerencias',
      entradas: verificadas.slice(0, 3).map(({ entrada }) => prepararEntrada(entrada)),
    };
  }

  return { estado: mejorPendiente ? 'pendiente' : 'sin-resultados' };
}

export function obtenerPreguntasSugeridas(catalogo, capacidades = {}, limite = 3) {
  return catalogo
    .filter((entrada) => entrada.contentVerified === true && tieneCapacidadesRequeridas(entrada, capacidades))
    .slice(0, limite)
    .map(prepararEntrada);
}
