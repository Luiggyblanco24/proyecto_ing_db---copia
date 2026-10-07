import { Router } from 'express';
import multer from 'multer';
import {
  agregarImagenGaleria,
  actualizarImagenGaleria,
  eliminarImagenGaleria,
  listarDirectivaDepartamental,
  listarDirectivasSubdirectivas,
  listarGaleriaPublica,
  servirImagenGaleria,
} from '../controllers/public.controller.js';
import {
  listarDocumentosPublicos,
  descargarDocumentoPublico,
} from '../controllers/biblioteca.controller.js';
import { autenticar } from '../middleware/auth.js';
import { autorizarDirectivaPrincipal } from '../middleware/rbac.js';

const router = Router();
const cargarImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('La galería solo admite imágenes JPG, PNG o WebP'));
      return;
    }
    callback(null, true);
  },
}).single('imagen');

function manejarImagen(req, res, next) {
  cargarImagen(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: error.message || 'No se pudo recibir la imagen' });
  });
}

router.get('/directivas/departamental', listarDirectivaDepartamental);
router.get('/directivas/subdirectivas', listarDirectivasSubdirectivas);
router.get('/galeria', listarGaleriaPublica);
router.get('/galeria/:id/imagen', servirImagenGaleria);
router.get('/documentos', listarDocumentosPublicos);
router.get('/documentos/:id/descargar', descargarDocumentoPublico);
router.post('/galeria', autenticar, autorizarDirectivaPrincipal(), manejarImagen, agregarImagenGaleria);
router.patch('/galeria/:id', autenticar, autorizarDirectivaPrincipal(), manejarImagen, actualizarImagenGaleria);
router.delete('/galeria/:id', autenticar, autorizarDirectivaPrincipal(), eliminarImagenGaleria);

export default router;
