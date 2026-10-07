import { Router } from 'express';
import { listarAfiliadosVisibles } from '../controllers/membresia.controller.js';
import { obtenerEstadisticasAfiliacion } from '../controllers/estadisticas.controller.js';
import { exportarAfiliadosVisibles } from '../controllers/exportacion.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/estadisticas', obtenerEstadisticasAfiliacion);
router.get('/exportar', exportarAfiliadosVisibles);
router.get('/afiliados', listarAfiliadosVisibles);

export default router;