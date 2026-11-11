import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import express from 'express';
import test from 'node:test';
import { crearControladorInformesChatbot } from '../src/controllers/chatbot-report.controller.js';
import { crearControladorExportacionChatbot } from '../src/controllers/chatbot-export.controller.js';
import { crearAutorizadorInformesChatbot } from '../src/middleware/chatbot-report-auth.js';
import { limitarInformesChatbot, limpiarLimitesChatbotParaPruebas } from '../src/middleware/chatbot-report-limit.js';
import { autorizar } from '../src/middleware/rbac.js';
import {
  configuracionInformes,
  consultarCorreosGruposVisibles,
  ejecutarInformeAgregado,
  validarSolicitudInforme,
} from '../src/services/chatbot-report.service.js';
import { autenticar } from '../src/middleware/auth.js';
import {
  exigirDescargasHabilitadas, limitarDescargasChatbot, limpiarLimitesDescargasParaPruebas,
  politicaDescargas, registrarAuditoriaDescarga, registrarVolumenDescarga,
} from '../src/middleware/chatbot-download-policy.js';

function respuestaFalsa() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(contenido) {
      this.body = contenido;
      return this;
    },
    set(nombre, valor) {
      this.headers[nombre] = valor;
      return this;
    },
  };
}

test('valida solo los informes y filtros del catálogo cerrado', () => {
  assert.equal(validarSolicitudInforme({ informe: 'desconocido' }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'afiliados_por_estado',
    filtros: { estado: 'aprobado' },
  }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'afiliados_por_estado',
    filtros: { estado_sindical: "activo' OR 1=1 --" },
  }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'afiliados_por_estado',
    filtros: { id_usuario: '1', alcance: 'global' },
  }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'afiliados_por_estado',
    role: 'Administrador SUTENS',
  }).error !== undefined, true);
});

test('las consultas usan parámetros y solo devuelven conteos agregados', async () => {
  let llamada;
  const solicitud = validarSolicitudInforme({
    informe: 'afiliados_por_estado',
    filtros: { estado_sindical: 'activo' },
  });
  const resultado = await ejecutarInformeAgregado({
    async query(sql, valores) {
      llamada = { sql, valores };
      return {
        rows: [
          { grupo: 'aprobado', cantidad: 4 },
          { grupo: 'pendiente', cantidad: 7 },
          { grupo: 'rechazado', cantidad: 9 },
        ],
      };
    },
  }, solicitud);

  assert.match(llamada.sql, /a\.estado_sindical = \$1/);
  assert.equal(llamada.valores[0], 'activo');
  assert.equal(llamada.valores.at(-1), configuracionInformes.maxFilas + 1);
  assert.deepEqual(resultado.filas, [{ grupo: 'rechazado', cantidad: 9 }]);
  assert.equal(resultado.privacidad.hubo_supresion, true);
  assert.equal(JSON.stringify(resultado).includes('cedula'), false);
  assert.equal(JSON.stringify(resultado).includes('correo'), false);
  assert.equal(JSON.stringify(resultado).includes('celular'), false);
});

test('rechaza filtros estructurales incoherentes con la jerarquía', async () => {
  const solicitud = validarSolicitudInforme({
    informe: 'afiliados_por_institucion_sede',
    filtros: { id_subdirectiva: '1', id_institucion: '2', id_sede: '3' },
    agrupacion: 'sede',
  });
  let consultaValidacion;
  const resultado = await ejecutarInformeAgregado({
    async query(sql) {
      consultaValidacion = sql;
      return { rows: [] };
    },
  }, solicitud);

  assert.match(consultaValidacion, /sd\.id_subdirectiva = \$1::bigint/);
  assert.equal(resultado.status, 400);
});

test('rechaza una sede sin institución y rangos de fechas incoherentes', () => {
  assert.equal(validarSolicitudInforme({
    informe: 'afiliados_por_institucion_sede',
    filtros: { id_sede: '3' },
  }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'aprobaciones_por_mes',
    filtros: { desde: '2025-02-01', hasta: '2025-01-01' },
  }).error !== undefined, true);
  assert.equal(validarSolicitudInforme({
    informe: 'aprobaciones_por_mes',
    filtros: { desde: '2025-01-01', hasta: '2031-01-01' },
  }).error !== undefined, true);
});

