import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
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
router.get('/', autorizarDirectivaPrincipal(), manejarAsync(listarAfiliados));
router.get('/roles', autorizar('Administrador SUTENS'), manejarAsync(listarRoles));
router.get('/exportar', autorizarDirectivaPrincipal(), manejarAsync(exportarAfiliados));
router.post('/exportar', autorizarDirectivaPrincipal(), manejarAsync(exportarAfiliados));

// POST /api/afiliados  -> registrar usuario (admin)
router.post('/', autorizar('Administrador SUTENS'), manejarAsync(registrarPorAdmin));

// PATCH /api/afiliados/:id/estado  { estado: 'aprobado' | 'rechazado' }
router.patch('/:id/estado', autorizarCambioEstadoSolicitud, manejarAsync(cambiarEstado));
router.patch('/:id/roles', autorizar('Administrador SUTENS'), manejarAsync(actualizarRoles));
router.delete('/:id', autorizar('Administrador SUTENS'), manejarAsync(eliminarAfiliado));
router.post('/:id/contrasena-temporal', autorizar('Administrador SUTENS'), manejarAsync(restablecerContrasenaTemporal));
router.patch('/:id/asignacion', autorizarDirectivaPrincipal(), manejarAsync(asignarAfiliado));
router.patch('/:id/estado-sindical', autorizarDirectivaPrincipal(), manejarAsync(cambiarEstadoSindical));

export default router;
