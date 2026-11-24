import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
import { listarAfiliadosVisibles } from '../controllers/membresia.controller.js';
import { obtenerEstadisticasAfiliacion } from '../controllers/estadisticas.controller.js';
import { exportarAfiliadosVisibles } from '../controllers/exportacion.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/estadisticas', manejarAsync(obtenerEstadisticasAfiliacion));
router.get('/exportar', manejarAsync(exportarAfiliadosVisibles));
router.post('/exportar', manejarAsync(exportarAfiliadosVisibles));
router.get('/afiliados', manejarAsync(listarAfiliadosVisibles));

export default router;
