import { autorizarDirectivaPrincipal } from './rbac.js';
import { referenciaAuditoriaChatbot } from '../utils/chatbot-audit.js';

const verificarDirectivaDepartamental = autorizarDirectivaPrincipal();
const informesConocidos = new Set([
  'afiliados_por_estado',
  'afiliados_por_subdirectiva',
  'afiliados_por_institucion_sede',
  'aprobaciones_por_mes',
]);

export function crearAutorizadorInformesChatbot(logger = console, verificarDirectiva = verificarDirectivaDepartamental) {
  return async function autorizarInformesChatbot(req, res, next) {
    if (req.user?.roles?.includes('Administrador SUTENS')) return next();

    let esDirectivaDepartamental = false;
    await verificarDirectiva(req, res, () => { esDirectivaDepartamental = true; });
    if (esDirectivaDepartamental) return next();
    if (res.statusCode !== 403) return;

    const actorRef = referenciaAuditoriaChatbot(req);
    logger.info(JSON.stringify({
      evento: 'chatbot_informe',
      informe: informesConocidos.has(req.body?.informe) ? req.body.informe : 'invalido',
      ocurrido_at: new Date().toISOString(),
      resultado: '403',
      filtros: {},
      ...(actorRef ? { actor_ref: actorRef } : {}),
    }));
  };
}

export const autorizarInformesChatbot = crearAutorizadorInformesChatbot();
