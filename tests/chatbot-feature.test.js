import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const ejecutar = promisify(execFile);
const script = `
  import express from 'express';
  import router from './src/routes/chatbot.routes.js';
  import { pool } from './src/config/db.js';
  import { chatbotHabilitado, exigirChatbotHabilitado, manejarCuerpoInvalidoChatbot } from './src/config/chatbot.js';
  const app = express(); app.use('/api/chatbot', exigirChatbotHabilitado);
  app.use(express.json()); app.use('/api/chatbot', manejarCuerpoInvalidoChatbot); app.use('/api/chatbot', router);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  for (const [ruta, metodo] of [['/informes', 'POST'], ['/informes/exportar', 'POST'], ['/otra-ruta', 'GET']]) {
    const respuesta = await fetch('http://127.0.0.1:' + server.address().port + '/api/chatbot' + ruta, { method: metodo });
    const esperado = chatbotHabilitado ? 401 : 404;
    if (respuesta.status !== esperado) throw new Error(ruta + ': ' + respuesta.status + ' != ' + esperado);
  }
  const invalida = await fetch('http://127.0.0.1:' + server.address().port + '/api/chatbot/informes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"correo":"persona@example.invalid"',
  });
  if (invalida.status !== (chatbotHabilitado ? 400 : 404)) throw new Error('JSON inválido: ' + invalida.status);
  await new Promise(resolve => server.close(resolve)); await pool.end();
`;

for (const valor of ['false', 'true']) {
  test(`CHATBOT_ENABLED=${valor} protege todas las rutas`, async () => {
    const resultado = await ejecutar(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, CHATBOT_ENABLED: valor, NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://sutens_test@127.0.0.1:1/postgres' },
    });
    assert.doesNotMatch(resultado.stdout + resultado.stderr, /persona@example\.invalid/);
  });
}

test('una bandera CHATBOT_ENABLED inválida impide el arranque', async () => {
  await assert.rejects(ejecutar(process.execPath, ['--input-type=module', '-e', "import './src/config/chatbot.js'"], {
    env: { ...process.env, CHATBOT_ENABLED: 'invalido' },
  }), (error) => /CHATBOT_ENABLED debe ser true o false/.test(error.stderr));
});
