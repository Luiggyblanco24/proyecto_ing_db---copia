import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { subirObjetoStorage, tipoMimeDeArchivo } from '../src/services/supabase-storage.service.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cargas = [
  {
    directorio: path.join(raiz, 'storage', 'biblioteca'),
    tipo: 'privado',
    prefijo: 'library',
    patron: /^[0-9a-f-]{36}\.(?:pdf|doc|docx)$/i,
  },
  {
    directorio: path.join(raiz, 'public', 'uploads', 'avatars'),
    tipo: 'publico',
    prefijo: 'avatars',
    patron: /^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i,
  },
];

async function migrarDirectorio({ directorio, tipo, prefijo, patron }) {
  let entradas;
  try {
    entradas = await readdir(directorio, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }

  let migrados = 0;
  for (const entrada of entradas) {
    if (!entrada.isFile() || !patron.test(entrada.name)) continue;
    const contenido = await readFile(path.join(directorio, entrada.name));
    await subirObjetoStorage(tipo, `${prefijo}/${entrada.name}`, contenido, {
      contentType: tipoMimeDeArchivo(entrada.name),
      upsert: true,
    });
    migrados += 1;
  }
  return migrados;
}

try {
  const [documentos, fotos] = await Promise.all(cargas.map(migrarDirectorio));
  console.log(`Migración de archivos terminada: ${documentos} documentos y ${fotos} fotos.`);
} catch (error) {
  console.error('No se pudieron migrar los archivos locales a Supabase Storage:', error.message);
  process.exitCode = 1;
}
