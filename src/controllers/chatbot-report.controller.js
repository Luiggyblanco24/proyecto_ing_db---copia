import { pool } from '../config/db.js';
import { politicaDescargas } from '../middleware/chatbot-download-policy.js';
import { referenciaAuditoriaChatbot } from '../utils/chatbot-audit.js';
import {
  configuracionInformes,
  ejecutarInformeAgregado,
  validarSolicitudInforme,
} from '../services/chatbot-report.service.js';

function registrarAuditoria(logger, informe, resultado, inicio, actorRef) {
  logger.info(JSON.stringify({
    evento: 'chatbot_informe',
    informe,
    ocurrido_at: new Date().toISOString(),
    resultado,
    duracion_ms: Math.round(performance.now() - inicio),
    ...(actorRef ? { actor_ref: actorRef } : {}),
  }));
}

export function crearControladorInformesChatbot({ dbPool = pool, logger = console } = {}) {
  return async function consultarInformeChatbot(req, res) {
    const inicio = performance.now();
    const actorRef = referenciaAuditoriaChatbot(req);
    const validacion = validarSolicitudInforme(req.body);
    if (validacion.error) {
      registrarAuditoria(logger, 'invalido', '400', inicio, actorRef);
      return res.status(400).json({ error: 'La solicitud del informe no es válida' });
    }

    let client;
    let transaccionAbierta = false;
    try {
      client = await dbPool.connect();
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      transaccionAbierta = true;
      await client.query("SELECT set_config('statement_timeout', $1, true)", [
        String(configuracionInformes.timeoutMs),
      ]);

      const resultado = await ejecutarInformeAgregado(client, validacion);
      if (resultado.error) {
        await client.query('ROLLBACK');
        transaccionAbierta = false;
        registrarAuditoria(logger, validacion.informe, String(resultado.status), inicio, actorRef);
        return res.status(resultado.status).json({ error: resultado.error });
      }

      await client.query('COMMIT');
      transaccionAbierta = false;
      const respuesta = {
        ...resultado,
        generado_en: new Date().toISOString(),
        descargas_habilitadas: politicaDescargas.habilitadas,
      };
      registrarAuditoria(logger, validacion.informe, '200', inicio, actorRef);
      return res.json(respuesta);
    } catch (error) {
      if (transaccionAbierta) {
        try {
          await client.query('ROLLBACK');
        } catch (errorRollback) {
          logger.error('No se pudo revertir la transacción del informe.');
        }
      }
      const timeout = error.code === '57014';
      logger.error('Falló la consulta agregada del chatbot.');
      registrarAuditoria(logger, validacion.informe, timeout ? 'timeout' : '500', inicio, actorRef);
      return res.status(timeout ? 503 : 500).json({
        error: timeout
          ? 'El informe tardó demasiado. Reduce los filtros e inténtalo de nuevo.'
          : 'No se pudo generar el informe. Inténtalo de nuevo.',
      });
    } finally {
      client?.release();
    }
  };
}

export const consultarInformeChatbot = crearControladorInformesChatbot();
