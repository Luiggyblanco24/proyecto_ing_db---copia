import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import PDFDocument from 'pdfkit';
import { PDFDocument as PdfLibDocument } from 'pdf-lib';
import { Resvg } from '@resvg/resvg-js';

const execFile = promisify(execFileCallback);
const directorioMarca = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/brand');
let logoPngEnCache;

export async function obtenerLogoPng() {
  if (!logoPngEnCache) {
    logoPngEnCache = readFile(path.join(directorioMarca, 'sutens-logo-horizontal.svg'))
      .then((svg) => new Resvg(svg, { fitTo: { mode: 'width', value: 900 } }).render().asPng())
      .catch((error) => {
        logoPngEnCache = undefined;
        throw error;
      });
  }
  return logoPngEnCache;
}

function crearPortadaPdf(titulo, categoria, logo) {
  return new Promise((resolve, reject) => {
    const documento = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${titulo} - SUTENS`, Author: 'SUTENS' } });
    const fragmentos = [];
    documento.on('data', (fragmento) => fragmentos.push(fragmento));
    documento.on('end', () => resolve(Buffer.concat(fragmentos)));
    documento.on('error', reject);

    documento.rect(0, 0, documento.page.width, 12).fill('#1b7a38');
    documento.image(logo, 48, 56, { width: 250 });
    documento.moveTo(48, 150).lineTo(documento.page.width - 48, 150).lineWidth(1).strokeColor('#e5e1d6').stroke();
    documento.font('Helvetica-Bold').fontSize(24).fillColor('#1e293b')
      .text('Documento SUTENS', 48, 190, { width: documento.page.width - 96 });
    documento.font('Helvetica').fontSize(18).fillColor('#1b7a38')
      .text(titulo, 48, 240, { width: documento.page.width - 96 });
    documento.fontSize(12).fillColor('#475569')
      .text(categoria, 48, 274, { width: documento.page.width - 96 });
    documento.moveTo(48, documento.page.height - 90)
      .lineTo(documento.page.width - 48, documento.page.height - 90)
      .lineWidth(1).strokeColor('#e5e1d6').stroke();
    documento.fontSize(10).fillColor('#475569')
      .text('Copia de consulta generada por la plataforma SUTENS.', 48, documento.page.height - 76, {
        width: documento.page.width - 96,
        align: 'center',
      });
    documento.end();
  });
}

async function convertirOfficeAPdf(contenido, extension) {
  const directorioTemporal = await mkdtemp(path.join(os.tmpdir(), 'sutens-documento-'));
  const archivoEntrada = path.join(directorioTemporal, `documento${extension}`);
  const archivoPerfil = path.join(directorioTemporal, 'perfil-libreoffice');
  const archivoSalida = path.join(directorioTemporal, 'documento.pdf');
  const ejecutable = process.env.LIBREOFFICE_PATH || 'soffice';

  try {
    await writeFile(archivoEntrada, contenido, { flag: 'wx' });
    await execFile(ejecutable, [
      '--headless',
      `-env:UserInstallation=${pathToFileURL(archivoPerfil).href}`,
      '--convert-to',
      'pdf',
      '--outdir',
      directorioTemporal,
      archivoEntrada,
    ], { timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 });
    return await readFile(archivoSalida);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const errorInstalacion = new Error(
        'La conversión de Word a PDF requiere LibreOffice en el servidor. Instálalo o configura LIBREOFFICE_PATH.'
      );
      errorInstalacion.code = 'LIBREOFFICE_NOT_INSTALLED';
      throw errorInstalacion;
    }
    if (error.code === 'ETIMEDOUT') {
      const errorTiempo = new Error('La conversión del documento excedió el tiempo permitido');
      errorTiempo.code = 'OFFICE_CONVERSION_TIMEOUT';
      throw errorTiempo;
    }
    throw error;
  } finally {
    await rm(directorioTemporal, { recursive: true, force: true });
  }
}

export async function crearPdfDescargableConLogo({ contenido, extension, titulo, categoria }) {
  const pdfOriginal = extension === '.pdf'
    ? contenido
    : await convertirOfficeAPdf(contenido, extension);
  const logo = await obtenerLogoPng();
  const portada = await crearPortadaPdf(titulo, categoria, logo);
  let documentoOriginal;
  let documentoPortada;
  try {
    documentoOriginal = await PdfLibDocument.load(pdfOriginal);
    documentoPortada = await PdfLibDocument.load(portada);
  } catch (error) {
    error.code = 'INVALID_PDF_DOCUMENT';
    throw error;
  }

  const resultado = await PdfLibDocument.create();
  resultado.setTitle(`${titulo} - SUTENS`);
  resultado.setAuthor('SUTENS');
  resultado.setSubject(categoria);
  const portadaCopiada = await resultado.copyPages(documentoPortada, documentoPortada.getPageIndices());
  const paginasOriginales = await resultado.copyPages(documentoOriginal, documentoOriginal.getPageIndices());
  [...portadaCopiada, ...paginasOriginales].forEach((pagina) => resultado.addPage(pagina));
  return Buffer.from(await resultado.save());
}

export async function enviarDescargaPdfConLogo(res, { contenido, extension, nombre, categoria }) {
  try {
    const pdf = await crearPdfDescargableConLogo({
      contenido,
      extension: extension.toLocaleLowerCase('en'),
      titulo: nombre,
      categoria,
    });
    const nombreSeguro = nombre.replace(/[\\/:*?"<>|]/g, '_');
    return res
      .set('Cache-Control', 'private, no-store')
      .type('application/pdf')
      .attachment(`${nombreSeguro}.pdf`)
      .send(pdf);
  } catch (error) {
    console.error('No se pudo generar la copia PDF con marca SUTENS:', error);
    const status = error.code === 'LIBREOFFICE_NOT_INSTALLED' || error.code === 'OFFICE_CONVERSION_TIMEOUT'
      ? 503
      : error.code === 'ENOENT'
        ? 404
        : error.code === 'INVALID_PDF_DOCUMENT'
          ? 422
          : 500;
    return res.status(status).json({
      error: error.code === 'INVALID_PDF_DOCUMENT'
        ? 'El documento no es un PDF válido y no se pudo preparar su copia con logo'
        : error.message || 'No se pudo generar la copia descargable con logo SUTENS',
    });
  }
}
