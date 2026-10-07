import { Router } from 'express';
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
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
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
router.get('/educativa/materias', listarMateriasEducativas);
router.get('/educativa', listarBibliotecaEducativa);
router.get('/educativa/:id/archivo', descargarDocumentoEducativo);
router.post('/educativa', manejarArchivo, cargarDocumentoEducativo);
router.delete('/educativa/:id', eliminarDocumentoEducativo);
router.get('/', listarDocumentos);
router.get('/categorias', listarCategorias);
router.get('/:id/archivo', descargarDocumento);
router.patch('/:id', manejarArchivo, editarDocumento);
router.patch('/:id/publicacion', actualizarPublicacionDocumento);
router.delete('/:id', eliminarDocumento);
router.post('/', manejarArchivo, cargarDocumento);

export default router;