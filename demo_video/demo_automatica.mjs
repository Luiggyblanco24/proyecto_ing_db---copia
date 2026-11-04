/**
 * SUTENS — Script de Demo Automatizada para Video Marketing
 * =========================================================
 * Ejecuta este script con: node demo_video/demo_automatica.mjs
 *
 * Requisitos:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * El script abre el navegador y navega por la demo sola.
 * Tú solo tienes que grabar con OBS mientras lo ejecutas.
 *
 * ANTES DE EJECUTAR:
 *   1. Asegúrate de que el servidor esté corriendo: npm run dev
 *   2. Abre OBS y configura la captura de ventana del navegador
 *   3. Inicia la grabación en OBS
 *   4. Luego ejecuta: node demo_video/demo_automatica.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ─── Utilidades ─────────────────────────────────────────────────────────────

/** Pausa en milisegundos */
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Escribe texto simulando escritura humana lenta */
async function escribirDespacio(campo, texto, retrasoPorLetra = 80) {
  for (const letra of texto) {
    await campo.type(letra);
    await esperar(retrasoPorLetra + Math.random() * 60);
  }
}

/** Mueve el cursor suavemente hasta un elemento y hace clic */
async function clicSuave(page, selector, opciones = {}) {
  const elemento = page.locator(selector).first();
  await elemento.scrollIntoViewIfNeeded();
  await elemento.hover({ force: false });
  await esperar(400 + Math.random() * 200);
  await elemento.click(opciones);
}

// ─── ESCENA 1: Pantalla negra de intro (grabada aparte en OBS con texto) ────
// Esta escena se edita en post. El script empieza directamente en la web.

// ─── ESCENA 2: Apertura del navegador + login ────────────────────────────────

async function escena2_RebelacionYLogin(page) {
  console.log('\n🎬 ESCENA 2 — Revelación: Abriendo localhost:3000...');
  await esperar(2000); // pausa dramática inicial

  // Navega al login
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
  await esperar(2500); // deja que la audiencia vea la URL en la barra

  // Zoom visual: mueve el cursor lentamente por la barra de URL
  // (El brillo neón lo agregas en edición sobre la barra del navegador)
  await esperar(1500);

  console.log('✅ Escena 2 lista — URL visible en barra del navegador');
}

// ─── ESCENA 3A: Login rápido y seguro ────────────────────────────────────────

async function escena3A_Login(page) {
  console.log('\n🎬 ESCENA 3A — Login con credenciales de administrador...');
  await esperar(1000);

  // Escribe usuario
  const campoUsuario = page.locator('input[name="usuario"], input[type="text"], #usuario').first();
  await campoUsuario.click();
  await esperar(500);
  await escribirDespacio(campoUsuario, ADMIN_USER, 100);
  await esperar(600);

  // Escribe contraseña
  const campoPass = page.locator('input[type="password"], #password').first();
  await campoPass.click();
  await esperar(400);
  await escribirDespacio(campoPass, ADMIN_PASS, 90);
  await esperar(800);

  // Clic en botón de login (efecto ripple se ve en pantalla)
  const botonLogin = page.locator('button[type="submit"], input[type="submit"], .btn-login, button').first();
  await botonLogin.hover();
  await esperar(500);
  await botonLogin.click();

  // Espera redirección al dashboard
  await page.waitForURL(`**`, { timeout: 8000 }).catch(() => {});
  await esperar(2000);

  console.log('✅ Escena 3A lista — Login exitoso');
}

// ─── ESCENA 3B: Dashboard interactivo ────────────────────────────────────────

async function escena3B_Dashboard(page) {
  console.log('\n🎬 ESCENA 3B — Explorando el dashboard...');
  await esperar(1000);

  // Asegura que estamos en el dashboard
  if (!page.url().includes('dashboard')) {
    await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await esperar(1500);
  }

  // Movimiento de cursor: paneo lento de izquierda a derecha
  const { width, height } = page.viewportSize() ?? { width: 1920, height: 1080 };
  const steps = 25;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round((width * 0.1) + (width * 0.8 * i) / steps);
    const y = Math.round(height * 0.4 + Math.sin(i * 0.4) * 60);
    await page.mouse.move(x, y, { steps: 3 });
    await esperar(120);
  }
  await esperar(1500);

  // Hover sobre elementos clave del dashboard
  const tarjetas = page.locator('.card, .stat-card, .kpi, [class*="card"], [class*="stat"]');
  const conteo = await tarjetas.count();
  console.log(`   Tarjetas encontradas: ${conteo}`);

  for (let i = 0; i < Math.min(conteo, 4); i++) {
    await tarjetas.nth(i).hover().catch(() => {});
    await esperar(900);
  }

  // Scroll suave hacia abajo
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await esperar(2000);
  await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
  await esperar(1500);

  console.log('✅ Escena 3B lista — Dashboard explorado');
}

