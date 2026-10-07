import { Router } from 'express';
import {
	actualizarAsistencia,
	crearEvento,
	cancelarEvento,
	listarEventos,
	marcarEventoRealizado,
} from '../controllers/calendario.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/eventos', listarEventos);
router.post('/eventos', crearEvento);
router.patch('/eventos/:id/asistencia', actualizarAsistencia);
router.patch('/eventos/:id/realizado', marcarEventoRealizado);
router.patch('/eventos/:id/cancelar', cancelarEvento);

export default router;