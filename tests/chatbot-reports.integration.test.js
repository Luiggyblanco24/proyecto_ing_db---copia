import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import ExcelJS from 'exceljs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import pg from 'pg';
import test from 'node:test';

const adminUrlText = process.env.CHATBOT_TEST_ADMIN_URL;
let adminUrl;
try {
  adminUrl = adminUrlText ? new URL(adminUrlText) : null;
} catch {
  adminUrl = null;
}

const adminUrlEsSeguro = adminUrl &&
  ['127.0.0.1', '::1', 'localhost'].includes(adminUrl.hostname) &&
  adminUrl.pathname === '/postgres' &&
  adminUrl.username === 'sutens_test' &&
  !adminUrl.password;

process.env.CHATBOT_REPORT_MIN_GROUP_SIZE = '5';
process.env.CHATBOT_REPORT_MAX_ROWS = '200';
process.env.CHATBOT_REPORT_TIMEOUT_MS = '5000';
process.env.CHATBOT_ENABLED = 'true';
process.env.CHATBOT_DOWNLOADS_ENABLED = 'true';
process.env.CHATBOT_DOWNLOAD_MAX_RECORDS = '9999';
process.env.JWT_SECRET = 'solo-para-pruebas-sinteticas-locales';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://sutens_test@127.0.0.1:1/postgres';

const { crearControladorInformesChatbot } = await import('../src/controllers/chatbot-report.controller.js');
const { crearControladorExportacionChatbot } = await import('../src/controllers/chatbot-export.controller.js');
const { configuracionInformes, ejecutarInformeAgregado, consultarCorreosGruposVisibles, consultarDatosGruposVisibles } = await import('../src/services/chatbot-report.service.js');
const { pool: poolAplicacion } = await import('../src/config/db.js');
const { default: chatbotRouter } = await import('../src/routes/chatbot.routes.js');
const { autenticar } = await import('../src/middleware/auth.js');
const { me } = await import('../src/controllers/auth.controller.js');
const {
  auditarIntentoDescarga, manejarCuerpoInvalidoDescarga, limpiarLimitesDescargasParaPruebas,
} = await import('../src/middleware/chatbot-download-policy.js');