// ─── ESCENA 4: El Momento WOW — Afiliación y aprobación ─────────────────────

async function escena4_FlujoAfiliacion(page, contexto) {
  console.log('\n🎬 ESCENA 4 — Flujo de afiliación + aprobación...');

  // ── Paso 1: Abrir ventana de DOCENTE (sesión limpia sin token) ──
  const paginaDocente = await contexto.newPage();

  // Limpiar cookies/storage para simular usuario no logueado
  await paginaDocente.goto(`${BASE_URL}/register.html`, { waitUntil: 'domcontentloaded' });

  // Si hay redirección, forzar limpieza de localStorage y volver
  await paginaDocente.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await paginaDocente.goto(`${BASE_URL}/register.html`, { waitUntil: 'domcontentloaded' });
  await esperar(2000);

  // Verificar que estamos en el formulario de registro
  const formulario = paginaDocente.locator('#form-registro');
  const formularioVisible = await formulario.count();
  console.log(`   Formulario encontrado: ${formularioVisible > 0 ? 'SÍ' : 'NO'}`);

  if (formularioVisible > 0) {
    // Mapeo de IDs reales del HTML de SUTENS
    const camposRegistro = [
      { id: '#nombre1',    valor: 'María',                  demora: 100 },
      { id: '#nombre2',    valor: 'Fernanda',               demora: 90  },
      { id: '#apellido1',  valor: 'González',               demora: 95  },
      { id: '#apellido2',  valor: 'Rueda',                  demora: 85  },
      { id: '#cedula',     valor: '1090123456',             demora: 80  },
      { id: '#correo',     valor: 'mgonzalez@edu.gov.co',  demora: 75  },
      { id: '#usuario',    valor: 'mgonzalez24',            demora: 90  },
      { id: '#password',   valor: 'Docente2024!',           demora: 85  },
    ];

    for (const { id, valor, demora } of camposRegistro) {
      const campo = paginaDocente.locator(id).first();
      const visible = await campo.isVisible().catch(() => false);
      if (visible) {
        await campo.scrollIntoViewIfNeeded();
        await campo.click({ force: true });
        await esperar(300);
        await campo.fill(''); // limpiar primero
        await esperar(100);
        await escribirDespacio(campo, valor, demora);
        await esperar(350);
      } else {
        // Intentar con fill directo si no está visible (dentro de un scroll container)
        await campo.fill(valor).catch(() => {});
        await esperar(300);
      }
    }

    // Scroll para mostrar el checkbox antes de marcarlo
    await paginaDocente.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await esperar(800);

    // Checkbox de autorización de datos personales
    const checkbox = paginaDocente.locator('#autorizo-tratamiento');
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.check({ force: true });
    await esperar(700);

    // Hover dramático sobre el botón de envío antes de hacer clic
    const botonRegistro = paginaDocente.locator('button[type="submit"]');
    await botonRegistro.scrollIntoViewIfNeeded();
    await botonRegistro.hover();
    await esperar(800);
    await botonRegistro.click({ force: true });
    await esperar(3000);
    console.log('   📋 Formulario de registro enviado — mensaje de radicado visible');
  } else {
    console.log('   ⚠️  Formulario no encontrado en esta URL — mostrando scroll del dashboard');
    await paginaDocente.close();
  }

  // ── Paso 2: en la MISMA página del admin, ir a pendientes y aprobar ──
  await esperar(1000);

  // Traer el foco de vuelta a la página del admin (page original)
  await page.bringToFront();
  await esperar(500);

  // Navegar a la sección de afiliados pendientes en el dashboard
  await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await esperar(1500);

  // Buscar y hacer clic en el enlace/sección de afiliados/pendientes
  const seccionAfiliados = page.locator(
    'a[href*="afiliado"], a[href*="pendiente"], [data-section="afiliados"], [data-seccion="afiliados"], .nav-item, aside a, nav a'
  );
  const totalLinks = await seccionAfiliados.count();
  console.log(`   Links de navegación encontrados: ${totalLinks}`);

  // Hover sobre los primeros links del sidebar
  for (let i = 0; i < Math.min(totalLinks, 6); i++) {
    const link = seccionAfiliados.nth(i);
    const texto = await link.textContent().catch(() => '');
    console.log(`   Link ${i}: "${texto?.trim()}"`);
    await link.hover().catch(() => {});
    await esperar(600);

    // Si el texto contiene "afiliado" o "pendiente", hacer clic
    if (/afiliado|pendiente/i.test(texto ?? '')) {
      await link.click().catch(() => {});
      await esperar(2000);
      break;
    }
  }

  // Scroll para buscar botones de aprobación
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await esperar(1000);

  const botonesAprobar = page.locator(
    'button:has-text("Aprobar"), button:has-text("aprobar"), .btn-aprobar, [class*="aprobar"], button[data-accion="aprobar"]'
  );
  const totalAprobar = await botonesAprobar.count();
  console.log(`   Botones "Aprobar" encontrados: ${totalAprobar}`);

  if (totalAprobar > 0) {
    await botonesAprobar.first().scrollIntoViewIfNeeded();
    await botonesAprobar.first().hover();
    await esperar(800);
    await botonesAprobar.first().click();
    await esperar(2500);
    console.log('   ✅ Afiliado aprobado — efecto partículas en edición');
  } else {
    // Mostrar la tabla/lista de afiliados como fallback
    const tablaAfiliados = page.locator('table, .tabla-afiliados, [class*="tabla"]').first();
    if (await tablaAfiliados.count() > 0) {
      await tablaAfiliados.scrollIntoViewIfNeeded();
      await esperar(2000);
      console.log('   📋 Mostrando tabla de afiliados (sin pendientes nuevos)');
    }
  }

  // Cerrar ventana del docente si sigue abierta
  await paginaDocente.close().catch(() => {});

  console.log('✅ Escena 4 lista — Flujo WOW completo');
}

