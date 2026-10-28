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
  const hoja = libro.addWorksheet('Asistentes');
  hoja.columns = columnas.map(([, key, width]) => ({ key, width }));
  hoja.addImage(libro.addImage({ buffer: await obtenerLogoPng(), extension: 'png' }), {
    tl: { col: 0, row: 0 },
    ext: { width: 180, height: 40 },
  });
  hoja.mergeCells('C1:D1');
  hoja.mergeCells('A2:D2');
  hoja.getCell('C1').value = protegerTextoExcel(evento.titulo);
  hoja.getCell('C1').font = { bold: true, size: 14, color: { argb: 'FF1B7A38' } };
  hoja.getCell('A2').value = protegerTextoExcel(
    `${formatoFecha(evento.fechaInicio)} · ${evento.subdirectiva}${evento.lugar ? ` · ${evento.lugar}` : ''} · ${asistentes.length} confirmados`
  );
  hoja.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } };
  hoja.getRow(1).height = 30;
  hoja.getRow(4).values = columnas.map(([header]) => header);
  hoja.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B7A38' } };
  for (const asistente of asistentes) {
    hoja.addRow(Object.fromEntries(columnas.map(([, key]) => [key, protegerTextoExcel(asistente[key])])));
  }
  hoja.views = [{ state: 'frozen', ySplit: 4 }];

  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="asistentes-evento-${idEvento}.xlsx"`);
  return res.send(Buffer.from(buffer));
}

async function exportarPdf(res, idEvento, { evento, asistentes }) {
  const documento = new PDFDocument({ size: 'A4', margin: 36 });
  const logo = await obtenerLogoPng();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="asistentes-evento-${idEvento}.pdf"`);
  documento.pipe(res);

  const margen = 36;
  const anchos = [190, 80, 170, 80];
  const anchoTotal = anchos.reduce((total, ancho) => total + ancho, 0);
  const alturaFila = 24;
  let y = 120;

  const dibujarEncabezado = () => {
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    documento.rect(margen, y, anchoTotal, alturaFila).fill('#1b7a38');
    let x = margen;
    columnas.forEach(([titulo], indice) => {
      documento.text(titulo, x + 4, y + 8, { width: anchos[indice] - 8, lineBreak: false });
      x += anchos[indice];
    });
    y += alturaFila;
  };

  documento.image(logo, margen, 28, { width: 126 });
  documento.font('Helvetica-Bold').fontSize(14).fillColor('#1b7a38')
    .text(evento.titulo, margen, 66, { width: anchoTotal, ellipsis: true, height: 20 });
  documento.font('Helvetica').fontSize(9).fillColor('#475569')
    .text(`${formatoFecha(evento.fechaInicio)} · ${evento.subdirectiva}${evento.lugar ? ` · ${evento.lugar}` : ''}`, margen, 88, { width: anchoTotal })
    .text(`${asistentes.length} asistencia(s) confirmada(s)`, margen, 102);
  dibujarEncabezado();

  for (const asistente of asistentes) {
    if (y + alturaFila > documento.page.height - margen) {
      documento.addPage();
      y = margen;
      dibujarEncabezado();
    }
    documento.rect(margen, y, anchoTotal, alturaFila).lineWidth(0.4).strokeColor('#d1d5db').stroke();
    let x = margen;
    columnas.forEach(([, key], indice) => {
      documento.font('Helvetica').fontSize(8).fillColor('#111827')
        .text(String(asistente[key] ?? '—'), x + 4, y + 8, {
          width: anchos[indice] - 8,
          height: 12,
          ellipsis: true,
          lineBreak: false,
        });
      x += anchos[indice];
    });
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
