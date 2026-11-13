import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { consultarAfiliados, validarFiltroSubdirectiva } from './afiliado.controller.js';
import { obtenerAfiliadosVisibles } from './membresia.controller.js';
import { obtenerLogoPng } from '../utils/documento-marca.js';

const columnas = [
  ['Nombre', 'nombre_completo', 30],
  ['Cédula', 'cedula', 16],
  ['Correo', 'correo', 32],
  ['Subdirectiva', 'subdirectiva', 28],
  ['Institución educativa', 'institucion', 30],
  ['Cargo sindical', 'cargo_sindical', 24],
  ['Sede', 'sede', 28],
  ['Rol laboral', 'rol_laboral', 24],
  ['Estado solicitud', 'estado', 18],
  ['Estado sindical', 'estado_sindical', 18],
];

export function datosExportacion(afiliados) {
  return afiliados.map((afiliado) => ({
    nombre_completo: [afiliado.nombre1, afiliado.nombre2, afiliado.apellido1, afiliado.apellido2]
      .filter(Boolean).join(' '),
    cedula: afiliado.cedula,
    correo: afiliado.correo,
    subdirectiva: afiliado.subdirectiva,
    institucion: afiliado.institucion,
    cargo_sindical: afiliado.cargo_sindical,
    sede: afiliado.sede,
    rol_laboral: afiliado.rol_laboral,
    estado: afiliado.estado,
    estado_sindical: afiliado.estado_sindical,
  }));
}

export function protegerTextoExcel(valor) {
  const texto = String(valor ?? '');
  return /^[=+@\-]/.test(texto) ? `'${texto}` : texto;
}

