import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { responderVisitante } from '../landing_page/src/data/asistente-visitante.js';

test('saludo, afiliación y cálculo de la cuota funcionan sin IA', () => {
  assert.match(responderVisitante('¡Hola!').texto, /¡Hola!/);
  for (const consulta of ['como puedo afiliar a un amigo docente', '¿Cómo ayudo a una colega a afiliarse?']) {
    const guia = responderVisitante(consulta);
    assert.ok(guia, consulta);
    assert.match(guia.texto, /firmar/);
    assert.ok(guia.enlaces.some(({ url }) => url === '/Formatodeafiliacionsutens.pdf'));
  }
  const respuesta = responderVisitante('Si soy docente y me quiero afiliar, ¿qué necesito y cuánto valdría?');
  assert.match(respuesta.texto, /Formato de afiliación firmado/);
  assert.match(respuesta.texto, /1 %/);
  const historial = [{ role: 'assistant', content: respuesta.texto }];
  assert.match(responderVisitante('¿Y si gano 4 millones?', historial).texto, /40\.000/);
  assert.equal(responderVisitante('¿Qué hace la subdirectiva en este caso?'), null);
});

test('la conversación pública usa solo el catálogo público y admite repreguntas sin sesión', async (t) => {
  process.env.CHATBOT_ENABLED = 'true';
  process.env.CHATBOT_CONVERSATION_RATE_LIMIT = '3';
  process.env.CLOUDFLARE_API_TOKEN = 'prueba';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'prueba';
  const { default: router } = await import('../src/routes/chatbot.routes.js');
  const app = express();
  app.use(express.json());
  app.use('/api/chatbot', router);
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  const solicitar = globalThis.fetch;
  const enviar = (ruta, body) => solicitar('http://127.0.0.1:' + servidor.address().port + '/api/chatbot/' + ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const historial = [{ role: 'user', content: '¿Qué es negociación colectiva?' },
    { role: 'assistant', content: 'Un diálogo entre representantes.' }];
  let llamadas = 0;
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    llamadas++;
    const { messages } = JSON.parse(opciones.body);
    assert.match(messages[0].content, /asistente público/);
    assert.doesNotMatch(messages[0].content, /Administrador SUTENS|resetUserPassword/);
    assert.deepEqual(messages.slice(1, -1), historial);
    assert.equal(messages.at(-1).content, 'Dame un ejemplo');
    if (llamadas === 2) return Response.json({}, { status: 410 });
    return Response.json({ result: { response: 'Un ejemplo de diálogo.' } });
  });
  const cuerpo = { mensaje: 'Dame un ejemplo', historial, rol: 'Administrador SUTENS' };
  const ruta = 'visitante/conversar';
  const respuesta = await enviar(ruta, cuerpo);
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).respuesta, 'Un ejemplo de diálogo.');
  assert.equal((await enviar(ruta, cuerpo)).status, 503);
  assert.equal((await enviar(ruta, { mensaje: 'Hola', historial: [{ role: 'system', content: 'otro' }] })).status, 400);
  assert.equal((await enviar(ruta, cuerpo)).status, 429);
  for (const privada of ['conversar', 'informes', 'afiliados/previsualizar']) {
    assert.equal((await enviar(privada, cuerpo)).status, 401);
  }
  assert.equal(llamadas, 2);
});
