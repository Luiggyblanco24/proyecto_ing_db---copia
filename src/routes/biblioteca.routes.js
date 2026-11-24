import { Router } from 'express';
import { manejarAsync } from '../middleware/errores.js';
import multer from 'multer';
import path from 'node:path';
import {
  cargarDocumento,
  descargarDocumento,
  editarDocumento,
  eliminarDocumento,
  actualizarPublicacionDocumento,
  listarCategorias,
  listarDocumentos,
} from '../controllers/biblioteca.controller.js';
import {
  cargarDocumentoEducativo,
  descargarDocumentoEducativo,
  eliminarDocumentoEducativo,
  listarBibliotecaEducativa,
  listarMateriasEducativas,
} from '../controllers/biblioteca-educativa.controller.js';
import { autenticar } from '../middleware/auth.js';

const tiposPermitidos = new Map([
  ['.pdf', 'application/pdf'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

const cargarArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLocaleLowerCase('en');
    if (tiposPermitidos.get(extension) !== file.mimetype) {
      callback(new Error('Solo se permiten archivos PDF, DOC o DOCX'));
      return;
    }
    callback(null, true);
  },
}).single('archivo');

function manejarArchivo(req, res, next) {
  cargarArchivo(req, res, (error) => {
    if (!error) return next();
    const estado = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(estado).json({ error: error.message || 'No se pudo recibir el archivo' });
  });
}

const router = Router();
router.use(autenticar);
router.get('/educativa/materias', manejarAsync(listarMateriasEducativas));
router.get('/educativa', manejarAsync(listarBibliotecaEducativa));
router.get('/educativa/:id/archivo', manejarAsync(descargarDocumentoEducativo));
router.post('/educativa', manejarArchivo, manejarAsync(cargarDocumentoEducativo));
router.delete('/educativa/:id', manejarAsync(eliminarDocumentoEducativo));
router.get('/', manejarAsync(listarDocumentos));
router.get('/categorias', manejarAsync(listarCategorias));
router.get('/:id/archivo', manejarAsync(descargarDocumento));
router.patch('/:id', manejarArchivo, manejarAsync(editarDocumento));
router.patch('/:id/publicacion', manejarAsync(actualizarPublicacionDocumento));
router.delete('/:id', manejarAsync(eliminarDocumento));
router.post('/', manejarArchivo, manejarAsync(cargarDocumento));

export default router;