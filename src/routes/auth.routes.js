import { Router } from 'express';
import multer from 'multer';
import {
	registrar,
	login,
	me,
	actualizarPerfil,
} from '../controllers/auth.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();
const cargarFotoPerfil = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 4 * 1024 * 1024, files: 1 },
	fileFilter(req, file, callback) {
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
			callback(new Error('La foto debe ser JPG, PNG o WebP'));
			return;
		}
		callback(null, true);
	},
}).single('foto');

function manejarFotoPerfil(req, res, next) {
	cargarFotoPerfil(req, res, (error) => {
		if (!error) return next();
		const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
		return res.status(status).json({ error: error.message || 'No se pudo recibir la foto' });
	});
}

// POST /api/auth/registrar  -> registro público de afiliación
router.post('/registrar', registrar);

// POST /api/auth/login      -> inicio de sesión (devuelve JWT)
router.post('/login', login);

// GET /api/auth/me          -> perfil del usuario autenticado
router.get('/me', autenticar, me);
router.patch('/me', autenticar, manejarFotoPerfil, actualizarPerfil);

export default router;
