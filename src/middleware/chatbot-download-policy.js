const enteroConfigurado = (nombre, defecto, minimo, maximo) => {
  const valor = process.env[nombre] === undefined ? defecto : Number(process.env[nombre]);
  if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new Error(`${nombre} debe ser un entero entre ${minimo} y ${maximo}`);
  }
  return valor;
};

const bandera = process.env.CHATBOT_DOWNLOADS_ENABLED ?? 'false';
if (!['true', 'false'].includes(bandera)) {
  throw new Error('CHATBOT_DOWNLOADS_ENABLED debe ser true o false');
}

export const politicaDescargas = Object.freeze({
  habilitadas: bandera === 'true',
  maxRegistros: enteroConfigurado('CHATBOT_DOWNLOAD_MAX_RECORDS', 1000, 1, 9999),
  limite: enteroConfigurado('CHATBOT_DOWNLOAD_RATE_LIMIT', 5, 1, 1000),
  ventanaMs: enteroConfigurado('CHATBOT_DOWNLOAD_RATE_WINDOW_MS', 600000, 1000, 86400000),
  alertaRegistros: enteroConfigurado('CHATBOT_DOWNLOAD_ALERT_RECORDS', 2000, 1, 1000000),
});

const informes = new Set([
  'afiliados_por_estado', 'afiliados_por_subdirectiva',
  'afiliados_por_institucion_sede', 'aprobaciones_por_mes',
]);
const filtros = new Set(['estado', 'estado_sindical', 'id_subdirectiva', 'id_institucion', 'id_sede', 'desde', 'hasta']);
const ventanas = new Map();

function ventanaUsuario(id) {
  const ahora = Date.now();
  let ventana = ventanas.get(id);
  if (!ventana || ahora >= ventana.inicio + politicaDescargas.ventanaMs) {
    ventana = { inicio: ahora, intentos: 0, registros: 0, alertado: false };
    ventanas.set(id, ventana);
  }
  return ventana;
}

const limpieza = setInterval(() => {
  const ahora = Date.now();
  for (const [id, ventana] of ventanas) {
    if (ahora >= ventana.inicio + politicaDescargas.ventanaMs) ventanas.delete(id);
  }
}, Math.min(politicaDescargas.ventanaMs, 60000));
limpieza.unref();

export function registrarAuditoriaDescarga(req, resultado, cantidad = null, logger = console) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const nombresFiltros = body.filtros && typeof body.filtros === 'object' && !Array.isArray(body.filtros)
    ? Object.keys(body.filtros).filter((nombre) => filtros.has(nombre)) : [];
  logger.info(JSON.stringify({
    evento: 'chatbot_exportacion',
    ocurrido_at: new Date().toISOString(),
    informe: informes.has(body.informe) ? body.informe : 'invalido',
    formato: ['pdf', 'excel', 'correos'].includes(body.formato) ? body.formato : 'invalido',
    filtros: nombresFiltros,
    cantidad,
    resultado: String(resultado),
  }));
  req.chatbotExportAuditado = true;
}

export function auditarIntentoDescarga(req, res, next) {
  if (req.chatbotExportAuditando) return next();
  req.chatbotExportAuditando = true;
  res.on('finish', () => {
    if (!req.chatbotExportAuditado) registrarAuditoriaDescarga(req, res.statusCode);
  });
  return next();
}

export function manejarCuerpoInvalidoDescarga(error, req, res, next) {
  if (['entity.parse.failed', 'entity.too.large'].includes(error.type)) {
    return res.status(error.status).json({ error: 'La solicitud de exportación no es válida.' });
  }
  return next(error);
}

export function exigirDescargasHabilitadas(req, res, next) {
  if (!politicaDescargas.habilitadas) return res.status(404).json({ error: 'Descargas no disponibles.' });
  return next();
}

export function limitarDescargasChatbot(req, res, next) {
  const id = String(req.user.id_usuario);
  const ventana = ventanaUsuario(id);
  if (ventana.intentos >= politicaDescargas.limite) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((ventana.inicio + politicaDescargas.ventanaMs - Date.now()) / 1000))));
    return res.status(429).json({ error: 'Alcanzaste el límite temporal de descargas. Inténtalo más tarde.' });
  }
  ventana.intentos += 1;
  return next();
}

export function registrarVolumenDescarga(req, cantidad, logger = console) {
  const ventana = ventanaUsuario(String(req.user.id_usuario));
  ventana.registros += cantidad;
  if (!ventana.alertado && ventana.registros >= politicaDescargas.alertaRegistros) {
    ventana.alertado = true;
    logger.info(JSON.stringify({
      evento: 'chatbot_exportacion_volumen',
      ocurrido_at: new Date().toISOString(),
      cantidad_acumulada: ventana.registros,
      ventana_ms: politicaDescargas.ventanaMs,
    }));
  }
}

export function limpiarLimitesDescargasParaPruebas() {
  ventanas.clear();
}
