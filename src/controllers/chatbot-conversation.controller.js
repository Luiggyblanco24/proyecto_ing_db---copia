import { cargosDirectivaPrincipal } from '../middleware/rbac.js';
import { responderConChatbotIa, responderConsultaPublica } from '../services/chatbot-ai.service.js';
import { query } from '../config/db.js';

const roles = {
  administrador: 'Administrador SUTENS',
  directivo: 'Directiva Departamental',
  afiliado: 'afiliado con acceso limitado a su perfil y a información general',
};

function leerTurno(req) {
  const mensaje = typeof req.body?.mensaje === 'string' ? req.body.mensaje.trim() : '';
  const historial = req.body?.historial ?? [];
  if (!mensaje || mensaje.length > 500 || !Array.isArray(historial) || historial.length > 6 || historial.some((item) =>
    !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > (item.role === 'assistant' ? 1200 : 500)
  )) return null;
  return { mensaje, historial };
}

function errorConversacion(error, etapa, res) {
  if (error.code === 'CHATBOT_AI_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message, ia_no_configurada: true });
  }
  console.warn(JSON.stringify({
    evento: 'chatbot_error', etapa, codigo: error.code || error.name,
    estado_http: error.statusProveedor, codigo_proveedor: error.codigoProveedor,
  }));
  if (error.code === 'CHATBOT_AI_TIMEOUT') {
    return res.status(504).json({ error: 'La respuesta tardó demasiado. Puedes volver a enviar tu pregunta.' });
  }
  if (error.statusProveedor === 429) {
    return res.status(429).json({ error: 'El servicio de IA alcanzó su límite temporal. Inténtalo más tarde.' });
  }
  if (['CHATBOT_AI_TOKEN_LIMIT', 'CHATBOT_AI_EMPTY', 'CHATBOT_AI_INVALID_JSON'].includes(error.code)) {
    return res.status(502).json({ error: 'El servicio de IA no devolvió una respuesta completa. Puedes volver a intentarlo.' });
  }
  return res.status(503).json({ error: 'No se pudo consultar al asistente. Inténtalo más tarde.' });
}

export async function conversarComoVisitante(req, res) {
  const turno = leerTurno(req);
  if (!turno) return res.status(400).json({ error: 'El mensaje o el contexto de conversación no es válido.' });
  try {
    return res.json(await responderConsultaPublica(turno));
  } catch (error) {
    return errorConversacion(error, 'visitante', res);
  }
}

export async function conversarConChatbot(req, res) {
  const turno = leerTurno(req);
  if (!turno) return res.status(400).json({ error: 'El mensaje o el contexto de conversación no es válido.' });

  const esAdmin = req.user?.roles?.includes('Administrador SUTENS');
  let esDirectivo = false;
  let etapa = 'perfil';
  try {
    if (!esAdmin) {
      const { rows } = await query(
        `SELECT 1
         FROM afiliado a
         JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
         JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = TRUE
         JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
         WHERE a.id_afiliado = $1 AND a.estado = 'aprobado' AND a.estado_sindical = 'activo'
           AND cs.nombre = ANY($2::text[])
         LIMIT 1`,
        [req.user.id_afiliado, cargosDirectivaPrincipal]
      );
      esDirectivo = rows.length > 0;
    }
    const perfil = esAdmin ? roles.administrador : (esDirectivo ? roles.directivo : roles.afiliado);
    etapa = 'conversacion';
    const resultado = await responderConChatbotIa({ ...turno, rol: perfil });
    return res.json(resultado);
  } catch (error) {
    return errorConversacion(error, etapa, res);
  }
}
