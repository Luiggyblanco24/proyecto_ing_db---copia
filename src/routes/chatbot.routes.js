import { Router } from 'express';
import { consultarInformeChatbot } from '../controllers/chatbot-report.controller.js';
import { exportarInformeChatbot } from '../controllers/chatbot-export.controller.js';
import { autenticar } from '../middleware/auth.js';
import { autorizarInformesChatbot } from '../middleware/chatbot-report-auth.js';
import { limitarInformesChatbot } from '../middleware/chatbot-report-limit.js';
import { auditarIntentoDescarga, exigirDescargasHabilitadas, limitarDescargasChatbot } from '../middleware/chatbot-download-policy.js';
import { exigirChatbotHabilitado } from '../config/chatbot.js';

const router = Router();

router.use(exigirChatbotHabilitado);
router.use('/informes/exportar', auditarIntentoDescarga);
router.use('/informes', (req, res, next) => {
  const inicio = performance.now();
  res.on('finish', () => {
    if (res.statusCode === 401 && !req.originalUrl.split('?')[0].endsWith('/exportar')) {
      console.info(JSON.stringify({
        evento: 'chatbot_informe',
        ocurrido_at: new Date().toISOString(),
        resultado: '401',
        duracion_ms: Math.round(performance.now() - inicio),
      }));
    }
  });
  next();
});
router.use(autenticar);
router.post('/informes', limitarInformesChatbot, autorizarInformesChatbot, consultarInformeChatbot);
router.post('/informes/exportar', exigirDescargasHabilitadas, limitarDescargasChatbot, autorizarInformesChatbot, exportarInformeChatbot);

export default router;
