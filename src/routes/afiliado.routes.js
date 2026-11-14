import { Router } from 'express';
import {
  listarAfiliados,
  listarRoles,
  actualizarRoles,
  eliminarAfiliado,
  restablecerContrasenaTemporal,
  cambiarEstado,
  registrarPorAdmin,
} from '../controllers/afiliado.controller.js';
import { autenticar } from '../middleware/auth.js';
import {
  autorizar,
  autorizarDirectivaPrincipal,
  autorizarSecretarioGeneral,
} from '../middleware/rbac.js';
import {
  asignarAfiliado,
  cambiarEstadoSindical,
} from '../controllers/subdirectiva.controller.js';
import { exportarAfiliados } from '../controllers/exportacion.controller.js';

const router = Router();

function autorizarCambioEstadoSolicitud(req, res, next) {
  if (req.body?.estado === 'aprobado') return autorizarDirectivaPrincipal()(req, res, next);
  if (req.body?.estado === 'rechazado') return autorizarSecretarioGeneral()(req, res, next);
  return res.status(400).json({ error: 'La decisión solicitada no es válida' });
}

router.use(autenticar);

// GET /api/afiliados?estado=pendiente
router.get('/', autorizarDirectivaPrincipal(), listarAfiliados);
router.get('/roles', autorizar('Administrador SUTENS'), listarRoles);
router.get('/exportar', autorizarDirectivaPrincipal(), exportarAfiliados);
router.post('/exportar', autorizarDirectivaPrincipal(), exportarAfiliados);

// POST /api/afiliados  -> registrar usuario (admin)
router.post('/', autorizar('Administrador SUTENS'), registrarPorAdmin);

// PATCH /api/afiliados/:id/estado  { estado: 'aprobado' | 'rechazado' }
router.patch('/:id/estado', autorizarCambioEstadoSolicitud, cambiarEstado);
router.patch('/:id/roles', autorizar('Administrador SUTENS'), actualizarRoles);
router.delete('/:id', autorizar('Administrador SUTENS'), eliminarAfiliado);
router.post('/:id/contrasena-temporal', autorizar('Administrador SUTENS'), restablecerContrasenaTemporal);
router.patch('/:id/asignacion', autorizarDirectivaPrincipal(), asignarAfiliado);
router.patch('/:id/estado-sindical', autorizarDirectivaPrincipal(), cambiarEstadoSindical);

export default router;
