import { Router } from 'express';
import {
  listarSubdirectivas,
  listarCargosSindicales,
  listarRolesLaborales,
  crearSubdirectiva,
  renombrarSubdirectiva,
  crearInstitucion,
  renombrarInstitucion,
  crearSede,
  renombrarSede,
} from '../controllers/subdirectiva.controller.js';
import { autenticar } from '../middleware/auth.js';
import { autorizarDirectivaPrincipal } from '../middleware/rbac.js';

const router = Router();

router.use(autenticar);

router.get('/', listarSubdirectivas);
router.get('/cargos', listarCargosSindicales);
router.get('/roles-laborales', listarRolesLaborales);
router.post('/', autorizarDirectivaPrincipal(), crearSubdirectiva);
router.patch('/:id', autorizarDirectivaPrincipal(), renombrarSubdirectiva);
router.post('/:id/instituciones', autorizarDirectivaPrincipal(), crearInstitucion);
router.patch('/instituciones/:id', autorizarDirectivaPrincipal(), renombrarInstitucion);
router.post('/instituciones/:id/sedes', autorizarDirectivaPrincipal(), crearSede);
router.patch('/sedes/:id', autorizarDirectivaPrincipal(), renombrarSede);

export default router;