import { autorizar } from './rbac.js';

const exigirAdministrador = autorizar('Administrador SUTENS');
const informesConocidos = new Set([
  'afiliados_por_estado',
  'afiliados_por_subdirectiva',
  'afiliados_por_institucion_sede',
  'aprobaciones_por_mes',
]);

export function crearAutorizadorInformesChatbot(logger = console) {
  return function autorizarInformesChatbot(req, res, next) {
    let permitido = false;
    exigirAdministrador(req, res, () => { permitido = true; });
    if (permitido) return next();

    logger.info(JSON.stringify({
      evento: 'chatbot_informe',
      informe: informesConocidos.has(req.body?.informe) ? req.body.informe : 'invalido',
      ocurrido_at: new Date().toISOString(),
      resultado: '403',
      filtros: {},
    }));
  };
}

export const autorizarInformesChatbot = crearAutorizadorInformesChatbot();
