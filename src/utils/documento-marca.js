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

    const ancho = documento.page.width;
    const alto = documento.page.height;
    const margen = 52;
    const anchoContenido = ancho - margen * 2;
    const pieY = alto - 74;

    documento.rect(0, 0, ancho, alto).fill('#fff');
    documento.rect(0, 0, ancho, 10).fill('#1b7a38');
    documento.rect(0, 10, 128, 3).fill('#f59e0b');
    documento.image(logo, margen, 42, { width: 226 });

    documento.font('Helvetica-Bold').fontSize(9).fillColor('#1b7a38')
      .text('BIBLIOTECA DOCUMENTAL', ancho - margen - 190, 60, {
        width: 190,
        align: 'right',
        characterSpacing: 1.1,
      });
    documento.font('Helvetica').fontSize(9).fillColor('#64748b')
      .text('SINDICATO UNITARIO · NORTE DE SANTANDER', ancho - margen - 220, 77, {
        width: 220,
        align: 'right',
        characterSpacing: 0.35,
      });

    const panelY = 150;
    const panelAlto = 476;
    documento.roundedRect(margen, panelY, anchoContenido, panelAlto, 18).fill('#f5f8f3');
    documento.rect(margen, panelY + 20, 4, panelAlto - 40).fill('#1b7a38');

    documento.save();
    documento.fillOpacity(0.08).circle(ancho - 8, panelY + panelAlto - 6, 118).fill('#1b7a38');
    documento.fillOpacity(0.12).circle(ancho - 20, panelY + panelAlto - 4, 76).fill('#f59e0b');
    documento.restore();

    documento.roundedRect(margen + 28, panelY + 38, 152, 27, 13.5).fill('#e4f1e6');
    documento.font('Helvetica-Bold').fontSize(9).fillColor('#17652f')
      .text('DOCUMENTO SUTENS', margen + 41, panelY + 47, {
        width: 132,
        characterSpacing: 0.8,
      });

    documento.moveTo(margen + 28, panelY + 91)
      .lineTo(margen + 72, panelY + 91)
      .lineWidth(3).strokeColor('#f59e0b').stroke();

    const tituloY = panelY + 119;
    const tituloTamano = titulo.length > 105 ? 25 : titulo.length > 62 ? 29 : 34;
    documento.font('Helvetica-Bold').fontSize(tituloTamano).fillColor('#1e293b')
      .text(titulo, margen + 28, tituloY, {
        width: anchoContenido - 56,
        lineGap: 5,
        paragraphGap: 4,
      });

    const tituloAlto = documento.heightOfString(titulo, {
      width: anchoContenido - 56,
      lineGap: 5,
      paragraphGap: 4,
    });
    const categoriaY = Math.min(tituloY + tituloAlto + 28, panelY + panelAlto - 94);
    documento.font('Helvetica').fontSize(10).fillColor('#64748b')
      .text('CATEGORÍA', margen + 28, categoriaY, {
        width: anchoContenido - 56,
        characterSpacing: 1,
      });
    documento.font('Helvetica-Bold').fontSize(15).fillColor('#17652f')
      .text(categoria, margen + 28, categoriaY + 18, {
        width: anchoContenido - 56,
        lineGap: 3,
      });

    documento.moveTo(margen, pieY)
      .lineTo(ancho - margen, pieY)
      .lineWidth(1).strokeColor('#e5e7df').stroke();
    documento.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
      .text('SUTENS', margen, pieY + 18, { width: 90, characterSpacing: 1 });
    documento.font('Helvetica').fontSize(9).fillColor('#64748b')
      .text('Copia de consulta generada por la plataforma SUTENS.', margen + 90, pieY + 18, {
        width: anchoContenido - 90,
        align: 'right',
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
