import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { query } from '../config/db.js';
import { buscarEventoVisible, puedeGestionarEvento } from './calendario.controller.js';
import { protegerTextoExcel } from './exportacion.controller.js';
import { obtenerLogoPng } from '../utils/documento-marca.js';

const columnas = [
  ['Nombre', 'nombre', 34],
  ['Cédula', 'cedula', 16],
  ['Correo', 'correo', 36],
  ['Confirmó el', 'confirmada_at', 22],
];

const formatoFecha = (valor) => new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

async function obtenerAsistentes(idEvento) {
  const { rows } = await query(
    `SELECT e.titulo, e.fecha_inicio, e.lugar, sd.nombre AS subdirectiva,
            concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS nombre,
            p.cedula, p.correo, ea.actualizado_at AS confirmada_at
     FROM evento e
     LEFT JOIN subdirectiva sd ON sd.id_subdirectiva = e.id_subdirectiva
     LEFT JOIN evento_asistencia ea ON ea.id_evento = e.id_evento AND ea.confirmada = TRUE
     LEFT JOIN afiliado a ON a.id_afiliado = ea.id_afiliado
     LEFT JOIN persona p ON p.id_persona = a.id_persona
     WHERE e.id_evento = $1
     ORDER BY p.apellido1, p.nombre1`,
    [idEvento]
  );
  if (rows.length === 0) return null;
  const { titulo, fecha_inicio: fechaInicio, lugar, subdirectiva } = rows[0];
  return {
    evento: { titulo, fechaInicio, lugar, subdirectiva: subdirectiva || 'Directiva Departamental' },
    asistentes: rows
      .filter((fila) => fila.nombre)
      .map((fila) => ({
        nombre: fila.nombre,
        cedula: fila.cedula,
        correo: fila.correo,
        confirmada_at: formatoFecha(fila.confirmada_at),
      })),
  };
}