// ─── ESCENA 5: CTA final ──────────────────────────────────────────────────────

async function escena5_CTA(page) {
  console.log('\n🎬 ESCENA 5 — CTA final...');

  // Zoom out navegando a la raíz (pantalla más limpia)
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' }).catch(() =>
    page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' })
  );
  await esperar(1500);

  // Movimiento de cursor lento y final
  const { width = 1920, height = 1080 } = page.viewportSize() ?? {};
  await page.mouse.move(width / 2, height / 2, { steps: 20 });
  await esperar(500);
  await page.mouse.move(width / 2, height * 0.7, { steps: 15 });
  await esperar(2000);

  // La pantalla se fundirá a negro en edición (DaVinci Resolve)
  console.log('✅ Escena 5 lista — La pantalla se funde a negro en edición');
  console.log('\n🎉 DEMO COMPLETA — Puedes detener la grabación en OBS\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SUTENS — Demo Automatizada para Video Marketing  ');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('⏳ Iniciando en 5 segundos...');
  console.log('   → Asegúrate de que OBS ya está grabando');
  console.log('   → El servidor debe estar en npm run dev');
  console.log('');

  await esperar(5000); // 5 segundos para que pongas OBS a grabar

  // Lanza el navegador en modo pantalla completa visible (no headless)
  const navegador = await chromium.launch({
    headless: false,
    args: [
      '--start-maximized',
      '--disable-infobars',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-crash-restore-bubble',
    ],
    slowMo: 50, // ralentiza todas las acciones para que se vean fluidas
  });

  const contexto = await navegador.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'es-CO',
  });

  const page = await contexto.newPage();

  // Silencia los diálogos inesperados
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  try {
    await escena2_RebelacionYLogin(page);           // 0:15 – 0:30
    await escena3A_Login(page);                     // 0:30 – 0:45
    await escena3B_Dashboard(page);                 // 0:45 – 1:00
    await escena4_FlujoAfiliacion(page, contexto);  // 1:00 – 1:15
    await escena5_CTA(page);                        // 1:15 – 1:30
  } catch (error) {
    console.error('\n❌ Error durante la demo:', error.message);
    console.error('   Verifica que el servidor está corriendo en localhost:3000');
  } finally {
    await esperar(3000); // pausa final antes de cerrar
    await navegador.close();
  }
})();
