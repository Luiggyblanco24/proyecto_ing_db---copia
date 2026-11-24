import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import express from 'express';
import { chromium } from 'playwright';
import { conversarConChatbot } from '../src/controllers/chatbot-conversation.controller.js';

test('un segundo turno acepta una respuesta anterior de 1200 caracteres', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: 'Respuesta de prueba' } }] }));
  const anteriores = [process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN];
  process.env.CLOUDFLARE_ACCOUNT_ID = 'prueba';
  process.env.CLOUDFLARE_API_TOKEN = 'prueba';
  try {
    const req = { user: { roles: ['Administrador SUTENS'] }, body: { mensaje: 'Continúa', historial: [{ role: 'assistant', content: 'a'.repeat(1200) }] } };
    const res = { json: (dato) => dato };
    assert.equal((await conversarConChatbot(req, res)).respuesta, 'Respuesta de prueba');
  } finally {
    ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'].forEach((k, i) => {
      if (anteriores[i] === undefined) delete process.env[k];
      else process.env[k] = anteriores[i];
    });
  }
});

const navegador = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath();
test('el chat orienta por rol, conserva el contexto y descarta turnos borrados', { skip: !existsSync(navegador) }, async () => {
  const app = express();
  app.use(express.static('public'));
  app.get('/prueba', (req, res) => res.send('<meta charset="utf-8"><script type="module" src="/js/chatbot.js"></script>'));
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: navegador });
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.llamadasIA = 0;
      window.SUTENSChatbotDashboard = {
        chatbotHabilitado: () => true,
        obtenerCapacidades: () => window.capacidades || {},
        navegarA: (vista) => { window.vista = vista; return true; },
        obtenerDatosPropios: () => ({ nombre: 'Afiliada de prueba' }),
      };
      window.apiFetch = async (ruta) => {
        if (ruta.includes('/calendario')) return [{
          titulo: 'Asamblea de prueba', lugar: 'Sede Ocaña', tipo: 'Asamblea',
          estado: 'programado', fecha_inicio: new Date(Date.now() + 86400000),
          asistentes_confirmados: 7, mi_asistencia: true,
        }];
        if (ruta === '/api/biblioteca') return [];
        if (ruta === '/api/biblioteca/educativa') return [
          { titulo: 'Guía de inglés quinto', grado: '5', materia: 'Inglés' },
          { titulo: 'Guía de inglés sexto', grado: '6', materia: 'Inglés' },
        ];
        if (ruta.includes('/conversar')) {
          window.llamadasIA++;
          if (window.llamadasIA === 1) throw new Error('Proveedor fuera de servicio');
          return new Promise((resolve) => { window.terminar = () => resolve({ respuesta: 'Turno anterior' }); });
        }
        throw new Error('Ruta inesperada ' + ruta);
      };
    });
    await page.goto('http://127.0.0.1:' + servidor.address().port + '/prueba');
    await page.getByLabel('Abrir asistente').click();
    const preguntar = async (texto) => {
      const campo = page.getByLabel('Escribe tu pregunta');
      await campo.fill(texto);
      await campo.press('Enter');
    };
    for (const [pregunta, esperado] of [
      ['¿Cómo actualizo mis datos?', 'Mi cuenta'],
      ['Cambiar contraseña', 'Mi cuenta'],
      ['¿Cómo confirmo asistencia?', 'Calendario'],
      ['Aprobar solicitudes', 'perfil autorizado'],
      ['¿Qué es SUTENS?', 'El Tarra'],
      ['que es negociacion colectiva?', 'Las partes discuten la propuesta'],
      ['¿Cuál es mi próxima actividad?', 'Asamblea de prueba'],
      ['¿Y cuántos confirmaron?', 'Asistencias confirmadas: 7'],
    ]) {
      await preguntar(pregunta);
      assert.ok((await page.locator('.chatbot-bot').last().innerText()).includes(esperado), pregunta);
    }
    await preguntar('Busca guías de inglés');
    assert.equal(await page.locator('.chatbot-documento').count(), 2);
    await preguntar('Solo grado 5');
    assert.equal(await page.locator('.chatbot-documento').count(), 3);
    assert.match(await page.locator('.chatbot-documento').last().innerText(), /quinto/);
    await page.evaluate(() => { window.capacidades = { manageAffiliates: true }; });
    await preguntar('Aprobar solicitudes');
    await page.getByRole('button', { name: 'Abrir Administración' }).click();
    assert.equal(await page.evaluate(() => window.vista), 'administracion');
    await page.getByLabel('Abrir asistente').click();
    assert.equal(await page.evaluate(() => window.llamadasIA), 0);
    await preguntar('Explícame el acompañamiento colectivo');
    await page.getByText('No pude completar esa consulta.', { exact: false }).waitFor();
    await preguntar('Explícame la representación colectiva');
    await page.waitForFunction(() => Boolean(window.terminar));
    await page.getByText('Borrar conversación', { exact: true }).click();
    await page.evaluate(async () => { window.terminar(); await new Promise(requestAnimationFrame); });
    assert.equal(await page.locator('.chatbot-bot').count(), 1);
    assert.equal(await page.getByText('Turno anterior').count(), 0);
    await page.evaluate(() => { window.SUTENSChatbotDashboard.iaDisponible = () => false; });
    await preguntar('Explícame un asunto sin entrada verificada');
    assert.match(await page.locator('.chatbot-bot').last().innerText(), /No encontré una respuesta verificada/);
    assert.equal(await page.evaluate(() => window.llamadasIA), 2);
  } finally {
    await browser?.close();
    await new Promise((resolve) => servidor.close(resolve));
  }
});
