const intentosPorUsuario = new Map();
const maximo = Number(process.env.CHATBOT_CONVERSATION_RATE_LIMIT || 20);
const ventanaMs = Number(process.env.CHATBOT_CONVERSATION_RATE_WINDOW_MS || 60000);

if (!Number.isInteger(maximo) || maximo < 1 || maximo > 300 ||
    !Number.isInteger(ventanaMs) || ventanaMs < 1000 || ventanaMs > 3600000) {
  throw new Error('La configuración del límite conversacional del chatbot no es válida');
}

const limpieza = setInterval(() => {
  const ahora = Date.now();
  for (const [usuario, ventana] of intentosPorUsuario) {
    if (ahora - ventana.inicio >= ventanaMs) intentosPorUsuario.delete(usuario);
  }
}, Math.min(ventanaMs, 60000));
limpieza.unref();

export function limitarConversacionChatbot(req, res, next) {
  const usuario = String(req.user?.id_usuario || '');
  if (!usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });
  const ahora = Date.now();
  let ventana = intentosPorUsuario.get(usuario);
  if (!ventana || ahora - ventana.inicio >= ventanaMs) {
    ventana = { inicio: ahora, cantidad: 0 };
    intentosPorUsuario.set(usuario, ventana);
  }
  if (ventana.cantidad >= maximo) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((ventana.inicio + ventanaMs - ahora) / 1000))));
    return res.status(429).json({ error: 'Alcanzaste el límite temporal de mensajes. Inténtalo más tarde.' });
  }
  ventana.cantidad += 1;
  return next();
}
