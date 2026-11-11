const solicitudesPorUsuario = new Map();
const informesConocidos = new Set([
  'afiliados_por_estado',
  'afiliados_por_subdirectiva',
  'afiliados_por_institucion_sede',
  'aprobaciones_por_mes',
]);
const limite = enteroConfigurado('CHATBOT_REPORT_RATE_LIMIT', 30, 1, 1000);
const ventanaMs = enteroConfigurado('CHATBOT_REPORT_RATE_WINDOW_MS', 60000, 1000, 3600000);

function enteroConfigurado(nombre, predeterminado, minimo, maximo) {
  const valor = process.env[nombre] === undefined ? predeterminado : Number(process.env[nombre]);
  if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new Error(`${nombre} debe ser un entero entre ${minimo} y ${maximo}`);
  }
  return valor;
}

const limpieza = setInterval(() => {
  const ahora = Date.now();
  for (const [usuarioId, ventana] of solicitudesPorUsuario) {
    if (ahora >= ventana.inicio + ventanaMs) solicitudesPorUsuario.delete(usuarioId);
  }
}, Math.min(ventanaMs, 60000));
limpieza.unref();

export function limitarInformesChatbot(req, res, next) {
  const usuarioId = String(req.user?.id_usuario || '');
  if (!usuarioId) return res.status(401).json({ error: 'Debes iniciar sesión' });

  const ahora = Date.now();
  let ventana = solicitudesPorUsuario.get(usuarioId);
  if (!ventana || ahora >= ventana.inicio + ventanaMs) {
    ventana = { inicio: ahora, cantidad: 0 };
    solicitudesPorUsuario.set(usuarioId, ventana);
  }

  if (ventana.cantidad >= limite) {
    const esperaSegundos = Math.max(1, Math.ceil((ventana.inicio + ventanaMs - ahora) / 1000));
    res.set('Retry-After', String(esperaSegundos));
    if (!ventana.rechazoAuditado) {
      ventana.rechazoAuditado = true;
      console.info(JSON.stringify({
        evento: 'chatbot_informe',
        informe: informesConocidos.has(req.body?.informe) ? req.body.informe : 'invalido',
        ocurrido_at: new Date().toISOString(),
        resultado: '429',
        filtros: {},
      }));
    }
    return res.status(429).json({ error: 'Alcanzaste el límite temporal de informes. Inténtalo más tarde.' });
  }

  ventana.cantidad += 1;
  return next();
}

export function limpiarLimitesChatbotParaPruebas() {
  solicitudesPorUsuario.clear();
}
