import { Router } from 'express';
import authRoutes from './auth.routes.js';
import afiliadoRoutes from './afiliado.routes.js';
import subdirectivaRoutes from './subdirectiva.routes.js';
import membresiaRoutes from './membresia.routes.js';
import calendarioRoutes from './calendario.routes.js';
import bibliotecaRoutes from './biblioteca.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/afiliados', afiliadoRoutes);
router.use('/subdirectivas', subdirectivaRoutes);
router.use('/membresia', membresiaRoutes);
router.use('/calendario', calendarioRoutes);
router.use('/biblioteca', bibliotecaRoutes);

export default router;
