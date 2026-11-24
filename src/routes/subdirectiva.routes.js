import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
import {
  listarSubdirectivas,
  listarCargosSindicales,
  crearCargoSindical,
  listarRolesLaborales,
  crearRolLaboral,
  crearSubdirectiva,
  renombrarSubdirectiva,
  crearInstitucion,
  renombrarInstitucion,
  crearSede,
  renombrarSede,
  eliminarSubdirectiva,
  eliminarInstitucion,
  eliminarSede,
} from '../controllers/subdirectiva.controller.js';
import { autenticar } from '../middleware/auth.js';
import { autorizar, autorizarDirectivaPrincipal } from '../middleware/rbac.js';

const router = Router();

router.use(autenticar);

router.get('/', manejarAsync(listarSubdirectivas));
router.get('/cargos', manejarAsync(listarCargosSindicales));
router.get('/roles-laborales', manejarAsync(listarRolesLaborales));
router.post('/cargos', autorizar('Administrador SUTENS'), manejarAsync(crearCargoSindical));
router.post('/roles-laborales', autorizar('Administrador SUTENS'), manejarAsync(crearRolLaboral));
router.post('/', autorizarDirectivaPrincipal(), manejarAsync(crearSubdirectiva));
router.patch('/:id', autorizarDirectivaPrincipal(), manejarAsync(renombrarSubdirectiva));
router.post('/:id/instituciones', autorizarDirectivaPrincipal(), manejarAsync(crearInstitucion));
router.patch('/instituciones/:id', autorizarDirectivaPrincipal(), manejarAsync(renombrarInstitucion));
router.post('/instituciones/:id/sedes', autorizarDirectivaPrincipal(), manejarAsync(crearSede));
router.patch('/sedes/:id', autorizarDirectivaPrincipal(), manejarAsync(renombrarSede));
router.delete('/sedes/:id', autorizarDirectivaPrincipal(), manejarAsync(eliminarSede));
router.delete('/instituciones/:id', autorizarDirectivaPrincipal(), manejarAsync(eliminarInstitucion));
router.delete('/:id', autorizarDirectivaPrincipal(), manejarAsync(eliminarSubdirectiva));

export default router;