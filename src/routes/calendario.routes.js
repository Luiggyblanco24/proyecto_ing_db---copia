import { Router } from 'express';
import {
	actualizarAsistencia,
	crearEvento,
	cancelarEvento,
	listarEventos,
	listarNotificaciones,
	marcarEventoRealizado,
	marcarNotificacionesLeidas,
} from '../controllers/calendario.controller.js';
import { exportarAsistentes } from '../controllers/calendario-exportacion.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/eventos', listarEventos);
router.get('/eventos/:id/asistentes/exportar', exportarAsistentes);
router.get('/notificaciones', listarNotificaciones);
router.patch('/notificaciones/leer', marcarNotificacionesLeidas);
router.post('/eventos', crearEvento);
router.patch('/eventos/:id/asistencia', actualizarAsistencia);
router.patch('/eventos/:id/realizado', marcarEventoRealizado);
router.patch('/eventos/:id/cancelar', cancelarEvento);

export default router;