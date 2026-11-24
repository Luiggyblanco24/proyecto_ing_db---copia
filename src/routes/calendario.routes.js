import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
import {
	actualizarAsistencia,
	crearEvento,
	cancelarEvento,
	eliminarEvento,
	listarEventos,
	listarNotificaciones,
	marcarEventoRealizado,
	marcarNotificacionesLeidas,
} from '../controllers/calendario.controller.js';
import { exportarAsistentes } from '../controllers/calendario-exportacion.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/eventos', manejarAsync(listarEventos));
router.get('/eventos/:id/asistentes/exportar', manejarAsync(exportarAsistentes));
router.get('/notificaciones', manejarAsync(listarNotificaciones));
router.patch('/notificaciones/leer', manejarAsync(marcarNotificacionesLeidas));
router.post('/eventos', manejarAsync(crearEvento));
router.patch('/eventos/:id/asistencia', manejarAsync(actualizarAsistencia));
router.patch('/eventos/:id/realizado', manejarAsync(marcarEventoRealizado));
router.patch('/eventos/:id/cancelar', manejarAsync(cancelarEvento));
router.delete('/eventos/:id', manejarAsync(eliminarEvento));

export default router;