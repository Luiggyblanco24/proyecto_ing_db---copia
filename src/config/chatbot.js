import 'dotenv/config';

const valor = process.env.CHATBOT_ENABLED ?? 'false';
if (!['true', 'false'].includes(valor)) {
  throw new Error('CHATBOT_ENABLED debe ser true o false');
}

export const chatbotHabilitado = valor === 'true';

export function exigirChatbotHabilitado(req, res, next) {
  if (!chatbotHabilitado) return res.status(404).json({ error: 'Asistente no disponible.' });
  return next();
}

export function manejarCuerpoInvalidoChatbot(error, req, res, next) {
  if (!['entity.parse.failed', 'entity.too.large'].includes(error.type)) return next(error);
  console.info(JSON.stringify({
    evento: 'chatbot_informe',
    ocurrido_at: new Date().toISOString(),
    informe: 'invalido',
    resultado: String(error.status),
  }));
  return res.status(error.status).json({ error: 'La solicitud del asistente no es válida.' });
}
