import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const raizPublic = path.resolve('public');
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const relativa = decodeURIComponent(url.pathname === '/' ? '/dashboard.html' : url.pathname);
    const archivo = path.resolve(raizPublic, `.${relativa}`);
    if (!archivo.startsWith(raizPublic)) throw new Error('fuera de public');
    const contenido = await fs.readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream' });
    res.end(contenido);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
});
await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
const puerto = servidor.address().port;

const filas = Array.from({ length: 111 }, (_, indice) => {
  const numero = indice + 1;
  return {
    id_afiliado: numero,
    nombre1: `Nombre${numero}`,
    nombre2: '',
    apellido1: `Apellido${numero}`,
    apellido2: '',
    cedula: `1000${String(numero).padStart(4, '0')}`,
    correo: `persona${numero}@example.com`,
    usuario: `usuario${numero}`,
    roles: ['Afiliado'],
    subdirectiva: 'Subdirectiva Principal',
    id_subdirectiva: 1,
    cargo_sindical: indice % 3 === 0 ? 'Presidente' : 'Delegado',
    cargo_departamental: indice % 10 === 0 ? 'Secretario General' : null,
    institucion: `IE ${indice % 5}`,
    sede: `Sede ${indice % 4}`,
    rol_laboral: 'Docente',
    estado_sindical: indice % 7 === 0 ? 'inactivo' : 'activo',
    estado: indice < 50 ? 'pendiente' : 'aprobado',
  };
});

const pendientes = filas.slice(0, 50).map((fila) => ({ ...fila, estado: 'pendiente' }));
const perfil = {
  id_afiliado: 1,
  nombre1: 'Ana',
  nombre2: '',
  apellido1: 'Administradora',
  apellido2: '',
  cedula: '1000000000',
  correo: 'ana@example.com',
  usuario: 'ana',
  roles: ['Administrador SUTENS'],
  estado: 'aprobado',
  estado_sindical: 'activo',
  cargo_departamental: 'Presidente General',
  cargo_sindical: 'Presidente',
  subdirectiva: 'Subdirectiva Principal',
  id_subdirectiva: 1,
  institucion: 'IE Central',
  sede: 'Sede Central',
  rol_laboral: 'Docente',
  chatbot_habilitado: true,
  requiere_cambio_contrasena: false,
  foto_perfil_url: null,
};
const estructura = [
  {
    id_subdirectiva: 1,
    nombre: 'Subdirectiva Principal',
    es_principal: true,
    instituciones: [
      {
        id_institucion: 1,
        nombre: 'IE Central',
        sedes: [{ id_sede: 1, nombre: 'Sede Norte' }, { id_sede: 2, nombre: 'Sede Sur' }],
      },
      {
        id_institucion: 2,
        nombre: 'IE Rural',
        sedes: [{ id_sede: 3, nombre: 'Sede Única' }],
      },
    ],
  },
  {
    id_subdirectiva: 2,
    nombre: 'Subdirectiva Norte',
    es_principal: false,
    instituciones: [
      {
        id_institucion: 3,
        nombre: 'IE Norte',
        sedes: [{ id_sede: 4, nombre: 'Sede A' }],
      },
    ],
  },
  {
    id_subdirectiva: 3,
    nombre: 'Subdirectiva Sur',
    es_principal: false,
    instituciones: [],
  },
];
const estadisticas = {
  alcance: 'departamental',
  nombre_subdirectiva: 'Subdirectiva Principal',
  total_afiliados: filas.length,
  subdirectivas: [
    { nombre: 'Subdirectiva Principal', total_afiliados: 60 },
    { nombre: 'Subdirectiva Norte', total_afiliados: 51 },
  ],
  crecimiento: [
    { etiqueta: 'May', nuevas_altas: 10 },
    { etiqueta: 'Jun', nuevas_altas: 12 },
    { etiqueta: 'Jul', nuevas_altas: 8 },
  ],
  por_subdirectiva: [
    { nombre: 'Subdirectiva Principal', total: 60 },
    { nombre: 'Subdirectiva Norte', total: 51 },
  ],
};

async function json(ruta, cuerpo) {
  await ruta.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(cuerpo) });
}