async function exportarExcel(res, idEvento, { evento, asistentes }) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SUTENS';
  libro.subject = 'Asistencias confirmadas a actividad sindical';
  libro.title = `Asistentes - ${evento.titulo}`;
  const hoja = libro.addWorksheet('Asistentes');
  hoja.columns = columnas.map(([, key, width]) => ({
    key,
    width,
    style: { font: { name: 'Aptos', size: 10 }, alignment: { vertical: 'middle' } },
  }));
  hoja.properties.tabColor = { argb: 'FF1B7A38' };
  hoja.views = [{ state: 'frozen', ySplit: 5, showGridLines: false }];
  hoja.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  hoja.headerFooter.oddFooter = '&LSUTENS · Asistencias confirmadas&C&P de &N&RConfidencial';
  hoja.mergeCells('C1:D1');
  hoja.mergeCells('C2:D2');
  hoja.mergeCells('A3:D3');
  hoja.addImage(libro.addImage({ buffer: await obtenerLogoPng(), extension: 'png' }), {
    tl: { col: 0, row: 0 },
    ext: { width: 168, height: 37 },
  });
  hoja.getCell('C1').value = protegerTextoExcel(evento.titulo);
  hoja.getCell('C1').font = {
    name: 'Aptos Display',
    bold: true,
    size: evento.titulo.length > 70 ? 12 : evento.titulo.length > 42 ? 14 : 17,
    color: { argb: 'FF1B7A38' },
  };
  hoja.getCell('C1').alignment = { vertical: 'middle', wrapText: true };
  hoja.getCell('C2').value = protegerTextoExcel(
    `${formatoFecha(evento.fechaInicio)} · ${evento.subdirectiva}${evento.lugar ? ` · ${evento.lugar}` : ''}`
  );
  hoja.getCell('C2').font = { name: 'Aptos', size: 9, color: { argb: 'FF64748B' } };
  hoja.getCell('C2').alignment = { vertical: 'middle', wrapText: true };
  hoja.getCell('A3').value = `ASISTENCIAS CONFIRMADAS  ·  ${asistentes.length} persona${asistentes.length === 1 ? '' : 's'}`;
  hoja.getCell('A3').font = { name: 'Aptos', bold: true, size: 9, color: { argb: 'FF17652F' } };
  hoja.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F7F2' } };
  hoja.getRow(1).height = 34;
  hoja.getRow(2).height = 26;
  hoja.getRow(3).height = 23;
  hoja.getRow(4).height = 8;
  hoja.getRow(5).values = columnas.map(([header]) => header);
  hoja.getRow(5).font = { name: 'Aptos', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17652F' } };
  hoja.getRow(5).height = 28;
  hoja.getRow(5).alignment = { vertical: 'middle', wrapText: true };
  hoja.getRow(5).eachCell((celda) => {
    celda.border = { bottom: { style: 'medium', color: { argb: 'FFF59E0B' } } };
  });
  for (const asistente of asistentes) {
    const fila = hoja.addRow(Object.fromEntries(columnas.map(([, key]) => [key, protegerTextoExcel(asistente[key])])));
    fila.height = 23;
    fila.alignment = { vertical: 'middle' };
    fila.eachCell((celda) => {
      celda.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8E4' } } };
      if (fila.number % 2 === 0) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8F5' } };
      }
    });
  }
  hoja.autoFilter = { from: 'A5', to: 'D5' };

  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="asistentes-evento-${idEvento}.xlsx"`);
  return res.send(Buffer.from(buffer));
}

async function exportarPdf(res, idEvento, { evento, asistentes }) {
  const documento = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32 });
  const logo = await obtenerLogoPng();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="asistentes-evento-${idEvento}.pdf"`);
  documento.pipe(res);

  const margen = 32;
  const anchos = [190, 80, 290, 170];
  const anchoTotal = anchos.reduce((total, ancho) => total + ancho, 0);
  const alturaFila = 30;
  let y = 94;

  const dibujarMarca = () => {
    documento.rect(0, 0, documento.page.width, 8).fill('#1b7a38');
    documento.rect(0, 8, 110, 3).fill('#f59e0b');
    documento.image(logo, margen, 18, { width: 126 });
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#1b7a38')
      .text('INFORME DE ACTIVIDAD', 170, 19, { characterSpacing: 0.8 });
    documento.font('Helvetica-Bold').fontSize(15).fillColor('#1e293b')
      .text(evento.titulo, 170, 32, {
        width: documento.page.width - 204,
        height: 22,
        lineBreak: false,
        ellipsis: true,
      });
    const detallesEvento = `${formatoFecha(evento.fechaInicio)} · ${evento.subdirectiva}${evento.lugar ? ` · ${evento.lugar}` : ''}`;
    documento.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(detallesEvento, 170, 58, {
        width: documento.page.width - 204,
        height: 12,
        lineBreak: false,
        ellipsis: true,
      });
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#17652f')
      .text(`${asistentes.length} asistencia(s) confirmada(s)`, 170, 74);
  };

  const dibujarEncabezado = () => {
    documento.roundedRect(margen, y, anchoTotal, alturaFila, 5).fill('#17652f');
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let x = margen;
    columnas.forEach(([titulo], indice) => {
      documento.text(titulo, x + 5, y + 10, { width: anchos[indice] - 10, height: 12, lineBreak: false, ellipsis: true });
      x += anchos[indice];
    });
    y += alturaFila;
  };

  dibujarMarca();
  dibujarEncabezado();

  for (const [indiceAsistente, asistente] of asistentes.entries()) {
    if (y + alturaFila > documento.page.height - margen - 15) {
      documento.addPage();
      y = 94;
      dibujarMarca();
      dibujarEncabezado();
    }
    documento.rect(margen, y, anchoTotal, alturaFila)
      .fill(indiceAsistente % 2 === 0 ? '#f6f8f6' : '#ffffff');
    documento.moveTo(margen, y + alturaFila)
      .lineTo(margen + anchoTotal, y + alturaFila)
      .lineWidth(0.45).strokeColor('#e2e8e4').stroke();
    let x = margen;
    columnas.forEach(([, key], indice) => {
      documento.font('Helvetica').fontSize(8).fillColor('#263445')
        .text(String(asistente[key] ?? '—'), x + 4, y + 8, {
          width: anchos[indice] - 8,
          height: 16,
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
}

export async function exportarAsistentes(req, res) {
  const { id } = req.params;
  const { formato } = req.query;
  if (formato !== 'excel' && formato !== 'pdf') {
    return res.status(400).json({ error: 'El formato debe ser excel o pdf' });
  }

  const acceso = await buscarEventoVisible(req, id);
  if (!acceso) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (!puedeGestionarEvento(req, acceso, acceso.evento)) {
    return res.status(403).json({ error: 'No tienes permisos para descargar esta lista' });
  }

  const datos = await obtenerAsistentes(id);
  if (!datos) return res.status(404).json({ error: 'Actividad no encontrada' });
  return formato === 'excel' ? exportarExcel(res, id, datos) : exportarPdf(res, id, datos);
}