test('el controlador usa una transacción de solo lectura y devuelve alcance y fecha', async () => {
  const consultas = [];
  const eventos = [];
  const dbPool = {
    async connect() {
      return {
        async query(sql, params) {
          consultas.push({ sql, params });
          if (sql.includes('GROUP BY a.estado')) {
            return { rows: [{ grupo: 'aprobado', cantidad: 8 }] };
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const controlador = crearControladorInformesChatbot({
    dbPool,
    logger: { info: (evento) => eventos.push(evento), error: () => {} },
  });
  const res = respuestaFalsa();
  await controlador({
    user: { id_usuario: 19, roles: ['Administrador SUTENS'] },
    body: { informe: 'afiliados_por_estado' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.alcance, 'global');
  assert.ok(Number.isNaN(Date.parse(res.body.generado_en)) === false);
  assert.equal(consultas[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.deepEqual(consultas.at(-1).sql, 'COMMIT');
  assert.ok(eventos.some((evento) => evento.includes('"evento":"chatbot_informe"')));
});

test('un timeout produce error genérico, rollback y conexión liberada', async () => {
  const consultas = [];
  const logger = { info() {}, error: (mensaje) => consultas.push(mensaje) };
  const dbPool = {
    async connect() {
      return {
        async query(sql) {
          if (sql.includes('GROUP BY a.estado')) {
            const error = new Error('detalle SQL privado');
            error.code = '57014';
            throw error;
          }
          consultas.push(sql);
          return { rows: [] };
        },
        release() {
          consultas.push('RELEASE');
        },
      };
    },
  };
  const controlador = crearControladorInformesChatbot({ dbPool, logger });
  const res = respuestaFalsa();
  await controlador({ user: { id_usuario: 3 }, body: { informe: 'afiliados_por_estado' } }, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /tardó demasiado/);
  assert.equal(JSON.stringify(res.body).includes('detalle SQL privado'), false);
  assert.ok(consultas.includes('ROLLBACK'));
  assert.ok(consultas.includes('RELEASE'));
});

test('la exportación rechaza formatos, filtros y atribuciones manipuladas antes de consultar', async () => {
  const eventos = [];
  const exportar = crearControladorExportacionChatbot({
    dbPool: { connect() { assert.fail('No debe consultar'); } },
    logger: { info: (evento) => eventos.push(JSON.parse(evento)), error() {} },
  });
  for (const body of [
    { informe: 'afiliados_por_estado', formato: 'csv' },
    { informe: 'afiliados_por_estado', formato: 'correos', roles: ['Administrador SUTENS'] },
    { informe: 'afiliados_por_estado', formato: 'correos', filtros: { estado_sindical: "' OR 1=1 --" } },
  ]) {
    const res = respuestaFalsa();
    await exportar({ user: { id_usuario: 3 }, body }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.ok(eventos.every((evento) => evento.resultado === '400'));
});

test('la consulta de correos exige grupos del servidor y no trunca el límite en silencio', async () => {
  let llamada;
  const client = {
    async query(sql, valores) {
      llamada = { sql, valores };
      return { rows: Array.from({ length: configuracionInformes.maxCorreos + 1 }, (_, i) => ({ correo: `test${i}@example.invalid` })) };
    },
  };
  const solicitud = { informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: '4', estado: 'aprobado' } };
  const resultado = await consultarCorreosGruposVisibles(client, solicitud, ['4']);
  assert.equal(resultado.status, 422);
  assert.match(llamada.sql, /sd\.id_subdirectiva::text = ANY\(\$1::text\[\]\)/);
  assert.ok(llamada.valores.includes('aprobado'));
  assert.equal(llamada.valores.at(-1), configuracionInformes.maxCorreos + 1);
  await assert.rejects(consultarCorreosGruposVisibles(client, solicitud, [undefined]), /identificadores internos/);
});

test('el endpoint de exportación rechaza peticiones sin sesión y con JWT vencido', async () => {
  process.env.JWT_SECRET = 'chatbot-export-test-only-secret';
  process.env.CHATBOT_ENABLED = 'true';
  const { default: chatbotRouter } = await import('../src/routes/chatbot.routes.js');
  const app = express();
  app.use(express.json(), chatbotRouter);
  const server = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/informes/exportar`;
    const body = JSON.stringify({ informe: 'afiliados_por_estado', formato: 'correos' });
    const sinToken = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(sinToken.status, 401);
    const token = jwt.sign({ id_usuario: 1, roles: ['Administrador SUTENS'] }, process.env.JWT_SECRET, { expiresIn: -1 });
    const vencido = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    });
    assert.equal(vencido.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('el RBAC ignora roles y alcance manipulados en el body', () => {
  const middleware = autorizar('Administrador SUTENS');
  const res = respuestaFalsa();
  let nextCalled = false;
  middleware({
    body: { roles: ['Administrador SUTENS'], id_usuario: 1, alcance: 'global' },
    user: { id_usuario: 1, roles: ['Afiliado'] },
  }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('audita denegaciones RBAC sin registrar filtros manipulables', () => {
  const eventos = [];
  const middleware = crearAutorizadorInformesChatbot({ info: (evento) => eventos.push(JSON.parse(evento)) });
  const res = respuestaFalsa();
  middleware({
    body: { informe: 'afiliados_por_estado', filtros: { cedula: 'no-registrar' } },
    user: { id_usuario: 7, roles: ['Directiva'] },
  }, res, () => assert.fail('No debe autorizar a un rol no habilitado'));

  assert.equal(res.statusCode, 403);
  assert.equal(eventos[0].resultado, '403');
  assert.deepEqual(eventos[0].filtros, {});
});

test('autenticación rechaza token ausente y vencido antes de consultar la base', async () => {
  process.env.JWT_SECRET = 'chatbot-report-test-only-secret';
  const req = { headers: {}, method: 'POST', originalUrl: '/api/chatbot/informes' };
  const resSinToken = respuestaFalsa();
  await autenticar(req, resSinToken, () => {});
  assert.equal(resSinToken.statusCode, 401);

  const tokenVencido = jwt.sign({
    id_usuario: 1,
    sid: '0ebc1c8b-e970-4d02-b23c-1912ebd38e05',
  }, process.env.JWT_SECRET, { expiresIn: -1 });
  const resVencido = respuestaFalsa();
  await autenticar({
    ...req,
    headers: { authorization: `Bearer ${tokenVencido}` },
  }, resVencido, () => {});
  assert.equal(resVencido.statusCode, 401);
});

test('limita consultas por usuario y anuncia cuándo se puede reintentar', () => {
  limpiarLimitesChatbotParaPruebas();
  let permitido = 0;
  let limitado;
  const eventos = [];
  const infoOriginal = console.info;
  console.info = (evento) => eventos.push(JSON.parse(evento));
  try {
    for (let intento = 0; intento < 31; intento += 1) {
      const res = respuestaFalsa();
      limitarInformesChatbot({ user: { id_usuario: 123 } }, res, () => { permitido += 1; });
      if (res.statusCode === 429) limitado = res;
    }
  } finally {
    console.info = infoOriginal;
  }
  assert.equal(permitido, 30);
  assert.equal(limitado.statusCode, 429);
  assert.ok(Number(limitado.headers['Retry-After']) > 0);
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].resultado, '429');
  limpiarLimitesChatbotParaPruebas();
});

test('el widget renderiza resultados con textContent y no inserta HTML', async () => {
  const fuente = await readFile(new URL('../public/js/chatbot.js', import.meta.url), 'utf8');
  assert.match(fuente, /resultado\.filas\.forEach/);
  assert.match(fuente, /celda\.textContent = texto/);
  assert.match(fuente, /grupo\.textContent = String\(fila\.grupo\)/);
  assert.doesNotMatch(fuente, /\.innerHTML\b/);
  assert.match(fuente, /resultado\.descargas_habilitadas === true/);
});

test('descargas están deshabilitadas por defecto y tienen límites independientes', () => {
  assert.equal(politicaDescargas.habilitadas, false);
  assert.equal(politicaDescargas.maxRegistros, 1000);
  const res = respuestaFalsa();
  exigirDescargasHabilitadas({}, res, () => assert.fail('No debe habilitarse por defecto'));
  assert.equal(res.statusCode, 404);
  limpiarLimitesDescargasParaPruebas();
  let permitidos = 0;
  for (let i = 0; i < 6; i += 1) {
    const respuesta = respuestaFalsa();
    limitarDescargasChatbot({ user: { id_usuario: 77 } }, respuesta, () => { permitidos += 1; });
    if (i === 5) assert.equal(respuesta.statusCode, 429);
  }
  assert.equal(permitidos, 5);
  limpiarLimitesDescargasParaPruebas();
});

test('auditoría y alerta de volumen no incluyen valores de filtros ni datos personales', () => {
  limpiarLimitesDescargasParaPruebas();
  const eventos = [];
  const logger = { info: (linea) => eventos.push(JSON.parse(linea)) };
  const req = {
    user: { id_usuario: 77 },
    body: { informe: 'afiliados_por_estado', formato: 'excel',
      filtros: { estado_sindical: 'valor-privado', correo: 'persona@example.invalid' } },
  };
  registrarAuditoriaDescarga(req, '200', 1000, logger);
  registrarVolumenDescarga(req, 1000, logger);
  registrarVolumenDescarga(req, 1000, logger);
  registrarVolumenDescarga(req, 1000, logger);
  assert.deepEqual(eventos[0].filtros, ['estado_sindical']);
  assert.equal(eventos[0].cantidad, 1000);
  assert.equal(eventos.filter((evento) => evento.evento === 'chatbot_exportacion_volumen').length, 1);
  assert.ok(eventos.every((evento) => !Object.hasOwn(evento, 'usuario_id')));
  assert.doesNotMatch(JSON.stringify(eventos), /valor-privado|persona@example/);
  limpiarLimitesDescargasParaPruebas();
});

test('timeout de descarga revierte y audita sin exponer el detalle de la consulta', async () => {
  const consultas = [];
  const eventos = [];
  const exportar = crearControladorExportacionChatbot({
    dbPool: { async connect() {
      return {
        async query(sql) {
          consultas.push(sql);
          if (sql.includes('GROUP BY a.estado')) {
            const error = new Error('dato privado');
            error.code = '57014';
            throw error;
          }
          return { rows: [] };
        },
        release() { consultas.push('RELEASE'); },
      };
    } },
    logger: { info: (linea) => eventos.push(JSON.parse(linea)), error() {} },
  });

  const res = respuestaFalsa();
  await exportar({ user: { id_usuario: 77 }, body: { informe: 'afiliados_por_estado', formato: 'pdf' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(eventos[0].resultado, 'timeout');
  assert.doesNotMatch(JSON.stringify(res.body), /dato privado/);
  assert.ok(consultas.includes('ROLLBACK'));
  assert.ok(consultas.includes('RELEASE'));
});

test('los eventos de informes no registran identidad, filtros ni errores con datos', async () => {
  const eventos = [];
  const errores = [];
  const controlador = crearControladorInformesChatbot({
    dbPool: { async connect() {
      return {
        async query(sql) {
          if (sql.includes('GROUP BY a.estado')) {
            const error = new Error('persona@example.invalid 12345678');
            error.code = '57014';
            throw error;
          }
          return { rows: [] };
        },
        release() {},
      };
    } },
    logger: { info: (linea) => eventos.push(JSON.parse(linea)), error: (...args) => errores.push(args) },
  });
  const res = respuestaFalsa();
  await controlador({
    user: { id_usuario: 'identidad-privada' },
    body: { informe: 'afiliados_por_estado', filtros: { estado_sindical: 'activo' } },
  }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(eventos[0].resultado, 'timeout');
  assert.equal(typeof eventos[0].duracion_ms, 'number');
  assert.doesNotMatch(JSON.stringify({ eventos, errores }), /identidad-privada|activo|persona@example|12345678|usuario_id|filtros/);
});
