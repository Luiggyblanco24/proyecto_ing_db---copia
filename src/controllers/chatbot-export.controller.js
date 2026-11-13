import ExcelJS from 'exceljs';
import { pool } from '../config/db.js';
import { registrarAuditoriaDescarga, registrarVolumenDescarga } from '../middleware/chatbot-download-policy.js';
import { crearExcelAfiliados, crearPdfAfiliados, datosExportacion, protegerTextoExcel } from './exportacion.controller.js';
import {
  configuracionInformes,
  consultarDatosGruposVisibles,
  ejecutarInformeAgregado,
  validarSolicitudInforme,
} from '../services/chatbot-report.service.js';

async function describirFiltros(client, filtros) {
  const etiquetas = {
    estado: 'Estado de afiliación',
    estado_sindical: 'Estado sindical',
    id_subdirectiva: 'Subdirectiva',
    id_institucion: 'Institución',
    id_sede: 'Sede',
    desde: 'Desde',
    hasta: 'Hasta',
    periodo: 'Periodo',
  };
  const clavesEstructurales = ['id_subdirectiva', 'id_institucion', 'id_sede'];
  let nombres = {};
  if (clavesEstructurales.some((clave) => filtros[clave])) {
    const { rows } = await client.query(
      `SELECT
         (SELECT nombre FROM subdirectiva WHERE id_subdirectiva = $1::bigint) AS id_subdirectiva,
         (SELECT nombre FROM institucion WHERE id_institucion = $2::bigint) AS id_institucion,
         (SELECT nombre FROM sede WHERE id_sede = $3::bigint) AS id_sede`,
      [filtros.id_subdirectiva || null, filtros.id_institucion || null, filtros.id_sede || null]
    );
    nombres = rows[0];
    if (clavesEstructurales.some((clave) => filtros[clave] && !nombres[clave])) {
      throw new Error('No se pudo identificar un filtro organizacional del informe');
    }
  }
  return Object.entries(filtros).map(([clave, valor]) => {
    if (!Object.hasOwn(etiquetas, clave)) throw new Error('Filtro de informe sin etiqueta');
    return `${etiquetas[clave]}: ${clavesEstructurales.includes(clave) ? nombres[clave] : valor}`;
  }).join(' · ') || 'ninguno';
}

function lineasInforme(resultado, filtros) {
  const agrupaciones = {
    estado: 'Estado de afiliación',
    subdirectiva: 'Subdirectiva',
    institucion: 'Institución',
    sede: 'Sede',
    mes: 'Mes',
  };
  if (!Object.hasOwn(agrupaciones, resultado.agrupacion)) throw new Error('Agrupación de informe sin etiqueta');
  return [
    resultado.titulo,
    `Alcance: ${resultado.alcance}`,
    `Generado: ${resultado.generado_en}`,
    `Filtros: ${filtros}`,
    `Agrupación: ${agrupaciones[resultado.agrupacion]}`,
    ...resultado.avisos,
  ];
}

async function crearExcelCorreos(metadatos, correos) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Correos');
  hoja.columns = [{ width: 65 }, { width: 70 }];
  const detalles = libro.addWorksheet('Detalles del informe');
  detalles.columns = [{ width: 100 }];
  for (const linea of metadatos) {
    detalles.addRow([protegerTextoExcel(linea)]);
  }
  hoja.addRow(['Correo']);
  hoja.getCell('B1').value = 'Datos personales de uso restringido (Ley 1581 de 2012)';
  for (const correo of correos) hoja.addRow([protegerTextoExcel(correo)]);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

export function crearControladorExportacionChatbot({ dbPool = pool, logger = console } = {}) {
  return async function exportarInformeChatbot(req, res) {
    const body = req.body;
    const formato = body?.formato;
    const { formato: ignorado, ...solicitudBody } = body && typeof body === 'object' && !Array.isArray(body)
      ? body : {};
    const solicitud = validarSolicitudInforme(solicitudBody);
    const auditar = (codigo, cantidad = null) => registrarAuditoriaDescarga(req, codigo, cantidad, logger);
    if (solicitud.error || !['pdf', 'excel', 'correos'].includes(formato)) {
      auditar('400');
      return res.status(400).json({ error: 'La solicitud de exportación no es válida.' });
    }

    let client;
    let transaccionAbierta = false;
    try {
      client = await dbPool.connect();
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      transaccionAbierta = true;
      await client.query("SELECT set_config('statement_timeout', $1, true)", [String(configuracionInformes.timeoutMs)]);
      const resultado = await ejecutarInformeAgregado(client, solicitud, { incluirGruposInternos: true });
      if (resultado.error) {
        await client.query('ROLLBACK');
        transaccionAbierta = false;
        auditar(String(resultado.status));
        return res.status(resultado.status).json({ error: resultado.error });
      }
      const datos = await consultarDatosGruposVisibles(client, solicitud, resultado.gruposInternos,
        formato === 'correos' ? 'correos' : 'afiliados');
      delete resultado.gruposInternos;
      if (datos.error) {
        await client.query('ROLLBACK');
        transaccionAbierta = false;
        auditar(String(datos.status));
        return res.status(datos.status).json({ error: datos.error });
      }
      const filtros = await describirFiltros(client, resultado.filtros);
      await client.query('COMMIT');
      transaccionAbierta = false;
      resultado.generado_en = new Date().toISOString();
      const opciones = {
        titulo: resultado.titulo,
        metadatos: ['Datos personales de uso restringido (Ley 1581 de 2012)', ...lineasInforme(resultado, filtros)],
        leyendaPortada: formato === 'pdf' ? 'Informe generado con chatbot SUTENS' : '',
      };
      const archivo = formato === 'correos'
        ? await crearExcelCorreos(opciones.metadatos, datos)
        : formato === 'pdf'
          ? await crearPdfAfiliados(datosExportacion(datos), opciones)
          : await crearExcelAfiliados(datosExportacion(datos), opciones);
      res.set('Cache-Control', 'no-store');
      res.set('Content-Type', formato === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', `attachment; filename="sutens-${formato}.${formato === 'pdf' ? 'pdf' : 'xlsx'}"`);
      auditar('200', datos.length);
      registrarVolumenDescarga(req, datos.length, logger);
      return res.send(archivo);
    } catch (error) {
      if (transaccionAbierta) {
        try {
          await client.query('ROLLBACK');
        } catch (errorRollback) {
          logger.error('No se pudo revertir la transacción de exportación.');
        }
      }
      logger.error('Falló la exportación del informe del chatbot.');
      const timeout = error.code === '57014';
      auditar(timeout ? 'timeout' : '500');
      return res.status(timeout ? 503 : 500).json({
        error: timeout ? 'La exportación tardó demasiado. Reduce los filtros e inténtalo de nuevo.'
          : 'No se pudo generar el archivo. Inténtalo de nuevo.',
      });
    } finally {
      client?.release();
    }
  };
}

export const exportarInformeChatbot = crearControladorExportacionChatbot();