export async function crearExcelAfiliados(registros, { titulo = 'Padrón de afiliados SUTENS', metadatos = [] } = {}) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SUTENS';
  libro.subject = 'Exportación del padrón de afiliados';
  libro.title = titulo;
  const hoja = libro.addWorksheet('Afiliados');
  hoja.columns = columnas.map(([, key, width]) => ({ key, width, style: { font: { name: 'Aptos', size: 10 }, alignment: { vertical: 'middle' } } }));
  hoja.properties.tabColor = { argb: 'FF1B7A38' };
  hoja.views = [{ state: 'frozen', ySplit: 5, showGridLines: false }];
  hoja.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  hoja.headerFooter.oddFooter = '&LSUTENS · Padrón de afiliados&C&P de &N&RConfidencial';
  hoja.mergeCells('C1:J1');
  hoja.mergeCells('C2:J2');
  hoja.mergeCells('A3:J3');
  hoja.addImage(libro.addImage({ buffer: await obtenerLogoPng(), extension: 'png' }), {
    tl: { col: 0, row: 0 },
    ext: { width: 168, height: 37 },
  });
  hoja.getCell('C1').value = protegerTextoExcel(titulo);
  hoja.getCell('C1').font = { name: 'Aptos Display', bold: true, size: 19, color: { argb: 'FF1B7A38' } };
  hoja.getCell('C1').alignment = { vertical: 'middle' };
  hoja.getCell('C2').value = `INFORME INSTITUCIONAL  ·  ${new Date().toLocaleDateString('es-CO')}  ·  ${registros.length} afiliados`;
  hoja.getCell('C2').font = { name: 'Aptos', bold: true, size: 9, color: { argb: 'FF64748B' } };
  hoja.getCell('C2').alignment = { vertical: 'middle' };
  hoja.getRow(1).height = 31;
  hoja.getRow(2).height = 24;
  hoja.getRow(3).height = 12;
  hoja.getRow(4).height = 7;
  hoja.getRow(5).values = columnas.map(([header]) => header);
  hoja.getRow(5).font = { name: 'Aptos', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17652F' } };
  hoja.getRow(5).height = 28;
  hoja.getRow(5).alignment = { vertical: 'middle', wrapText: true };
  hoja.getRow(5).eachCell((celda) => {
    celda.border = { bottom: { style: 'medium', color: { argb: 'FFF59E0B' } } };
  });
  for (const registro of registros) {
    const fila = hoja.addRow(Object.fromEntries(columnas.map(([, key]) => [key, protegerTextoExcel(registro[key])])));
    fila.height = 23;
    fila.alignment = { vertical: 'middle' };
    fila.eachCell((celda) => {
      celda.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8E4' } } };
      if (fila.number % 2 === 0) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8F5' } };
      }
    });
    for (const key of ['estado', 'estado_sindical']) {
      const celda = fila.getCell(key);
      celda.font = { name: 'Aptos', size: 9, bold: true, color: { argb: 'FF17652F' } };
      celda.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }
  hoja.autoFilter = { from: 'A5', to: `${String.fromCharCode(64 + columnas.length)}5` };

  if (metadatos.length) {
    const detalles = libro.addWorksheet('Detalles del informe');
    detalles.properties.tabColor = { argb: 'FFF59E0B' };
    detalles.columns = [{ width: 120 }];
    detalles.views = [{ showGridLines: false }];
    detalles.addRow(['DETALLES DEL INFORME']);
    detalles.getRow(1).height = 30;
    detalles.getRow(1).font = { name: 'Aptos Display', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    detalles.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17652F' } };
    metadatos.forEach((linea, indice) => {
      const fila = detalles.addRow([protegerTextoExcel(linea)]);
      fila.height = 23;
      fila.font = { name: 'Aptos', size: 10, color: { argb: 'FF334155' } };
      if (indice % 2 === 0) fila.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F7F2' } };
    });
  }
  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function crearPdfAfiliados(registros, { titulo = 'Padrón de afiliados SUTENS', metadatos = [], destino = null } = {}) {
  const documento = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: false });
  const logo = await obtenerLogoPng();
  const fragmentos = [];
  let terminado;
  if (destino) {
    documento.pipe(destino);
  } else {
    terminado = new Promise((resolve, reject) => {
      documento.on('data', (fragmento) => fragmentos.push(fragmento));
      documento.on('end', () => resolve(Buffer.concat(fragmentos)));
      documento.on('error', reject);
    });
  }

  const anchos = [90, 56, 104, 86, 88, 72, 76, 72, 58, 66];
  const margen = 32;
  const alturaFila = 30;
  const anchoTotal = anchos.reduce((total, ancho) => total + ancho, 0);
  let y = 92;

  const dibujarMarca = () => {
    documento.rect(0, 0, documento.page.width, 8).fill('#1b7a38');
    documento.rect(0, 8, 110, 3).fill('#f59e0b');
    documento.image(logo, margen, 18, { width: 126 });
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#1b7a38')
      .text('INFORME INSTITUCIONAL', 170, 19, { characterSpacing: 0.8 });
    documento.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b')
      .text(titulo, 170, 32, { width: documento.page.width - 204, height: 24, lineBreak: false, ellipsis: true });
    documento.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(`Generado: ${new Date().toLocaleDateString('es-CO')}  ·  ${registros.length} afiliados`, 170, 59);
  };

  const dibujarEncabezadoTabla = () => {
    documento.roundedRect(margen, y, anchoTotal, alturaFila, 5).fill('#17652f');
    documento.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
    let x = margen;
    columnas.forEach(([titulo], indice) => {
      documento.text(titulo, x + 4, y + 10, { width: anchos[indice] - 8, height: 12, ellipsis: true, lineBreak: false });
      x += anchos[indice];
    });
    y += alturaFila;
  };

  dibujarMarca();
  if (metadatos.length) {
    const bandaY = y;
    const alturas = metadatos.map((linea) => documento.heightOfString(linea, {
      width: anchoTotal - 20,
      font: 'Helvetica',
      fontSize: 7.5,
      lineGap: 2,
    }));
    const bandaAlto = Math.max(22, alturas.reduce((total, altura) => total + altura, 0) + 14);
    documento.roundedRect(margen, bandaY, anchoTotal, bandaAlto, 5).fill('#f1f7f2');
    documento.font('Helvetica').fontSize(7.5).fillColor('#475569');
    let textoY = bandaY + 7;
    metadatos.forEach((linea, indice) => {
      documento.text(linea, margen + 10, textoY, {
        width: anchoTotal - 20,
        height: alturas[indice],
        lineGap: 2,
      });
      textoY += alturas[indice];
    });
    y = bandaY + bandaAlto + 10;
  }
  dibujarEncabezadoTabla();

  for (const [indiceRegistro, registro] of registros.entries()) {
    if (y + alturaFila > documento.page.height - margen - 15) {
      documento.addPage();
      y = 92;
      dibujarMarca();
      dibujarEncabezadoTabla();
    }
    documento.rect(margen, y, anchoTotal, alturaFila)
      .fill(indiceRegistro % 2 === 0 ? '#f6f8f6' : '#ffffff');
    documento.moveTo(margen, y + alturaFila)
      .lineTo(margen + anchoTotal, y + alturaFila)
      .lineWidth(0.45).strokeColor('#e2e8e4').stroke();
    let x = margen;
    columnas.forEach(([, key], indice) => {
      const esEstado = key === 'estado' || key === 'estado_sindical';
      documento.font(esEstado ? 'Helvetica-Bold' : 'Helvetica').fontSize(esEstado ? 6.5 : 7).fillColor(esEstado ? '#17652f' : '#263445')
        .text(String(registro[key] ?? '—'), x + 4, y + 7, {
          width: anchos[indice] - 8,
          height: 18,
          ellipsis: true,
          lineBreak: false,
        });
      x += anchos[indice];
    });
    documento.moveTo(margen, y)
      .lineTo(margen, y + alturaFila)
      .lineWidth(1.5).strokeColor('#1b7a38').stroke();
    y += alturaFila;
  }

  documento.end();
  return terminado;
}

async function enviarExportacion(req, res, afiliados) {
  const formato = req.query.formato;
  const registros = datosExportacion(afiliados);
  if (formato === 'excel') {
    const archivo = await crearExcelAfiliados(registros);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="afiliados-sutens.xlsx"');
    return res.send(archivo);
  }
  if (formato === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="afiliados-sutens.pdf"');
    return crearPdfAfiliados(registros, { destino: res });
  }
  return res.status(400).json({ error: 'El formato debe ser excel o pdf' });
}

export async function exportarAfiliados(req, res) {
  if (!validarFiltroSubdirectiva(req, res)) return;
  const afiliados = await consultarAfiliados(req);
  return enviarExportacion(req, res, afiliados);
}

export async function exportarAfiliadosVisibles(req, res) {
  if (!validarFiltroSubdirectiva(req, res)) return;
  const afiliados = await obtenerAfiliadosVisibles(req);
  if (!afiliados) {
    return res.status(403).json({ error: 'Tu rol no permite exportar este padrón' });
  }
  return enviarExportacion(req, res, afiliados);
}