const noManejadas = new Set();
const navegador = await chromium.launch();
const resultados = [];
const tamanos = [10, 25, 50];
const viewports = [1440, 1024, 768, 390];

try {
  for (const ancho of viewports) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
    await contexto.addInitScript(() => localStorage.setItem('token', 'token-demo'));
    const pagina = await contexto.newPage();
    pagina.on('console', (mensaje) => {
      if (mensaje.type() === 'error') console.log(`[consola ${ancho}] ${mensaje.text()}`);
    });
    await pagina.route('**/api/**', async (ruta) => {
      const url = new URL(ruta.request().url());
      const rutaApi = url.pathname;
      if (rutaApi === '/api/auth/me') return json(ruta, perfil);
      if (rutaApi === '/api/membresia/estadisticas') return json(ruta, estadisticas);
      if (rutaApi === '/api/afiliados' && url.searchParams.get('estado') === 'pendiente') return json(ruta, pendientes);
      if (rutaApi === '/api/afiliados') return json(ruta, filas);
      if (rutaApi === '/api/afiliados/roles') return json(ruta, [{ nombre: 'Afiliado' }, { nombre: 'Administrador SUTENS' }]);
      if (rutaApi === '/api/subdirectivas') return json(ruta, estructura);
      if (rutaApi === '/api/subdirectivas/cargos') return json(ruta, [{ nombre: 'Presidente' }, { nombre: 'Delegado' }]);
      if (rutaApi === '/api/subdirectivas/roles-laborales') return json(ruta, [{ nombre: 'Docente' }]);
      if (rutaApi === '/api/membresia/afiliados') return json(ruta, filas);
      if (rutaApi === '/api/biblioteca/categorias') return json(ruta, []);
      if (rutaApi === '/api/biblioteca') return json(ruta, []);
      if (rutaApi === '/api/calendario/eventos') return json(ruta, []);
      if (rutaApi === '/api/calendario/notificaciones') return json(ruta, []);
      noManejadas.add(rutaApi);
      return json(ruta, []);
    });

    await pagina.goto(`http://127.0.0.1:${puerto}/dashboard.html`, { waitUntil: 'networkidle' });
    await pagina.waitForFunction(() => document.querySelector('#nombre-usuario')?.textContent?.includes('Ana'));
    await pagina.waitForSelector('.chatbot-boton:not([hidden])', { timeout: 5000 });

    await pagina.evaluate(() => document.getElementById('nav-afiliados').click());
    await pagina.waitForFunction(() => document.querySelectorAll('#cuerpo-afiliados tr').length >= 100);
    await pagina.waitForTimeout(100);

    for (const tamano of tamanos) {
      await pagina.evaluate((n) => {
        const filasVista = [...document.querySelectorAll('#cuerpo-afiliados tr')];
        filasVista.forEach((fila, indice) => { fila.hidden = indice >= n; });
        const info = document.querySelector('#paginacion-local .paginacion__info');
        if (info) info.textContent = `1-${Math.min(n, filasVista.length)} / ${filasVista.length}`;
      }, tamano);
      await pagina.waitForTimeout(80);
      await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await pagina.waitForTimeout(80);
      const medida = await pagina.evaluate(() => {
        const vista = document.getElementById('vista-afiliados');
        const wrap = vista.querySelector('.tabla-wrapper.tabla-afiliados');
        const paginacion = document.getElementById('paginacion-local');
        const chat = document.querySelector('.chatbot-boton');
        const rectPaginacion = paginacion.getBoundingClientRect();
        const rectChat = chat && !chat.hidden ? chat.getBoundingClientRect() : null;
        const internos = [...vista.querySelectorAll('*')].filter((elemento) => {
          const estilo = getComputedStyle(elemento);
          return /(auto|scroll)/.test(estilo.overflowY) && elemento.scrollHeight - elemento.clientHeight > 2;
        }).map((elemento) => ({
          clase: elemento.className || elemento.tagName,
          overflowY: getComputedStyle(elemento).overflowY,
          diferencia: elemento.scrollHeight - elemento.clientHeight,
        }));
        const cabecera = vista.querySelector('.tabla-afiliados th');
        const topbar = document.getElementById('topbar');
        const solapan = rectChat
          ? !(rectPaginacion.right <= rectChat.left || rectPaginacion.left >= rectChat.right ||
              rectPaginacion.bottom <= rectChat.top || rectPaginacion.top >= rectChat.bottom)
          : null;
        return {
          filasVisibles: [...vista.querySelectorAll('tbody tr')].filter((fila) => !fila.hidden).length,
          overflowY: getComputedStyle(wrap).overflowY,
          overflowX: getComputedStyle(wrap).overflowX,
          scrollInternoVertical: wrap.scrollHeight - wrap.clientHeight,
          scrollInternoHorizontal: wrap.scrollWidth - wrap.clientWidth,
          internos,
          paginaConScroll: document.documentElement.scrollHeight > window.innerHeight,
          scrollHorizontalPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          paginacionInfo: paginacion.querySelector('.paginacion__info')?.textContent?.trim() || '',
          paginacionVisible: rectPaginacion.width > 0 && rectPaginacion.bottom <= window.innerHeight + 1 && rectPaginacion.top >= 0,
          solapaChat: solapan,
          headerTop: cabecera ? cabecera.getBoundingClientRect().top : null,
          topbarBottom: topbar ? topbar.getBoundingClientRect().bottom : null,
          headerPosition: cabecera ? getComputedStyle(cabecera).position : null,
          alFinal: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
        };
      });
      resultados.push({ ancho, vista: 'afiliados', tamano, ...medida });
    }

    await pagina.evaluate(() => document.getElementById('nav-administracion').click());
    await pagina.waitForFunction(() => document.querySelectorAll('#cuerpo-tabla tr').length >= 50);
    await pagina.waitForTimeout(100);
    await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pagina.waitForTimeout(80);
    const admin = await pagina.evaluate(() => {
      const vista = document.getElementById('vista-administracion');
      const wrap = vista.querySelector('.tabla-wrapper');
      const internos = [...vista.querySelectorAll('*')].filter((elemento) => {
        const estilo = getComputedStyle(elemento);
        return /(auto|scroll)/.test(estilo.overflowY) && elemento.scrollHeight - elemento.clientHeight > 2;
      }).map((elemento) => ({
        clase: elemento.className || elemento.tagName,
        overflowY: getComputedStyle(elemento).overflowY,
        diferencia: elemento.scrollHeight - elemento.clientHeight,
      }));
      return {
        filas: vista.querySelectorAll('#cuerpo-tabla tr').length,
        overflowY: getComputedStyle(wrap).overflowY,
        scrollInternoVertical: wrap.scrollHeight - wrap.clientHeight,
        internos,
        paginaConScroll: document.documentElement.scrollHeight > window.innerHeight,
        scrollHorizontalPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        alFinal: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
      };
    });
    resultados.push({ ancho, vista: 'administracion', tamano: 50, ...admin });

    await pagina.evaluate(() => document.querySelector('[data-vista="vista-directorio"]').click());
    await pagina.waitForFunction(() => document.querySelectorAll('#cuerpo-directorio .nodo-estructura').length >= 3);
    await pagina.waitForTimeout(100);
    const directorio = await pagina.evaluate(() => {
      const vista = document.getElementById('vista-directorio');
      const internos = [...vista.querySelectorAll('*')].filter((elemento) => {
        const estilo = getComputedStyle(elemento);
        return /(auto|scroll)/.test(estilo.overflowY) && elemento.scrollHeight - elemento.clientHeight > 2;
      }).map((elemento) => ({
        clase: elemento.className || elemento.tagName,
        overflowY: getComputedStyle(elemento).overflowY,
        diferencia: elemento.scrollHeight - elemento.clientHeight,
      }));
      return {
        nodos: vista.querySelectorAll('.nodo-estructura').length,
        internos,
        paginaConScroll: document.documentElement.scrollHeight > window.innerHeight,
        scrollHorizontalPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    resultados.push({ ancho, vista: 'directorio', ...directorio });

    await pagina.evaluate(() => document.getElementById('nav-afiliados').click());
    await pagina.waitForTimeout(250);
    await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pagina.screenshot({ path: `tmp-tablas-${ancho}.png` });
    await contexto.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}

console.log(JSON.stringify({ resultados, noManejadas: [...noManejadas] }, null, 2));
