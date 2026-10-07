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

function datosExportacion(afiliados) {
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

function protegerTextoExcel(valor) {
  const texto = String(valor ?? '');
  return /^[=+@\-]/.test(texto) ? `'${texto}` : texto;
}

async function exportarExcel(res, registros) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Afiliados');
  hoja.columns = columnas.map(([, key, width]) => ({ key, width }));
  hoja.addImage(libro.addImage({ buffer: await obtenerLogoPng(), extension: 'png' }), {
    tl: { col: 0, row: 0 },
    ext: { width: 180, height: 40 },
  });
  hoja.mergeCells('C1:J1');
  hoja.mergeCells('C2:J2');
  hoja.getCell('C1').value = 'Padrón de afiliados SUTENS';
  hoja.getCell('C1').font = { bold: true, size: 16, color: { argb: 'FF1B7A38' } };
  hoja.getCell('C2').value = `Generado: ${new Date().toLocaleDateString('es-CO')} · ${registros.length} afiliados`;
  hoja.getCell('C2').font = { size: 10, color: { argb: 'FF475569' } };
  hoja.getRow(1).height = 30;
  hoja.getRow(2).height = 26;
  hoja.getRow(3).height = 8;
  hoja.getRow(4).values = [undefined, ...columnas.map(([header]) => header)];
  hoja.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B7A38' } };
  hoja.getRow(4).height = 24;
  for (const registro of registros) {
    hoja.addRow(Object.fromEntries(columnas.map(([, key]) => [key, protegerTextoExcel(registro[key])])));
  }
  hoja.views = [{ state: 'frozen', ySplit: 4 }];
  hoja.autoFilter = { from: 'A4', to: `${String.fromCharCode(64 + columnas.length)}4` };

  const buffer = await libro.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="afiliados-sutens.xlsx"');
  return res.send(Buffer.from(buffer));
}

async function exportarPdf(res, registros) {
  const documento = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: false });
  const logo = await obtenerLogoPng();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="afiliados-sutens.pdf"');
  documento.pipe(res);

  const anchos = [90, 56, 104, 86, 88, 72, 76, 72, 58, 66];
  const margen = 28;
  const alturaFila = 34;
  const anchoTotal = anchos.reduce((total, ancho) => total + ancho, 0);
  let y = 70;

  const dibujarMarca = () => {
    documento.image(logo, margen, 16, { width: 126 });
    documento.font('Helvetica-Bold').fontSize(15).fillColor('#1b7a38')
      .text('Padrón de afiliados SUTENS', 170, 23, { width: documento.page.width - 198, lineBreak: false });
    documento.font('Helvetica').fontSize(8).fillColor('#475569')
      .text(`Generado: ${new Date().toLocaleDateString('es-CO')} · ${registros.length} afiliados`, 170, 44);
  };

  const dibujarEncabezadoTabla = () => {
    documento.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    documento.rect(margen, y, anchoTotal, alturaFila).fill('#1b7a38');
    let x = margen;
    columnas.forEach(([titulo], indice) => {
      documento.text(titulo, x + 4, y + 10, { width: anchos[indice] - 8, height: 18, ellipsis: true, lineBreak: false });
      x += anchos[indice];
    });
    y += alturaFila;
  };

  dibujarMarca();
  dibujarEncabezadoTabla();

  for (const registro of registros) {
    if (y + alturaFila > documento.page.height - margen) {
      documento.addPage();
      y = 70;
      dibujarMarca();
      dibujarEncabezadoTabla();
    }
    documento.rect(margen, y, anchoTotal, alturaFila).lineWidth(0.4).strokeColor('#d1d5db').stroke();
    let x = margen;
    columnas.forEach(([, key], indice) => {
      documento.font('Helvetica').fontSize(7).fillColor('#111827')
        .text(String(registro[key] ?? '—'), x + 4, y + 7, {
          width: anchos[indice] - 8,
          height: 22,
          ellipsis: true,
          lineBreak: false,
        });
      x += anchos[indice];
    });
    y += alturaFila;
  }

  documento.end();
}

async function enviarExportacion(req, res, afiliados) {
  const formato = req.query.formato;
  const registros = datosExportacion(afiliados);
  if (formato === 'excel') return exportarExcel(res, registros);
  if (formato === 'pdf') return exportarPdf(res, registros);
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