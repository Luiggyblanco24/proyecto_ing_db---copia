import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import express from 'express';
import { chromium } from 'playwright';
import test from 'node:test';

test('el widget muestra las descargas solo cuando el servidor las habilita', {
  skip: !existsSync(chromium.executablePath()) && 'Chromium de Playwright no está instalado',
}, async () => {
  const app = express();
  app.get('/test', (req, res) => res.send(`<!doctype html><html><body>
    <script>
      window.SUTENSChatbotDashboard = {
        obtenerCapacidades: () => ({ viewReports: true }),
        chatbotHabilitado: () => new URLSearchParams(location.search).get('chatbot') === 'true'
      };
      window.apiFetch = async (url) => url === '/api/subdirectivas' ? [] : ({
        titulo: 'Informe sintético', alcance: 'global', generado_en: new Date().toISOString(),
        filtros: {}, agrupacion: 'estado', avisos: [], filas: [{ grupo: '<scr' + 'ipt>prueba</scr' + 'ipt>', cantidad: 5 }],
        descargas_habilitadas: new URLSearchParams(location.search).get('descargas') === 'true'
      });
    </script><script type="module" src="/js/chatbot.js"></script>
  </body></html>`));
  app.use(express.static('public'));
  const server = await new Promise((resolve) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
  });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const habilitadas of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await page.goto(`http://127.0.0.1:${server.address().port}/test?chatbot=true&descargas=${habilitadas}`);
      await page.getByRole('button', { name: 'Abrir asistente' }).click();
      await page.getByRole('button', { name: 'Consultar informes' }).click();
      await page.locator('#chatbot-informe').selectOption('afiliados_por_estado');
      await page.getByRole('button', { name: 'Generar informe' }).click();
      await page.getByRole('table').waitFor();
      assert.equal(await page.locator('.chatbot-descargas').count(), habilitadas ? 1 : 0);
      assert.equal(await page.locator('.chatbot-tabla tbody th').textContent(), '<script>prueba</script>');
      assert.equal(await page.locator('.chatbot-tabla script').count(), 0);
      if (habilitadas) {
        assert.match(await page.locator('.chatbot-descargas').textContent(), /Datos personales de uso restringido \(Ley 1581 de 2012\)/);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.chatbot-panel').isVisible(), false);
      await page.close();
    }
    const apagada = await browser.newPage();
    await apagada.goto(`http://127.0.0.1:${server.address().port}/test?chatbot=false`);
    await apagada.locator('.chatbot-boton').waitFor({ state: 'attached' });
    assert.equal(await apagada.locator('.chatbot-boton').isVisible(), false);
    assert.equal(await apagada.locator('.chatbot-panel').isVisible(), false);
    await apagada.close();
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