function identificadorSqlSeguro(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function urlBaseDatos(base, nombre) {
  const url = new URL(base);
  url.pathname = `/${nombre}`;
  return url.toString();
}

function respuestaFalsa() {
  return {
    statusCode: 200,
    body: undefined,
    status(status) {
      this.statusCode = status;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    set(name, value) {
      this.headers ||= {};
      this.headers[name] = value;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

function ocultarComplementariamente(filas) {
  const ocultas = filas.filter((fila) => fila.cantidad < 5);
  const conjuntoOculto = new Set(ocultas);
  if (ocultas.length === 1) {
    const complemento = filas
      .filter((fila) => !conjuntoOculto.has(fila))
      .sort((a, b) => a.cantidad - b.cantidad)[0];
    if (complemento) conjuntoOculto.add(complemento);
  }
  return filas.filter((fila) => !conjuntoOculto.has(fila));
}

function assertSinDatosPersonales(valor) {
  const clavesPersonales = /^(cedula|correo|celular|nombre1|nombre2|apellido1|apellido2|id_persona|id_afiliado|radicado|usuario)$/i;
  if (Array.isArray(valor)) {
    valor.forEach(assertSinDatosPersonales);
    return;
  }
  if (valor && typeof valor === 'object') {
    for (const [clave, contenido] of Object.entries(valor)) {
      assert.equal(clavesPersonales.test(clave), false, `Campo personal devuelto: ${clave}`);
      assertSinDatosPersonales(contenido);
    }
  }
}

async function textoPdf(buffer) {
  const pdf = await PDFDocument.load(buffer);
  const textos = [];
  for (const pagina of pdf.getPages()) {
    const contenido = pagina.node.Contents();
    const streams = contenido instanceof PDFArray
      ? Array.from({ length: contenido.size() }, (_, indice) => contenido.lookup(indice))
      : [contenido];
    for (const stream of streams) {
      if (!(stream instanceof PDFRawStream)) continue;
      const instrucciones = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
      for (const linea of instrucciones.matchAll(/\[(.*?)\]\s*TJ/gs)) {
        textos.push([...linea[1].matchAll(/<([0-9a-f]+)>/gi)]
          .map((texto) => Buffer.from(texto[1], 'hex').toString('latin1')).join(''));
      }
    }
  }
  return textos.join('\n');
}

function extraerNodos(plan, destino = []) {
  destino.push({
    tipo: plan['Node Type'],
    indice: plan['Index Name'] || undefined,
    filas_estimadas: plan['Plan Rows'],
    filas_reales: plan['Actual Rows'],
  });
  for (const nodo of plan.Plans || []) extraerNodos(nodo, destino);
  return destino;
}

test('integración PostgreSQL aislada: informes, privacidad, READ ONLY, timeout y rendimiento', {
  skip: adminUrlEsSeguro
    ? false
    : 'Ejecuta con tests/run-chatbot-reports-integration.ps1 para crear un clúster PostgreSQL aislado',
}, async (t) => {
  const nombreDb = `sutens_chatbot_it_${process.pid}_${randomBytes(4).toString('hex')}`;
  const adminPool = new pg.Pool({ connectionString: adminUrlText, max: 1 });
  let dbPool;
  let creada = false;

  try {
    await adminPool.query(`CREATE DATABASE ${identificadorSqlSeguro(nombreDb)}`);
    creada = true;
    dbPool = new pg.Pool({
      connectionString: urlBaseDatos(adminUrlText, nombreDb),
      max: 6,
      idleTimeoutMillis: 1000,
    });
    poolAplicacion.options.connectionString = urlBaseDatos(adminUrlText, nombreDb);

    const esquema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
    await dbPool.query(esquema);
    assert.equal(configuracionInformes.umbralPrivacidad, 5);

    const datosPersonas = await dbPool.query(`
      INSERT INTO persona (nombre1, apellido1, cedula, correo)
      SELECT 'Sintetico' || n, 'Prueba', 'TEST' || n, 'sutens-test-' || n || '@example.invalid'
      FROM generate_series(1, 10000) AS n
      RETURNING id_persona
    `);
    const personas = datosPersonas.rows
      .map(({ id_persona }) => id_persona)
      .sort((a, b) => Number(a) - Number(b));
    const datosAfiliados = await dbPool.query(`
      WITH personas AS (
        SELECT id_persona, ordinal::int AS n
        FROM unnest($1::bigint[]) WITH ORDINALITY AS p(id_persona, ordinal)
      )
      INSERT INTO afiliado (id_persona, estado, estado_sindical, fecha_aprobacion)
      SELECT id_persona,
             (ARRAY['aprobado', 'pendiente', 'rechazado', 'retirado'])[((n - 1) % 4) + 1],
             CASE WHEN n % 2 = 1 THEN 'activo' ELSE 'inactivo' END,
             CASE
               WHEN n IN (1, 5, 13) THEN NULL
               WHEN n = 9 THEN TIMESTAMPTZ '2025-12-20 12:00:00+00'
               WHEN (n - 1) % 4 = 0 THEN TIMESTAMPTZ '2026-01-01 12:00:00+00' + ((n % 180) * INTERVAL '1 day')
               ELSE NULL
             END
      FROM personas
      ORDER BY n
      RETURNING id_afiliado
    `, [personas]);
    const afiliados = datosAfiliados.rows
      .map(({ id_afiliado }) => id_afiliado)
      .sort((a, b) => Number(a) - Number(b));

    const subdirectivas = {};
    for (const nombre of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const { rows } = await dbPool.query(
        'INSERT INTO subdirectiva (nombre) VALUES ($1) RETURNING id_subdirectiva',
        [`Subdirectiva ${nombre}`]
      );
      subdirectivas[nombre] = rows[0].id_subdirectiva;
    }

    const instituciones = {};
    const sedes = {};
    async function crearInstitucion(clave, subdirectiva, nombre) {
      const { rows } = await dbPool.query(
        'INSERT INTO institucion (id_subdirectiva, nombre) VALUES ($1, $2) RETURNING id_institucion',
        [subdirectivas[subdirectiva], nombre]
      );
      instituciones[clave] = rows[0].id_institucion;
      sedes[clave] = [];
      for (let sede = 1; sede <= 2; sede += 1) {
        const resultadoSede = await dbPool.query(
          `INSERT INTO sede (id_institucion, id_subdirectiva, nombre)
           VALUES ($1, $2, $3) RETURNING id_sede`,
          [instituciones[clave], subdirectivas[subdirectiva], `${nombre} sede ${sede}`]
        );
        sedes[clave].push(resultadoSede.rows[0].id_sede);
      }
    }

    for (const letra of ['A', 'B', 'C', 'D', 'E']) {
      await crearInstitucion(letra, letra, `Institución ${letra}`);
    }
    await crearInstitucion('F1', 'F', 'Institución F1');
    await crearInstitucion('F2', 'F', 'Institución F2');

    const asignaciones = [];
    function asignar(letra, numeros) {
      for (const n of numeros) {
        const claveInstitucion = letra === 'F'
          ? (n <= 5044 ? 'F1' : 'F2')
          : letra;
        const indiceSede = n % 2;
        asignaciones.push({
          afiliado: afiliados[n - 1],
          subdirectiva: subdirectivas[letra],
          sede: sedes[claveInstitucion][indiceSede],
        });
      }
    }
    asignar('A', Array.from({ length: 40 }, (_, i) => i + 1));
    asignar('B', [1]);
    asignar('C', [41, 42, 43]);
    asignar('D', [44, 45, 46, 47, 48]);
    asignar('E', Array.from({ length: 40 }, (_, i) => i + 49));
    asignar('F', Array.from({ length: 9912 }, (_, i) => i + 89));

    await dbPool.query(`
      INSERT INTO subdirectiva_afiliado (id_afiliado, id_subdirectiva, id_sede)
      SELECT id_afiliado, id_subdirectiva, id_sede
      FROM unnest($1::bigint[], $2::bigint[], $3::bigint[])
        AS asignacion(id_afiliado, id_subdirectiva, id_sede)
    `, [
      asignaciones.map(({ afiliado }) => afiliado),
      asignaciones.map(({ subdirectiva }) => subdirectiva),
      asignaciones.map(({ sede }) => sede),
    ]);

    await dbPool.query('ANALYZE');

    const poolConCaptura = {
      async connect() {
        const client = await dbPool.connect();
        return {
          query(sql, params) {
            if (/GROUP BY/i.test(sql)) ultimaConsultaInforme = { sql, params };
            return client.query(sql, params);
          },
          release() {
            client.release();
          },
        };
      },
    };
    const controlador = crearControladorInformesChatbot({
      dbPool: poolConCaptura,
      logger: { info() {}, error(error) { t.diagnostic(`Error del controlador: ${error.message}`); } },
    });
    async function consultar(body) {
      const res = respuestaFalsa();
      await controlador({ user: { id_usuario: 1 }, body }, res);
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      assertSinDatosPersonales(res.body);
      return res.body;
    }

    let ultimaConsultaInforme;
    const todosLosEstados = await consultar({ informe: 'afiliados_por_estado' });
    const referenciaEstados = await dbPool.query(`
      SELECT estado AS grupo, COUNT(DISTINCT id_afiliado)::int AS cantidad
      FROM afiliado GROUP BY estado ORDER BY estado
    `);
    assert.deepEqual(todosLosEstados.filas, referenciaEstados.rows);
    assert.deepEqual(todosLosEstados.avisos, []);
    assert.equal(todosLosEstados.filas.reduce((total, fila) => total + fila.cantidad, 0), 10000);

    const afiliadosPorSubdirectiva = await consultar({ informe: 'afiliados_por_subdirectiva' });
    const referenciaSubdirectivas = await dbPool.query(`
      SELECT sd.nombre AS grupo, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
      FROM afiliado a
      JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
      JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
      WHERE sd.es_principal = FALSE
      GROUP BY sd.id_subdirectiva, sd.nombre
      ORDER BY sd.nombre
    `);
    assert.deepEqual(
      afiliadosPorSubdirectiva.filas,
      ocultarComplementariamente(referenciaSubdirectivas.rows)
    );
    assert.equal(
      afiliadosPorSubdirectiva.filas.some(({ grupo }) =>
        ['Subdirectiva B', 'Subdirectiva C'].includes(grupo)
      ),
      false
    );
    assert.equal(
      afiliadosPorSubdirectiva.filas.some(({ grupo }) => grupo === 'Subdirectiva D'),
      true
    );
    assert.ok(!afiliadosPorSubdirectiva.avisos.some((aviso) => aviso.includes('pueden solaparse')));
    assert.ok(afiliadosPorSubdirectiva.avisos.some((aviso) => aviso.includes('Se omiten grupos')));
    const referenciaPorNombre = new Map(referenciaSubdirectivas.rows.map((fila) => [fila.grupo, fila.cantidad]));
    assert.deepEqual(
      ['Subdirectiva B', 'Subdirectiva C', 'Subdirectiva D', 'Subdirectiva A'].map((nombre) => referenciaPorNombre.get(nombre)),
      [1, 3, 5, 40]
    );
    assert.equal(referenciaSubdirectivas.rows.reduce((total, fila) => total + fila.cantidad, 0), 10001);

    const institucionesReporte = await consultar({
      informe: 'afiliados_por_institucion_sede',
      agrupacion: 'institucion',
    });
    const referenciaInstituciones = await dbPool.query(`
      SELECT i.nombre AS grupo, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
      FROM afiliado a
      JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
      JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
      JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
      JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva
      GROUP BY i.id_institucion, i.nombre ORDER BY i.nombre
    `);
    assert.deepEqual(institucionesReporte.filas, referenciaInstituciones.rows.filter(({ cantidad }) => cantidad >= 5));

    const sedesReporte = await consultar({
      informe: 'afiliados_por_institucion_sede',
      agrupacion: 'sede',
    });
    const referenciaSedes = await dbPool.query(`
      SELECT s.nombre AS grupo, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
      FROM afiliado a
      JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
      JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
      JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
      JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva
      GROUP BY s.id_sede, s.nombre ORDER BY s.nombre
    `);
    assert.deepEqual(sedesReporte.filas, ocultarComplementariamente(referenciaSedes.rows));

    const aprobaciones = await consultar({
      informe: 'aprobaciones_por_mes',
      filtros: { desde: '2025-12-01', hasta: '2026-12-31' },
    });
    const referenciaAprobaciones = await dbPool.query(`
      SELECT to_char(date_trunc('month', fecha_aprobacion), 'YYYY-MM') AS grupo,
             COUNT(*)::int AS cantidad
      FROM afiliado
      WHERE estado = 'aprobado'
        AND fecha_aprobacion IS NOT NULL
        AND fecha_aprobacion >= $1::date
        AND fecha_aprobacion < ($2::date + INTERVAL '1 day')
      GROUP BY date_trunc('month', fecha_aprobacion)
      ORDER BY grupo
    `, ['2025-12-01', '2026-12-31']);
    assert.deepEqual(aprobaciones.filas, ocultarComplementariamente(referenciaAprobaciones.rows));
    assert.ok(aprobaciones.avisos.some((aviso) => aviso.includes('sin fecha de aprobación')));
    assert.equal(referenciaAprobaciones.rows.find(({ grupo }) => grupo === '2025-12').cantidad, 1);
    assert.equal(referenciaAprobaciones.rows.length, 7);
    assert.equal(aprobaciones.filas.length, 5);
    assert.equal(aprobaciones.filas.some(({ grupo }) => grupo === '2025-12'), false);

    const personaUnica = await consultar({
      informe: 'afiliados_por_institucion_sede',
      agrupacion: 'sede',
      filtros: {
        id_subdirectiva: String(subdirectivas.B),
        id_institucion: String(instituciones.B),
        id_sede: String(sedes.B[1]),
        estado: 'aprobado',
        estado_sindical: 'activo',
      },
    });
    assert.deepEqual(personaUnica.filas, []);
    assert.equal(personaUnica.privacidad.hubo_supresion, true);
    assert.ok(personaUnica.avisos.some((aviso) => aviso.includes('Se omiten grupos')));

    await t.test('avisos solo ante supresión o solapamiento entre grupos visibles', async () => {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO subdirectiva_afiliado (id_afiliado, id_subdirectiva, id_sede) VALUES ($1,$2,$3)',
          [afiliados[0], subdirectivas.E, sedes.E[0]]
        );
        const todos = await ejecutarInformeAgregado(client, { informe: 'afiliados_por_subdirectiva', filtros: {} });
        assert.ok(todos.avisos.some((aviso) => aviso.includes('pueden solaparse')));
        const unGrupo = await ejecutarInformeAgregado(client, {
          informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: String(subdirectivas.A) },
        });
        assert.deepEqual(unGrupo.avisos, []);
        const filtroSinSolapado = await ejecutarInformeAgregado(client, {
          informe: 'afiliados_por_subdirectiva', filtros: { estado: 'pendiente' },
        });
        assert.ok(!filtroSinSolapado.avisos.some((aviso) => aviso.includes('pueden solaparse')));
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    await t.test('LIMITACIÓN CONOCIDA: inferencia por resta entre filtros solapados', async () => {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        await client.query("UPDATE afiliado SET estado_sindical = 'activo' WHERE id_afiliado = ANY($1::bigint[])", [afiliados.slice(0, 40)]);
        await client.query("UPDATE afiliado SET estado_sindical = 'inactivo' WHERE id_afiliado = $1", [afiliados[0]]);
        const base = { informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: String(subdirectivas.A) } };
        const total = await ejecutarInformeAgregado(client, base);
        const activos = await ejecutarInformeAgregado(client, { ...base, filtros: { ...base.filtros, estado_sindical: 'activo' } });
        const inactivos = await ejecutarInformeAgregado(client, { ...base, filtros: { ...base.filtros, estado_sindical: 'inactivo' } });
        assert.equal(total.filas[0].cantidad, 40);
        assert.equal(activos.filas[0].cantidad, 39);
        assert.deepEqual(inactivos.filas, []);
        assert.equal(total.filas[0].cantidad - activos.filas[0].cantidad, 1);
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    await t.test('exportaciones usan solo correos de grupos visibles, incluso con nombres repetidos', async () => {
      await dbPool.query('UPDATE sede SET nombre = $1 WHERE id_sede = ANY($2::bigint[])', [
        'Sede duplicada', [sedes.A[1], sedes.C[1]],
      ]);
      const casos = [
        {
          solicitud: { informe: 'afiliados_por_estado', filtros: { estado_sindical: 'activo' } },
          gruposSql: `SELECT estado AS grupo, estado AS grupo_id, COUNT(*)::int cantidad
                      FROM afiliado WHERE estado_sindical = 'activo' GROUP BY estado ORDER BY estado`,
          correosSql: `SELECT DISTINCT p.correo FROM afiliado a JOIN persona p USING (id_persona)
                       WHERE a.estado_sindical = 'activo' AND a.estado = ANY($1::text[]) ORDER BY p.correo`,
        },
        {
          solicitud: { informe: 'afiliados_por_subdirectiva', filtros: {} },
          gruposSql: `SELECT sd.nombre grupo, sd.id_subdirectiva::text grupo_id, COUNT(DISTINCT a.id_afiliado)::int cantidad
                      FROM afiliado a JOIN subdirectiva_afiliado sa USING (id_afiliado)
                      JOIN subdirectiva sd USING (id_subdirectiva) WHERE NOT sd.es_principal
                      GROUP BY sd.id_subdirectiva ORDER BY sd.nombre`,
          correosSql: `SELECT DISTINCT p.correo FROM afiliado a JOIN persona p USING (id_persona)
                       JOIN subdirectiva_afiliado sa USING (id_afiliado)
                       JOIN subdirectiva sd USING (id_subdirectiva)
                       WHERE NOT sd.es_principal AND sd.id_subdirectiva::text = ANY($1::text[]) ORDER BY p.correo`,
        },
        ...['institucion', 'sede'].map((agrupacion) => ({
          solicitud: { informe: 'afiliados_por_institucion_sede', agrupacion, filtros: {} },
          gruposSql: `SELECT ${agrupacion === 'sede' ? 's' : 'i'}.nombre grupo,
                             ${agrupacion === 'sede' ? 's.id_sede' : 'i.id_institucion'}::text grupo_id,
                             COUNT(DISTINCT a.id_afiliado)::int cantidad
                      FROM afiliado a JOIN subdirectiva_afiliado sa USING (id_afiliado)
                      JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND NOT sd.es_principal
                      JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
                      JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva
                      GROUP BY ${agrupacion === 'sede' ? 's.id_sede' : 'i.id_institucion'} ORDER BY grupo`,
          correosSql: `SELECT DISTINCT p.correo FROM afiliado a JOIN persona p USING (id_persona)
                       JOIN subdirectiva_afiliado sa USING (id_afiliado)
                       JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND NOT sd.es_principal
                       JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
                       JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva
                       WHERE ${agrupacion === 'sede' ? 's.id_sede' : 'i.id_institucion'}::text = ANY($1::text[]) ORDER BY p.correo`,
        })),
        {
          solicitud: { informe: 'aprobaciones_por_mes', filtros: { desde: '2025-12-01', hasta: '2026-12-31' } },
          gruposSql: `SELECT to_char(date_trunc('month', fecha_aprobacion), 'YYYY-MM') grupo,
                             to_char(date_trunc('month', fecha_aprobacion), 'YYYY-MM') grupo_id,
                             COUNT(*)::int cantidad FROM afiliado
                      WHERE estado = 'aprobado' AND fecha_aprobacion >= '2025-12-01'::date
                        AND fecha_aprobacion < '2027-01-01'::date
                      GROUP BY date_trunc('month', fecha_aprobacion) ORDER BY grupo`,
          correosSql: `SELECT DISTINCT p.correo FROM afiliado a JOIN persona p USING (id_persona)
                       WHERE a.estado = 'aprobado' AND a.fecha_aprobacion >= '2025-12-01'::date
                         AND a.fecha_aprobacion < '2027-01-01'::date
                         AND to_char(date_trunc('month', a.fecha_aprobacion), 'YYYY-MM') = ANY($1::text[])
                       ORDER BY p.correo`,
        },
      ];
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        for (const caso of casos) {
          const referencia = ocultarComplementariamente((await client.query(caso.gruposSql)).rows);
          const informe = await ejecutarInformeAgregado(client, caso.solicitud, { incluirGruposInternos: true });
          assert.deepEqual(new Set(informe.gruposInternos), new Set(referencia.map((fila) => fila.grupo_id)));
          const correos = await consultarCorreosGruposVisibles(client, caso.solicitud, informe.gruposInternos);
          const esperados = (await client.query(caso.correosSql, [referencia.map((fila) => fila.grupo_id)])).rows.map((fila) => fila.correo);
          if (esperados.length > configuracionInformes.maxCorreos) {
            assert.equal(correos.status, 422);
            assert.equal((await consultarDatosGruposVisibles(client, caso.solicitud, informe.gruposInternos, 'afiliados')).status, 422);
            continue;
          }
          assert.deepEqual(correos, esperados);
          const personas = await consultarDatosGruposVisibles(client, caso.solicitud, informe.gruposInternos, 'afiliados');
          assert.deepEqual(personas.map((persona) => persona.correo), esperados);
          if (caso.solicitud.agrupacion === 'sede') {
            assert.ok(informe.gruposInternos.includes(String(sedes.A[1])));
            assert.ok(!informe.gruposInternos.includes(String(sedes.C[1])));
            assert.ok(!correos.includes('sutens-test-41@example.invalid'));
          }
        }
        const filtrado = {
          informe: 'afiliados_por_institucion_sede',
          agrupacion: 'sede',
          filtros: {
            id_subdirectiva: String(subdirectivas.A),
            id_institucion: String(instituciones.A),
            id_sede: String(sedes.A[1]),
            estado: 'aprobado',
            estado_sindical: 'activo',
          },
        };
        const informeFiltrado = await ejecutarInformeAgregado(client, filtrado, { incluirGruposInternos: true });
        const personasFiltradas = await consultarDatosGruposVisibles(client, filtrado, informeFiltrado.gruposInternos, 'afiliados');
        const referenciaFiltrada = await client.query(`
          SELECT p.correo
          FROM afiliado a JOIN persona p USING (id_persona)
          JOIN subdirectiva_afiliado sa USING (id_afiliado)
          WHERE sa.id_subdirectiva = $1 AND sa.id_sede = $2
            AND a.estado = 'aprobado' AND a.estado_sindical = 'activo'
          ORDER BY p.correo
        `, [subdirectivas.A, sedes.A[1]]);
        assert.deepEqual(personasFiltradas.map((persona) => persona.correo), referenciaFiltrada.rows.map((row) => row.correo));
        assert.ok(personasFiltradas.every((persona) =>
          persona.subdirectiva === 'Subdirectiva A' && persona.sede === 'Sede duplicada'
        ));
        const informeUnico = await ejecutarInformeAgregado(client, {
          informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: String(subdirectivas.B) },
        }, { incluirGruposInternos: true });
        assert.deepEqual(informeUnico.gruposInternos, []);
        assert.deepEqual(await consultarCorreosGruposVisibles(client, { informe: 'afiliados_por_subdirectiva', filtros: {} }, informeUnico.gruposInternos), []);
        assert.deepEqual(await consultarDatosGruposVisibles(client, { informe: 'afiliados_por_subdirectiva', filtros: {} }, informeUnico.gruposInternos, 'afiliados'), []);
        await client.query('COMMIT');
      } finally {
        client.release();
      }

      const eventos = [];
      const exportar = crearControladorExportacionChatbot({
        dbPool, logger: { info: (evento) => eventos.push(JSON.parse(evento)), error: (error) => t.diagnostic(String(error)) },
      });
      for (const formato of ['pdf', 'excel', 'correos']) {
        const res = respuestaFalsa();
        await exportar({ user: { id_usuario: 1 }, body: { informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: String(subdirectivas.A) }, formato } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers['Cache-Control'], 'no-store');
        if (formato === 'pdf') {
          assert.equal(res.body.subarray(0, 4).toString(), '%PDF');
          const pdf = await PDFDocument.load(res.body);
          assert.ok(pdf.getPageCount() >= 2);
          assert.match(await textoPdf(res.body), /Datos personales de uso restringido \(Ley 1581 de 2012\)/);
        } else {
          const libro = new ExcelJS.Workbook();
          await libro.xlsx.load(res.body);
          if (formato === 'correos') {
            const hoja = libro.getWorksheet('Correos');
            assert.equal(hoja.getCell('A1').value, 'Correo');
            assert.equal(hoja.getCell('B1').value, 'Datos personales de uso restringido (Ley 1581 de 2012)');
            assert.equal(hoja.rowCount, 41);
            assert.equal(hoja.getCell('B2').value, null);
          } else {
            const hoja = libro.getWorksheet('Afiliados');
            assert.deepEqual(hoja.getRow(4).values.slice(1), [
              'Nombre', 'Cédula', 'Correo', 'Subdirectiva', 'Institución educativa', 'Cargo sindical',
              'Sede', 'Rol laboral', 'Estado solicitud', 'Estado sindical',
            ]);
            assert.equal(hoja.rowCount, 44);
            assert.equal(hoja.getCell('C1').value, 'Afiliados por subdirectiva');
            assert.equal(libro.model.media.length, 1);
            assert.equal(hoja.getCell('D5').value, 'Subdirectiva A');
            assert.ok(libro.getWorksheet('Detalles del informe'));
          }
          assert.equal(libro.getWorksheet('Detalles del informe').getCell('A1').value,
            'Datos personales de uso restringido (Ley 1581 de 2012)');
        }
      }
      assert.equal(eventos.length, 3);
      assert.ok(eventos.every((evento) => evento.evento === 'chatbot_exportacion' && evento.resultado === '200'));
      assert.ok(eventos.every((evento) => evento.cantidad === 40 && JSON.stringify(evento.filtros) === '["id_subdirectiva"]'));
      assert.equal(JSON.stringify(eventos).includes('@example.invalid'), false);
    });

    await t.test('sesiones reales HTTP, permisos, bandera, auditoría y cuota independiente', async () => {
      const tokens = {};
      for (const [indice, rol] of ['Administrador SUTENS', 'Directiva', 'Afiliado'].entries()) {
        const usuario = (await dbPool.query(
          'INSERT INTO usuario (id_afiliado, usuario, password_hash) VALUES ($1, $2, $3) RETURNING id_usuario',
          [afiliados[indice * 4], `test-usuario-${indice}`, 'hash-sintetico']
        )).rows[0].id_usuario;
        const idRol = (await dbPool.query(
          'INSERT INTO rol_sistema (nombre) VALUES ($1) RETURNING id_rol_sistema', [rol]
        )).rows[0].id_rol_sistema;
        await dbPool.query('INSERT INTO usuario_rol (id_usuario, id_rol_sistema) VALUES ($1, $2)', [usuario, idRol]);
        const sid = randomUUID();
        await dbPool.query(
          "INSERT INTO sesion_usuario (id_sesion, id_usuario, auth_version, expira_at) VALUES ($1, $2, 0, now() + interval '1 hour')",
          [sid, usuario]
        );
        tokens[rol] = jwt.sign({ id_usuario: usuario, sid, auth_version: 0, roles: ['Administrador SUTENS'] }, process.env.JWT_SECRET, { expiresIn: '1h' });
      }
      const app = express();
      app.use('/informes/exportar', auditarIntentoDescarga);
      app.use(express.json());
      app.use('/informes/exportar', manejarCuerpoInvalidoDescarga);
      app.get('/perfil', autenticar, me);
      app.use(chatbotRouter);
      const server = await new Promise((resolve) => {
        const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
      });
      const eventos = [];
      const infoOriginal = console.info;
      console.info = (linea) => { try { eventos.push(JSON.parse(linea)); } catch { infoOriginal(linea); } };
      limpiarLimitesDescargasParaPruebas();
      try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const enviar = (ruta, token, body) => fetch(`${base}${ruta}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        const cuerpo = { informe: 'afiliados_por_subdirectiva', filtros: { id_subdirectiva: String(subdirectivas.A) }, formato: 'correos' };
        const perfil = await fetch(`${base}/perfil`, { headers: { Authorization: `Bearer ${tokens['Administrador SUTENS']}` } });
        assert.equal(perfil.status, 200);
        assert.equal((await perfil.json()).chatbot_habilitado, true);
        assert.equal((await enviar('/informes', null, { informe: 'afiliados_por_estado' })).status, 401);
        assert.equal((await enviar('/informes', tokens.Directiva, { informe: 'afiliados_por_estado' })).status, 403);
        assert.equal((await enviar('/informes', tokens['Administrador SUTENS'], {
          informe: 'afiliados_por_estado', filtros: { estado_sindical: 'privado@example.invalid' },
        })).status, 400);
        const invalido = await fetch(`${base}/informes/exportar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"correo": "privado@example.invalid"',
        });
        assert.equal(invalido.status, 400);
        const excesivo = await fetch(`${base}/informes/exportar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: 'x'.repeat(110000) }),
        });
        assert.equal(excesivo.status, 413);
        assert.equal((await enviar('/informes/exportar', null, cuerpo)).status, 401);
        const vencido = jwt.sign({ id_usuario: 1, sid: randomUUID(), auth_version: 0 }, process.env.JWT_SECRET, { expiresIn: -1 });
        assert.equal((await enviar('/informes/exportar', vencido, cuerpo)).status, 401);
        for (const rol of ['Directiva', 'Afiliado']) {
          assert.equal((await enviar('/informes/exportar', tokens[rol], { ...cuerpo, roles: ['Administrador SUTENS'] })).status, 403);
        }
        const informeHttp = await enviar('/informes', tokens['Administrador SUTENS'], { informe: cuerpo.informe, filtros: cuerpo.filtros });
        assert.equal(informeHttp.status, 200);
        assert.equal((await informeHttp.json()).descargas_habilitadas, true);
        assert.equal((await enviar('/informes/exportar', tokens['Administrador SUTENS'], { ...cuerpo, alcance: 'global' })).status, 400);
        assert.equal((await enviar('/informes/exportar', tokens['Administrador SUTENS'], {
          informe: 'afiliados_por_estado', formato: 'correos',
        })).status, 422);
        for (let i = 0; i < 3; i += 1) {
          assert.equal((await enviar('/informes/exportar', tokens['Administrador SUTENS'], cuerpo)).status, 200);
        }
        assert.equal((await enviar('/informes/exportar', tokens['Administrador SUTENS'], cuerpo)).status, 429);
        const auditorias = eventos.filter((evento) => evento.evento === 'chatbot_exportacion');
        assert.deepEqual(auditorias.map((evento) => evento.resultado), ['400', '413', '401', '401', '403', '403', '400', '422', '200', '200', '200', '429']);
        assert.ok(auditorias.every((evento) => !Object.hasOwn(evento, 'usuario_id')));
        assert.ok(auditorias.filter((evento) => evento.resultado === '200').every((evento) => evento.cantidad === 40));
        assert.equal(JSON.stringify(auditorias).includes('@example.invalid'), false);
        assert.ok(auditorias.every((evento) => !JSON.stringify(evento.filtros).includes(String(subdirectivas.A))));
        const informesAuditados = eventos.filter((evento) => evento.evento === 'chatbot_informe');
        assert.ok(['401', '403', '400', '200'].every((resultado) =>
          informesAuditados.some((evento) => evento.resultado === resultado)));
        assert.ok(informesAuditados.every((evento) => !Object.hasOwn(evento, 'usuario_id')));
        assert.doesNotMatch(JSON.stringify(informesAuditados), /privado@example\.invalid|"id_subdirectiva":|"estado_sindical":/);

        const script = `
          import express from 'express';
          import router from './src/routes/chatbot.routes.js';
          import { pool } from './src/config/db.js';
          const app = express(); app.use(express.json(), router);
          const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
          const enviar = (ruta, body) => fetch('http://127.0.0.1:' + server.address().port + ruta, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.TEST_TOKEN },
            body: JSON.stringify(body),
          });
          const reporte = await enviar('/informes', { informe: 'afiliados_por_estado' });
          const configuracion = await reporte.json();
          const descarga = await enviar('/informes/exportar', { informe: 'afiliados_por_estado', formato: 'correos' });
          if (reporte.status !== 200 || configuracion.descargas_habilitadas !== false || descarga.status !== 404) process.exitCode = 1;
          await new Promise(resolve => server.close(resolve)); await pool.end();
        `;
        const hijo = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: urlBaseDatos(adminUrlText, nombreDb), NODE_ENV: 'test',
            CHATBOT_ENABLED: 'true', CHATBOT_DOWNLOADS_ENABLED: 'false', TEST_TOKEN: tokens['Administrador SUTENS'] },
        });
        assert.match(hijo.stdout, /"evento":"chatbot_exportacion".*"resultado":"404"/);

        const apagado = `
          import express from 'express';
          import router from './src/routes/chatbot.routes.js';
          import { autenticar } from './src/middleware/auth.js';
          import { me } from './src/controllers/auth.controller.js';
          import { pool } from './src/config/db.js';
          const app = express(); app.use(express.json()); app.get('/perfil', autenticar, me); app.use(router);
          const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
          const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.TEST_TOKEN };
          const perfil = await fetch('http://127.0.0.1:' + server.address().port + '/perfil', { headers });
          const datos = await perfil.json();
          const descarga = await fetch('http://127.0.0.1:' + server.address().port + '/informes/exportar', {
            method: 'POST', headers, body: JSON.stringify({ informe: 'afiliados_por_estado', formato: 'correos' }),
          });
          if (perfil.status !== 200 || datos.chatbot_habilitado !== false || descarga.status !== 404) process.exitCode = 1;
          await new Promise(resolve => server.close(resolve)); await pool.end();
        `;
        await promisify(execFile)(process.execPath, ['--input-type=module', '-e', apagado], {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: urlBaseDatos(adminUrlText, nombreDb), NODE_ENV: 'test',
            CHATBOT_ENABLED: 'false', CHATBOT_DOWNLOADS_ENABLED: 'true', TEST_TOKEN: tokens['Administrador SUTENS'] },
        });
      } finally {
        console.info = infoOriginal;
        limpiarLimitesDescargasParaPruebas();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
    });

    await t.test('PDF y Excel muestran nombres de filtros en lugar de identificadores', async () => {
      const exportar = crearControladorExportacionChatbot({
        dbPool, logger: { info() {}, error(error) { t.diagnostic(String(error)); } },
      });
      const filtros = {
        id_subdirectiva: String(subdirectivas.A),
        id_institucion: String(instituciones.A),
        id_sede: String(sedes.A[1]),
        estado: 'aprobado',
        estado_sindical: 'activo',
      };
      for (const formato of ['pdf', 'excel', 'correos']) {
        const res = respuestaFalsa();
        await exportar({
          user: { id_usuario: 1 },
          body: { informe: 'afiliados_por_institucion_sede', agrupacion: 'sede', filtros, formato },
        }, res);
        assert.equal(res.statusCode, 200);
        let texto;
        if (formato === 'pdf') {
          texto = await textoPdf(res.body);
        } else {
          const libro = new ExcelJS.Workbook();
          await libro.xlsx.load(res.body);
          const hoja = libro.getWorksheet('Detalles del informe');
          texto = hoja.getColumn(1).values.filter(Boolean).join('\n');
        }
        assert.match(texto, /Subdirectiva: Subdirectiva A/);
        assert.match(texto, /Instituci.n: Instituci.n A/);
        assert.match(texto, /Sede: Sede duplicada/);
        assert.match(texto, /Estado de afiliaci.n: aprobado/);
        assert.match(texto, /Estado sindical: activo/);
        assert.doesNotMatch(texto, /id_(subdirectiva|institucion|sede)/);
      }

      const sinFiltros = respuestaFalsa();
      await exportar({
        user: { id_usuario: 1 }, body: { informe: 'afiliados_por_subdirectiva', formato: 'excel' },
      }, sinFiltros);
      assert.equal(sinFiltros.statusCode, 200);
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(sinFiltros.body);
      assert.equal(libro.getWorksheet('Detalles del informe').getCell('A5').value, 'Filtros: ninguno');
    });

    await t.test('la transacción rechaza escrituras con READ ONLY', async () => {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        await client.query("SELECT set_config('statement_timeout', '5000', true)");
        await assert.rejects(
          client.query("UPDATE afiliado SET estado = estado WHERE id_afiliado = $1", [afiliados[0]]),
          (error) => error.code === '25006'
        );
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    await t.test('statement_timeout cancela pg_sleep en una transacción de informe', async () => {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        await client.query("SELECT set_config('statement_timeout', '100', true)");
        await assert.rejects(
          client.query('SELECT pg_sleep(0.5)'),
          (error) => error.code === '57014'
        );
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    const informesRendimiento = [
      { id: 'afiliados_por_estado', body: { informe: 'afiliados_por_estado' } },
      { id: 'afiliados_por_subdirectiva', body: { informe: 'afiliados_por_subdirectiva' } },
      {
        id: 'afiliados_por_institucion_sede',
        body: { informe: 'afiliados_por_institucion_sede', agrupacion: 'institucion' },
      },
      {
        id: 'aprobaciones_por_mes',
        body: {
          informe: 'aprobaciones_por_mes',
          filtros: { desde: '2025-12-01', hasta: '2026-12-31' },
        },
      },
    ];
    const resultadosRendimiento = [];
    const explicaciones = [];
    for (const informe of informesRendimiento) {
      for (let calentamiento = 0; calentamiento < 3; calentamiento += 1) {
        await consultar(informe.body);
      }

      const duraciones = [];
      for (let repeticion = 0; repeticion < 40; repeticion += 1) {
        const inicio = performance.now();
        await consultar(informe.body);
        duraciones.push(performance.now() - inicio);
      }
      duraciones.sort((a, b) => a - b);
      resultadosRendimiento.push({
        informe: informe.id,
        p50_ms: Number(duraciones[Math.ceil(duraciones.length * 0.50) - 1].toFixed(2)),
        p95_ms: Number(duraciones[Math.ceil(duraciones.length * 0.95) - 1].toFixed(2)),
        repeticiones: duraciones.length,
      });

      assert.ok(ultimaConsultaInforme, `No se capturó SQL de ${informe.id}`);
      const explainClient = await dbPool.connect();
      try {
        await explainClient.query('BEGIN READ ONLY');
        await explainClient.query("SELECT set_config('statement_timeout', '5000', true)");
        const { rows } = await explainClient.query(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${ultimaConsultaInforme.sql}`,
          ultimaConsultaInforme.params
        );
        await explainClient.query('COMMIT');
        const plan = rows[0]['QUERY PLAN'][0];
        explicaciones.push({
          informe: informe.id,
          plan_ms: Number(plan['Planning Time'].toFixed(2)),
          ejecucion_ms: Number(plan['Execution Time'].toFixed(2)),
          buffers: plan.Plan['Shared Hit Blocks'] + plan.Plan['Shared Read Blocks'],
          nodos: extraerNodos(plan.Plan),
        });
      } catch (error) {
        await explainClient.query('ROLLBACK');
        throw error;
      } finally {
        explainClient.release();
      }
    }

    await consultar({
      informe: 'afiliados_por_subdirectiva',
      filtros: { id_subdirectiva: String(subdirectivas.A) },
    });
    const consultaSubdirectivaSelectiva = { ...ultimaConsultaInforme };
    const planSubdirectivaSinIndice = await explicar(consultaSubdirectivaSelectiva);
    await dbPool.query(`
      CREATE INDEX idx_chatbot_test_subdirectiva_afiliado
      ON subdirectiva_afiliado (id_subdirectiva, id_afiliado)
    `);
    await dbPool.query('ANALYZE subdirectiva_afiliado');
    const planSubdirectivaConIndiceTemporal = await explicar(consultaSubdirectivaSelectiva);
    await dbPool.query('DROP INDEX idx_chatbot_test_subdirectiva_afiliado');

    await consultar({
      informe: 'aprobaciones_por_mes',
      filtros: { desde: '2026-03-01', hasta: '2026-03-31' },
    });
    const consultaMensualSelectiva = { ...ultimaConsultaInforme };
    async function explicar(consulta) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        await client.query("SELECT set_config('statement_timeout', '5000', true)");
        const { rows } = await client.query(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${consulta.sql}`,
          consulta.params
        );
        await client.query('COMMIT');
        const plan = rows[0]['QUERY PLAN'][0];
        return {
          ejecucion_ms: Number(plan['Execution Time'].toFixed(2)),
          nodos: extraerNodos(plan.Plan),
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const planMesSinIndice = await explicar(consultaMensualSelectiva);
    await dbPool.query(`
      CREATE INDEX idx_chatbot_test_aprobado_fecha
      ON afiliado (fecha_aprobacion)
      WHERE estado = 'aprobado' AND fecha_aprobacion IS NOT NULL
    `);
    await dbPool.query('ANALYZE afiliado');
    const planMesConIndiceTemporal = await explicar(consultaMensualSelectiva);
    await dbPool.query('DROP INDEX idx_chatbot_test_aprobado_fecha');

    t.diagnostic(`LATENCIAS=${JSON.stringify(resultadosRendimiento)}`);
    t.diagnostic(`EXPLAIN_ANALYZE=${JSON.stringify(explicaciones)}`);
    t.diagnostic(`INDICE_SUBDIRECTIVA_EFIMERO=${JSON.stringify({
      baseline: planSubdirectivaSinIndice,
      indice_parcial_solo_en_base_temporal: planSubdirectivaConIndiceTemporal,
    })}`);
    t.diagnostic(`INDICE_FECHA_EFIMERO=${JSON.stringify({
      baseline: planMesSinIndice,
      indice_parcial_solo_en_base_temporal: planMesConIndiceTemporal,
    })}`);
    t.diagnostic(`PRIVACIDAD=${JSON.stringify({
      total_afiliados: todosLosEstados.filas.reduce((total, fila) => total + fila.cantidad, 0),
      afiliaciones_por_subdirectiva: referenciaSubdirectivas.rows.reduce((total, fila) => total + fila.cantidad, 0),
      subdirectivas_sinteticas: referenciaSubdirectivas.rows.length,
      aprobados_sin_fecha_aviso: aprobaciones.avisos.some((aviso) => aviso.includes('sin fecha de aprobación')),
      grupo_unico_suprimido: personaUnica.privacidad.hubo_supresion,
    })}`);
  } finally {
    try {
      await poolAplicacion.end();
      await dbPool?.end();
    } finally {
      try {
        if (creada) {
          await adminPool.query(`DROP DATABASE IF EXISTS ${identificadorSqlSeguro(nombreDb)}`);
        }
      } finally {
        await adminPool.end();
      }
    }
  }
});
