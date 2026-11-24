import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
import multer from 'multer';
import {
  contarSubdirectivas,
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
import {
  listarEspaciosPortada,
  listarImagenesPortada,
  publicarImagenPortada,
  restaurarImagenPortada,
  servirImagenPortada,
} from '../controllers/portada.controller.js';
import { autorizarDirectivaPrincipal, autorizarMiembroDirectivaPrincipal } from '../middleware/rbac.js';

const router = Router();
const gestionarPortada = [autenticar, autorizarMiembroDirectivaPrincipal()];
const cargarImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 8, fieldSize: 2048 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Solo se admiten imágenes JPG, PNG o WebP'));
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

router.get('/subdirectivas/total', manejarAsync(contarSubdirectivas));
router.get('/directivas/departamental', manejarAsync(listarDirectivaDepartamental));
router.get('/directivas/subdirectivas', manejarAsync(listarDirectivasSubdirectivas));
router.get('/galeria', manejarAsync(listarGaleriaPublica));
router.get('/galeria/:id/imagen', manejarAsync(servirImagenGaleria));
router.get('/documentos', manejarAsync(listarDocumentosPublicos));
router.get('/documentos/:id/descargar', manejarAsync(descargarDocumentoPublico));
router.post('/galeria', autenticar, autorizarDirectivaPrincipal(), manejarImagen, manejarAsync(agregarImagenGaleria));
router.patch('/galeria/:id', autenticar, autorizarDirectivaPrincipal(), manejarImagen, manejarAsync(actualizarImagenGaleria));
router.delete('/galeria/:id', autenticar, autorizarDirectivaPrincipal(), manejarAsync(eliminarImagenGaleria));

router.get('/portada', manejarAsync(listarImagenesPortada));
router.get('/portada/espacios', ...gestionarPortada, manejarAsync(listarEspaciosPortada));
router.get('/portada/:clave/imagen', manejarAsync(servirImagenPortada));
router.put('/portada/:clave', ...gestionarPortada, manejarImagen, manejarAsync(publicarImagenPortada));
router.delete('/portada/:clave', ...gestionarPortada, manejarAsync(restaurarImagenPortada));

export default router;
