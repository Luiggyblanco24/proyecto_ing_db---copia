import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import express from 'express';
import pg from 'pg';

const adminUrl = new URL(process.env.CHATBOT_TEST_ADMIN_URL || 'postgres://localhost');
const temporal = adminUrl.hostname === '127.0.0.1' && adminUrl.username === 'sutens_test'
  && adminUrl.pathname === '/postgres' && !adminUrl.password;

test('instalación, sesiones, permisos, bajas y calendario', { skip: !temporal }, async (t) => {
  const nombre = 'sutens_revision_' + randomUUID().replaceAll('-', '');
  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect();
  await admin.query('CREATE DATABASE ' + nombre);
  const url = new URL('/' + nombre, adminUrl);
  process.env.DATABASE_URL = url.href;
  process.env.JWT_SECRET = randomUUID();
  process.env.NODE_ENV = 'test';
  const { pool } = await import('../src/config/db.js');
  t.after(async () => {
    await pool.end();
    await admin.query('DROP DATABASE ' + nombre);
    await admin.end();
  });
  for (const archivo of ['schema.sql', 'seed.sql']) {
    await pool.query(await readFile(new URL('../database/' + archivo, import.meta.url), 'utf8'));
  }
  assert.equal((await pool.query('SELECT 1 FROM usuario')).rowCount, 0);
  const app = express();
  app.use(express.json());
  app.use('/api', (await import('../src/routes/index.js')).default);
  app.use('/api', (await import('../src/middleware/errores.js')).responderError);
  const server = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  async function solicitar(ruta, status, { method = 'GET', body, token } = {}) {
    const respuesta = await fetch('http://127.0.0.1:' + server.address().port + '/api' + ruta, {
      method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: JSON.stringify(body),
    });
    assert.equal(respuesta.status, status, method + ' ' + ruta);
    return respuesta.status === 204 ? null : respuesta.json();
  }
  const datos = { nombre1: 'Prueba', apellido1: 'Local', usuario: 'titular', correo: 'test@example.invalid',
    cedula: '123456', password: randomUUID(), autorizo_tratamiento: true };
  const { radicado } = await solicitar('/auth/registrar', 201, { method: 'POST', body: datos });
  const promover = () => execFileSync(process.env.SUTENS_TEST_PSQL || 'psql',
    ['-X', '-d', url.href, '-f', 'database/primer-administrador.sql'],
    { input: radicado + '\n', stdio: ['pipe', 'pipe', 'pipe'] });
  promover();
  assert.throws(promover);
  const login = () => solicitar('/auth/login', 200, { method: 'POST', body: datos });
  const anterior = (await login()).token;
  const otro = (await login()).token;
  const nueva = randomUUID();
  const { token } = await solicitar('/auth/me', 200, { method: 'PATCH', token: anterior,
    body: { ...datos, contrasenaActual: datos.password, nuevaContrasena: nueva } });
  await solicitar('/auth/me', 401, { token: otro });
  const perfil = await solicitar('/auth/me', 200, { token });
  assert.ok(perfil.roles.includes('Administrador SUTENS'));
  assert.equal((await solicitar('/public/subdirectivas/total', 200)).total,
    (await pool.query('SELECT count(*)::int AS n FROM subdirectiva WHERE NOT es_principal')).rows[0].n);
  await pool.query("INSERT INTO persona (nombre1, apellido1, cedula, correo) VALUES ('Histórico', 'Local', 'antigua', 'antigua@example.invalid')");
  const historico = (await pool.query("INSERT INTO afiliado (id_persona) SELECT id_persona FROM persona WHERE cedula='antigua' RETURNING id_afiliado")).rows[0];
  await solicitar('/afiliados/' + historico.id_afiliado, 200, { method: 'DELETE', token });
  await solicitar('/auth/registrar', 201, { method: 'POST', body: { ...datos, usuario: 'reingreso',
    cedula: 'antigua', correo: 'antigua@example.invalid' } });
  const nuevo = (await pool.query("SELECT id_afiliado FROM usuario WHERE usuario='reingreso'")).rows[0];
  await solicitar('/afiliados/' + nuevo.id_afiliado, 409, { method: 'DELETE', token });
  const evento = { titulo: 'Asamblea', tipo: 'Asamblea', fecha_inicio: new Date(Date.now() + 3600000) };
  const creado = await solicitar('/calendario/eventos', 201, { method: 'POST', token, body: evento });
  const ruta = '/calendario/eventos/' + creado.evento.id_evento;
  await solicitar(ruta + '/asistencia', 200, { method: 'PATCH', token, body: { confirmada: true } });
  // Una cancelación sin confirmar mantiene el bloqueo mientras llega la asistencia.
  const bloqueo = await pool.connect();
  try {
    await bloqueo.query('BEGIN');
    await bloqueo.query("UPDATE evento SET estado='cancelado' WHERE id_evento=$1", [creado.evento.id_evento]);
    const intento = solicitar(ruta + '/asistencia', 409, { method: 'PATCH', token, body: { confirmada: false } });
    try {
      await t.waitFor(async () => {
        const espera = await pool.query(`SELECT 1 FROM pg_stat_activity
          WHERE datname=current_database() AND wait_event_type='Lock'
            AND query LIKE '%INSERT INTO evento_asistencia%'`);
        assert.ok(espera.rowCount > 0);
      }, { timeout: 5000 });
    } finally {
      await bloqueo.query('COMMIT');
      await intento;
    }
  } finally {
    await bloqueo.query('ROLLBACK');
    bloqueo.release();
  }
  await solicitar(ruta + '/asistencia', 409, { method: 'PATCH', token, body: { confirmada: false } });
  await pool.query("DELETE FROM usuario_rol WHERE id_usuario=$1", [perfil.id_usuario]);
  await pool.query(`INSERT INTO subdirectiva_afiliado (id_afiliado,id_subdirectiva,id_cargo_sindical)
    SELECT $1, sd.id_subdirectiva, c.id_cargo_sindical FROM subdirectiva sd
    JOIN cargo_sindical c ON c.nombre = CASE WHEN sd.es_principal THEN 'Presidente General' ELSE 'Presidente' END
    WHERE sd.es_principal OR sd.nombre='Subdirectiva Ocaña'`, [perfil.id_afiliado]);
  await pool.query("UPDATE afiliado SET estado_sindical='activo' WHERE id_afiliado=$1", [perfil.id_afiliado]);
  const visibles = await solicitar('/membresia/afiliados', 200, { token });
  assert.ok(visibles.some((fila) => fila.id_afiliado === nuevo.id_afiliado));
  await pool.query("UPDATE afiliado SET estado_sindical='inactivo' WHERE id_afiliado=$1", [perfil.id_afiliado]);
  await solicitar('/calendario/eventos', 403, { method: 'POST', token, body: evento });
  await solicitar(ruta + '/cancelar', 403, { method: 'PATCH', token, body: {} });
  await solicitar(ruta + '/asistentes/exportar?formato=excel', 403, { token });
  await pool.query('UPDATE usuario SET requiere_cambio_contrasena=true WHERE id_usuario=$1', [perfil.id_usuario]);
  await solicitar('/auth/logout', 204, { method: 'POST', token });
  await solicitar('/auth/me', 401, { token });
  const migracion = await readFile(new URL('../database/migrations/023_retirar_credencial_demo.sql', import.meta.url), 'utf8');
  assert.equal((await pool.query(migracion)).rowCount, 0);
  const hashDistribuido = migracion.match(/password_hash = '([^']+)'/)[1];
  await pool.query("UPDATE usuario SET usuario='admin', password_hash=$1 WHERE id_usuario=$2", [hashDistribuido, perfil.id_usuario]);
  assert.equal((await pool.query(migracion)).rowCount, 1);
  assert.equal((await pool.query(migracion)).rowCount, 0);
  assert.equal((await pool.query('SELECT activo FROM usuario WHERE id_usuario=$1', [perfil.id_usuario])).rows[0].activo, false);
  await pool.query('ALTER TABLE subdirectiva RENAME TO subdirectiva_en_mantenimiento');
  await solicitar('/public/subdirectivas/total', 500);
  await pool.query('ALTER TABLE subdirectiva_en_mantenimiento RENAME TO subdirectiva');
  await solicitar('/public/subdirectivas/total', 200);
});
