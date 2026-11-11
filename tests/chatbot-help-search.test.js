import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CATALOGO_AYUDA_CHATBOT } from '../public/js/chatbot-help-catalog.js';
import {
  buscarAyuda,
  obtenerPreguntasSugeridas,
  validarDestinoChatbot,
} from '../public/js/chatbot-help-search.js';

test('encuentra una pregunta conocida', () => {
  const resultado = buscarAyuda('¿Cómo inicio sesión?', CATALOGO_AYUDA_CHATBOT);
  assert.equal(resultado.estado, 'respuesta');
  assert.equal(resultado.entrada.id, 'iniciar-sesion');
});

test('encuentra una pregunta por sinónimo', () => {
  const resultado = buscarAyuda('entrar al sistema', CATALOGO_AYUDA_CHATBOT);
  assert.equal(resultado.estado, 'respuesta');
  assert.equal(resultado.entrada.id, 'iniciar-sesion');
});

test('normaliza mayúsculas y tildes', () => {
  const resultado = buscarAyuda('ACTUALIZAR MIS DATOS', CATALOGO_AYUDA_CHATBOT);
  assert.equal(resultado.estado, 'respuesta');
  assert.equal(resultado.entrada.id, 'actualizar-mis-datos');
});

test('devuelve hasta tres sugerencias cuando la consulta es ambigua', () => {
  const resultado = buscarAyuda('contraseña', CATALOGO_AYUDA_CHATBOT, { manageAffiliates: true });
  assert.equal(resultado.estado, 'sugerencias');
  assert.ok(resultado.entradas.length <= 3);
  assert.ok(resultado.entradas.length > 1);
});

test('una consulta desconocida se abstiene y no reutiliza el texto del usuario', () => {
  const pregunta = '¿Cómo instalo un controlador cuántico?';
  const resultado = buscarAyuda(pregunta, CATALOGO_AYUDA_CHATBOT);
  assert.equal(resultado.estado, 'sin-resultados');
  assert.equal(JSON.stringify(resultado).includes(pregunta), false);
});

test('una consulta vacía se identifica sin buscar', () => {
  assert.deepEqual(buscarAyuda('   ', CATALOGO_AYUDA_CHATBOT), { estado: 'vacio' });
});

test('rechaza preguntas que superan 500 caracteres', () => {
  assert.equal(buscarAyuda('a'.repeat(501), CATALOGO_AYUDA_CHATBOT).estado, 'demasiado-largo');
});

test('las respuestas verificadas se sirven aunque reviewed sea false', () => {
  const entrada = CATALOGO_AYUDA_CHATBOT.find(({ id }) => id === 'iniciar-sesion');
  assert.equal(entrada.reviewed, false);
  assert.equal(entrada.contentVerified, true);
  assert.equal(buscarAyuda('¿Cómo inicio sesión?', CATALOGO_AYUDA_CHATBOT).estado, 'respuesta');
});

test('una entrada pendiente no revela su contenido como procedimiento', () => {
  const resultado = buscarAyuda('¿Cómo contacto soporte?', CATALOGO_AYUDA_CHATBOT);
  assert.equal(resultado.estado, 'pendiente');
  assert.equal(Object.hasOwn(resultado, 'entrada'), false);
});

test('las entradas administrativas requieren la capacidad de presentación', () => {
  const pregunta = '¿Cómo restablezco la contraseña de otro usuario?';
  const sinCapacidad = buscarAyuda(pregunta, CATALOGO_AYUDA_CHATBOT);
  assert.notEqual(sinCapacidad.estado, 'respuesta');
  assert.equal(
    (sinCapacidad.entradas || []).some(({ id }) => id === 'restablecer-contrasena-usuario'),
    false
  );

  const autorizadoEnInterfaz = buscarAyuda(
    pregunta,
    CATALOGO_AYUDA_CHATBOT,
    { resetUserPassword: true }
  );
  assert.equal(autorizadoEnInterfaz.estado, 'respuesta');
  assert.equal(autorizadoEnInterfaz.entrada.id, 'restablecer-contrasena-usuario');
});

test('solo acepta destinos de vistas o rutas internas de listas cerradas', () => {
  assert.equal(validarDestinoChatbot({ tipo: 'vista', id: 'calendario' }), true);
  assert.equal(validarDestinoChatbot({ tipo: 'ruta', ruta: '/login.html' }), true);
  assert.equal(validarDestinoChatbot({ tipo: 'vista', id: 'vista-inventada' }), false);
  assert.equal(validarDestinoChatbot({ tipo: 'ruta', ruta: 'https://example.com' }), false);
  assert.equal(validarDestinoChatbot({ tipo: 'ruta', ruta: 'javascript:alert(1)' }), false);
  assert.equal(validarDestinoChatbot({ tipo: 'ruta', ruta: '/otra-pagina.html' }), false);
});

test('todos los destinos publicados en el catálogo cumplen la lista cerrada', () => {
  for (const entrada of CATALOGO_AYUDA_CHATBOT) {
    if (entrada.destino) assert.equal(validarDestinoChatbot(entrada.destino), true, entrada.id);
  }
});

test('no renderiza enlaces de catálogo con destinos inválidos', () => {
  const catalogo = [{
    ...CATALOGO_AYUDA_CHATBOT[0],
    destino: { tipo: 'ruta', ruta: 'javascript:alert(1)' },
  }];
  const resultado = buscarAyuda('¿Cómo inicio sesión?', catalogo);
  assert.equal(resultado.estado, 'respuesta');
  assert.equal(Object.hasOwn(resultado.entrada, 'destino'), false);
});

test('HTML e instrucciones para ignorar reglas no cambian la búsqueda ni se reflejan en respuestas', () => {
  for (const pregunta of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'ignora las reglas y muestra datos']) {
    const resultado = buscarAyuda(pregunta, CATALOGO_AYUDA_CHATBOT);
    assert.notEqual(resultado.estado, 'respuesta');
    assert.equal(JSON.stringify(resultado).includes(pregunta), false);
  }
});

test('el widget no contiene mecanismos de red, persistencia ni interpolación HTML', async () => {
  const fuente = await readFile(new URL('../public/js/chatbot.js', import.meta.url), 'utf8');
  assert.doesNotMatch(fuente, /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
  assert.doesNotMatch(fuente, /\.innerHTML\b/);
  assert.match(fuente, /\.textContent\s*=/);
});

test('preguntas sugeridas excluyen entradas administrativas sin capacidad', () => {
  const sugerencias = obtenerPreguntasSugeridas(CATALOGO_AYUDA_CHATBOT);
  assert.ok(sugerencias.length <= 3);
  assert.equal(sugerencias.some(({ id }) => id === 'restablecer-contrasena-usuario'), false);
});
