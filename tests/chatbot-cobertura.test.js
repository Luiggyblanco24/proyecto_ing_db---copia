import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import express from 'express';
import { chromium } from 'playwright';
import { responderVisitante } from '../landing_page/src/data/asistente-visitante.js';

// Pregunta original, reformulación y señal observable de que se contestó lo solicitado.
const visitantes = `
Hola, soy docente en Ocaña. ¿En qué me puede ayudar SUTENS?|Soy profe, ¿qué beneficios tiene el sindicato?|derechos laborales
¿Qué significa SUTENS y a quién representa?|¿Qué significan las siglas SUTENS?|Sindicato Unitario
Nunca he pertenecido a un sindicato. ¿Cómo funciona este?|Nunca pertenecí a un sindicato, ¿cómo funciona?|representa
¿SUTENS atiende solo en Ocaña o también en otros municipios de Norte de Santander?|¿El sindicato cubre municipios fuera de Ocaña?|departamental
Soy de San Calixto. ¿Cómo encuentro la subdirectiva que me corresponde?|¿Cómo ubico al delegado de mi municipio?|municipio
¿Qué diferencia hay entre la directiva departamental y una subdirectiva municipal?|¿Qué diferencia hay entre la subdirectiva municipal y la directiva departamental?|municipio
¿Qué beneficios tendría al afiliarme?|¿Qué ventajas ofrece SUTENS?|orientación jurídica
¿Qué hace el sindicato cuando varios docentes tienen el mismo problema laboral?|Varios profes tenemos un problema laboral colectivo|inquietud
¿Qué es la negociación colectiva? Explícamelo con un ejemplo de un colegio.|Explícame la negociación colectiva con un ejemplo escolar|por ejemplo
Todavía no soy afiliada. ¿Puedo recibir orientación antes de decidir?|¿Puedo pedir orientación antes de inscribirme?|antes de afiliarte
Soy docente provisional. ¿Puedo solicitar la afiliación?|Si soy maestro provisional, ¿puedo ingresar?|casilla
Trabajo como rectora de una institución educativa. ¿También puedo afiliarme?|¿Puede ingresar una rectora de colegio?|vinculación
Soy administrativo de un colegio. ¿Qué requisitos aplican en mi caso?|¿Admiten personal administrativo de una institución?|vinculación
Trabajo en un colegio privado. ¿Dónde verifico si puedo ingresar?|¿Puedo ingresar si trabajo en colegio privado?|vinculación
Vivo en Ocaña, pero trabajo en otro departamento. ¿Cuál de los dos lugares cuenta para afiliarme?|¿Cuenta mi residencia o mi lugar de trabajo en otro departamento?|municipio
Acabo de recibir mi nombramiento y todavía no tengo el acta de posesión. ¿Qué documento puedo presentar?|¿Puedo presentar la resolución en vez del acta de posesión?|resolución
¿Cómo puedo afiliar a un amigo docente?|¿Cómo ayudo a una colega a afiliarse?|firmar
¿Le puedo compartir el formulario para que él mismo lo diligencie?|¿Puedo pasarle el formato para que lo firme mi amigo?|firmar
Mi compañera ya pertenece a otro sindicato. ¿Con quién puede confirmar si puede entrar a SUTENS?|¿Puedo ingresar si pertenezco a otro sindicato?|Secretaría General
Somos tres docentes de la misma sede. ¿Cada uno debe presentar su propia solicitud?|¿Un formulario sirve para varios profesores?|su propia solicitud
como me afilio y q papeles necesito|¿Qué papeles necesito para afiliarme?|Formato de afiliación firmado
¿Me pasas el formulario oficial en PDF?|¿Me compartes el PDF en blanco?|formulario oficial
¿Qué diferencia hay entre registrarme en la página y quedar afiliado al sindicato?|¿Crear mi cuenta equivale a quedar aprobado?|revisión
¿Puedo empezar la solicitud desde el celular?|¿Cómo inicio el registro usando mi teléfono?|registro
Si hago el registro en línea, ¿también debo entregar el formulario en papel?|Después del registro web, ¿debo llevar copia física?|confírmalo
¿Qué datos de mi institución educativa debo tener a mano para llenar el formato?|¿Qué información laboral pide el formato?|municipio
¿La autorización de descuento está en el mismo formulario o debo pedir otro documento?|¿En qué parte del PDF está la autorización de nómina?|firma
No tengo impresora. ¿Dónde puedo conseguir el formato físico?|No puedo imprimir el formato, ¿qué hago?|registro
Ya lo llené y lo firmé. ¿Dónde lo entrego si trabajo fuera de Ocaña?|¿Dónde radico mi formulario firmado en mi municipio?|delegado
Me faltó una firma y ya entregué los papeles. ¿A quién le pregunto cómo corregirlo?|Mi solicitud quedó incompleta, faltó una firma|corrección
¿Cuánto cuesta afiliarse a SUTENS?|¿Cuál es la cuota mensual?|1 %
¿Ese valor se paga una sola vez o todos los meses?|¿Es un pago único o mensual?|mensual
¿Y si mi salario básico es de $4.000.000, cuánto me descontarían?|¿Y si gano 4 millones?|40.000
Mi básico es de $3.200.000, pero con horas extras recibo más. ¿Sobre cuál valor se calcula la cuota?|¿Incluyen las horas extras en la base del descuento?|salario básico
¿Hay algún cobro de inscripción aparte de la cuota mensual?|¿La matrícula se cobra aparte de la cuota?|adicional
¿En qué parte del formulario puedo leer lo que voy a autorizar por nómina?|¿Dónde leo la autorización del descuento por nómina?|firma
¿Desde qué mes empezaría el descuento si entrego la solicitud hoy?|¿Cuándo aparece mi primer descuento en nómina?|primer descuento
¿Qué compromiso asumo al firmar el formulario?|¿A qué me comprometo cuando firmo el formato?|estatutos
¿Dónde puedo leer los estatutos antes de decidir si me afilio?|¿Dónde consigo el reglamento antes de firmar?|estatutos
Quiero ayudar a afiliar a una docente. ¿Me das el formulario, me explicas el costo y me dices qué normas debe revisar?|¿Qué documentos, cuota y estatutos se necesitan para inscribirse?|firmado.*1 %.*estatutos
¿Cuál es la dirección de la sede de SUTENS en Ocaña?|¿Dónde queda la oficina principal del sindicato?|13 - 37
¿Tienen horario de atención confirmado para el sábado?|¿Abren la oficina los sábados?|horario
¿Cómo contacto a una persona del sindicato si mi pregunta necesita atención personal?|¿Puedo hablar con un asesor humano?|WhatsApp
¿Dónde puedo consultar noticias y comunicados sin crear una cuenta?|¿Dónde leo noticias y comunicados públicos?|Comunicaciones
¿Qué actividades del sindicato están abiertas a docentes que todavía no son afiliados?|¿Pueden asistir visitantes a los eventos?|convocatoria
Vi una noticia sobre un acuerdo. ¿Dónde encuentro el documento original?|¿Dónde está el documento original de un acuerdo publicado?|Comunicaciones
Ya envié mi solicitud. ¿Puedo consultar su estado desde esta página?|¿Cómo sé si aprobaron mi solicitud?|estado
Mi hermana es profesora. ¿Me puedes decir si está afiliada?|¿Puedo saber si otra persona está afiliada?|privada
¿Te mando una foto de mi cédula por este chat o hay un formulario para eso?|¿Puedo adjuntar mi documento de identidad en el chat?|cédulas
El enlace al PDF no me abre en el celular. ¿Qué otra opción tengo para iniciar la solicitud?|No puedo abrir el PDF, ¿hay otra opción?|registro
`.trim().split('\n').map((fila) => fila.split('|'));

test('50 consultas públicas, con reformulaciones e historial, se resuelven sin red', (t) => {
  const fallos = [];
  const tiempos = [];
  for (const columna of [0, 1]) {
    let historial = [];
    for (const [i, caso] of visitantes.entries()) {
      const texto = caso[columna];
      const inicio = performance.now();
      const respuesta = responderVisitante(texto, historial);
      tiempos.push(performance.now() - inicio);
      if (!new RegExp(caso[2], 'is').test(respuesta?.texto || '')) fallos.push([i + 1, texto, respuesta?.texto]);
      historial = [...historial, { role: 'user', content: texto }, { role: 'assistant', content: respuesta?.texto || '' }].slice(-6);
    }
  }
  assert.equal(visitantes.length, 50);
  assert.deepEqual(fallos, []);
  assert.equal(responderVisitante('¿Cuánto cuesta el pasaje a Ocaña?'), null);
  tiempos.sort((a, b) => a - b);
  t.diagnostic('Tiempo local de resolución en la portada (100 turnos), p95 = ' + tiempos[94].toFixed(2) + ' ms.');
});

const afiliados = `
Ya inicié sesión. ¿Dónde veo mi estado de afiliación?|¿Qué estado tiene mi afiliación?|aprobado
¿Y en qué subdirectiva aparezco registrado?|¿Cuál es mi subdirectiva registrada?|San Calixto
Cambié de número de celular. ¿Cómo actualizo mi teléfono?|¿Dónde modifico mi número de contacto?|celular
Mi apellido aparece mal escrito. ¿Puedo corregirlo desde mi cuenta?|Quiero editar mi apellido|Mi cuenta
Me trasladaron de colegio. ¿Qué debo hacer para actualizar mi institución y sede?|Me trasladé y necesito cambiar mi colegio|asignación
Mi perfil dice pendiente, pero ya entregué los documentos. ¿Cuál es el siguiente paso?|Entregué los soportes y sigo pendiente de aprobación|pendiente de revisión
¿Cómo cambio mi contraseña si todavía puedo entrar al panel?|¿Dónde modifico mi clave actual?|Mi cuenta
¿Dónde cambio la foto que aparece junto a mi nombre?|Modificar mi foto de perfil|Mi cuenta
Soy afiliado y ahora hago parte de una directiva. ¿Quién actualiza los permisos de mi cuenta?|¿Quién actualiza mis roles si cambió mi cargo?|Administración
Veo mis datos, pero no encuentro la opción de editarlos. ¿Qué puedo cambiar yo y qué debe revisar administración?|¿Qué datos puedo editar en Mi cuenta?|apellidos
¿Cuál es mi próxima actividad sindical?|¿Cuál es el siguiente evento en mi calendario?|Reunión de prueba
¿A qué hora empieza y dónde se realiza?|¿Dónde y cuándo es ese evento?|Salón central
¿Ya confirmé mi asistencia?|¿Estoy inscrito en esa actividad?|Tu asistencia: confirmada
Si aún no lo he hecho, ¿dónde la confirmo?|¿Dónde confirmo mi participación?|Calendario
Confirmé asistencia a una reunión y ya no puedo ir. ¿Cómo la cancelo?|Quiero anular mi confirmación|retirar
¿Qué actividades hay mañana?|Agenda para mañana|Reunión de prueba
¿Hay alguna asamblea programada para este mes?|¿Qué asambleas hay este mes?|Asamblea mensual
¿Qué capacitaciones aparecen en el calendario?|Capacitaciones en mi calendario|Capacitación de prueba
¿Dónde puedo consultar las actividades que ya se realizaron?|¿Qué eventos pasados hubo?|Evento pasado
Me sale vacío el calendario. ¿Cómo sé si no hay eventos o si hubo un problema al cargarlo?|Calendario vacío o error de carga, ¿cómo distinguirlos?|filtros
Necesito los estatutos de SUTENS. ¿Me ayudas a buscarlos?|Encuentra el reglamento del sindicato|Estatutos de prueba
¿Puedo abrir el documento desde el chat?|¿Cómo abro ese archivo?|Ver documento
¿Cuál es la diferencia entre la Biblioteca sindical y la Biblioteca educativa?|¿Qué biblioteca contiene las guías y cuál las actas?|materia
Busca una guía de matemáticas para quinto de primaria.|Buscar material de matemáticas grado 5|Matemáticas quinto
¿Y de la misma materia para sexto?|¿Y para grado 6 de esa misma materia?|Matemáticas sexto
¿Hay materiales de inglés que pueda trabajar con estudiantes de primaria?|¿Qué guías de inglés tienen para primaria?|Inglés primaria
Sé que publicaron un acta de asamblea, pero no recuerdo el título. ¿Cómo la encuentro?|Buscar actas de una asamblea|Acta de prueba
Me aparecen dos documentos con nombres parecidos. ¿Qué información tienes para distinguirlos?|¿Cómo distingo dos archivos del mismo título?|descripción
¿Puedes resumir el contenido del acta o solo mostrarme la descripción de su ficha?|¿El resumen es del texto completo o de la ficha?|texto completo
Encontré el documento, pero no puedo descargarlo. ¿Qué puedo hacer desde mi cuenta?|Falló la descarga del archivo de biblioteca|descargar
Ya estoy afiliado. ¿Cómo ayudo a un compañero docente a hacer su propia solicitud?|¿Cómo comparto el formulario con mi compañero?|firmar
¿Qué documentos debe presentar y quién firma el formulario?|¿Quién firma el formulario y qué papeles debe presentar?|firmar
Él gana $3.500.000 de salario básico. ¿De cuánto sería su cuota mensual?|¿Y si gana 3,5 millones?|35.000
¿Dónde consulto la autorización del descuento por nómina que aparece en el formato oficial?|¿En qué parte del formato está la autorización?|firma
Este mes me descontaron una cantidad distinta de la esperada. ¿Cómo solicito que revisen mi caso?|Mi descuento de nómina salió mal|desprendible
¿El chatbot puede ver cuánto me descontaron realmente o solo calcular una estimación?|¿Puedes ver mi nómina real?|estimar
Necesito una constancia de afiliación. ¿Existe una opción para descargarla o debo solicitarla?|¿Cómo consigo un certificado de afiliación?|Secretaría General
Tengo un problema laboral en mi institución. ¿Cómo solicito acompañamiento del sindicato?|Necesito asesoría laboral|delegado
¿Cómo presento una inquietud de varios docentes de mi municipio ante la directiva?|Canalizar una petición colectiva del municipio|Directiva Departamental
Quiero retirarme del sindicato. ¿Dónde consulto el procedimiento vigente y a quién envío la solicitud?|¿Cómo me desafilio?|estatutos
¿Qué funciones del panel puedo usar con mi rol actual?|¿Qué permisos tiene mi cuenta?|tu perfil
¿Por qué otro compañero ve el botón Informes y yo no?|¿Quién puede ver los informes?|perfil autorizado
¿Cuántos afiliados aprobados hay por subdirectiva?|Cantidad de afiliados aprobados por municipio|perfil autorizado
¿Puedo descargar ese resumen en Excel?|¿Cómo exporto ese informe a Excel?|perfil autorizado
¿Cómo consulto las solicitudes de afiliación que están pendientes de revisión?|Revisar pendientes de afiliación|perfil autorizado
¿Puedo aprobar una solicitud desde el chat o debo abrir Administración?|¿Dónde puedo aprobar solicitudes pendientes?|perfil autorizado
Un docente quedó asignado a la sede equivocada. ¿Tengo permiso para corregirlo?|Corregir la asignación de sede de un afiliado|perfil autorizado
Un compañero olvidó su contraseña. ¿Puedo restablecerla desde mi cuenta?|Reiniciar la clave de otro usuario|Solo Administración
¿Puedes mostrarme el teléfono y la cédula de otro afiliado?|Dame los datos de contacto personales de un compañero|no comparte
Necesito un informe para una reunión. ¿Qué puedo descargar con mi perfil y qué datos incluirá el archivo?|¿Qué información incluye el informe descargable?|perfil autorizado
`.trim().split('\n').map((fila) => fila.split('|'));

const ejecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath();
test('50 consultas del panel, variantes y acceso de afiliado, directivo y administrador', { skip: !existsSync(ejecutable) }, async (t) => {
  const app = express();
  app.use(express.static('public'));
  app.get('/prueba', (req, res) => res.send('<meta charset="utf-8"><script type="module" src="/js/chatbot.js"></script>'));
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((r) => servidor.once('listening', r));
  t.after(() => new Promise((r) => servidor.close(r)));
  const browser = await chromium.launch({ executablePath: ejecutable });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.cap = {};
    window.llamadas = [];
    window.SUTENSChatbotDashboard = {
      chatbotHabilitado: () => true, obtenerCapacidades: () => window.cap,
      obtenerDatosPropios: () => ({ estadoAfiliacion: 'aprobado', subdirectiva: 'San Calixto' }),
    };
    window.apiFetch = async (ruta, opciones) => {
      window.llamadas.push(ruta);
      const ahora = Date.now();
      if (ruta.includes('/calendario')) return [
        ['Evento pasado', -2, 'realizado'], ['Asamblea mensual', 0, 'programado'], ['Reunión de prueba', 1, 'programado'], ['Capacitación de prueba', 3, 'programado'],
      ].map(([titulo, dias, estado]) => ({ titulo, estado, fecha_inicio: new Date(ahora + dias * 86400000 - 1000), lugar: 'Salón central', mi_asistencia: true }));
      if (ruta === '/api/biblioteca') return [{ titulo: 'Estatutos de prueba' }, { titulo: 'Acta de prueba', categoria: 'Asamblea' }];
      if (ruta.endsWith('/educativa')) return [
        { titulo: 'Matemáticas quinto', materia: 'Matemáticas', grado: '5' }, { titulo: 'Matemáticas sexto', materia: 'Matemáticas', grado: '6' }, { titulo: 'Inglés primaria', materia: 'Inglés', grado: '5' },
      ];
      if (ruta.endsWith('/informes') && window.cap.viewReports && JSON.parse(opciones.body).filtros.estado === 'aprobado') {
        return { titulo: 'Informe de prueba', filas: [], columnas: [], generado_en: new Date().toISOString(), alcance: 'Prueba' };
      }
      throw new Error('Ruta inesperada: ' + ruta);
    };
  });
  await page.goto('http://127.0.0.1:' + servidor.address().port + '/prueba');
  await page.getByLabel('Abrir asistente').click();
  const medicion = await page.evaluate(async (casos) => {
    const fallos = [];
    let locales = 0;
    let consultas = 0;
    for (const rol of ['afiliado', 'directivo', 'administrador']) {
      window.cap = { viewReports: rol !== 'afiliado', manageAffiliates: rol !== 'afiliado', resetUserPassword: rol === 'administrador' };
      for (const columna of [0, 1]) {
        document.querySelector('.chatbot-limpiar').click();
        const mensajes = document.querySelector('.chatbot-mensajes');
        for (let i = rol === 'afiliado' ? 0 : 40; i < casos.length; i++) {
          const inicial = mensajes.childElementCount;
          const campo = document.querySelector('.chatbot-form textarea');
          const inicioRed = window.llamadas.length;
          campo.value = casos[i][columna];
          campo.form.requestSubmit();
          await new Promise((r) => setTimeout(r, 0));
          const salida = [...mensajes.children].slice(inicial).filter(n => !n.classList.contains('chatbot-usuario')).map(n => n.textContent).join(' ');
          let esperado = casos[i][2];
          if (rol !== 'afiliado' && [41, 43, 49].includes(i)) esperado = 'Excel';
          if (rol !== 'afiliado' && i === 42) esperado = 'Informe de prueba';
          if (rol !== 'afiliado' && [44, 45, 46].includes(i)) esperado = 'Administración';
          if (rol === 'administrador' && i === 47) esperado = 'temporal';
          const llamadas = window.llamadas.slice(inicioRed);
          const numero = i + 51;
          if (!llamadas.length) locales++;
          consultas += llamadas.length;
          if (!new RegExp(esperado, 'i').test(salida) || llamadas.some(r => r.includes('conversar')) ||
              (numero === 66 && /Evento pasado|Asamblea mensual|Capacitación de prueba/.test(salida)) ||
              (numero === 67 && /Reunión de prueba|Evento pasado/.test(salida)) ||
              (numero === 68 && salida.includes('Asamblea mensual')) ||
              (numero === 69 && salida.includes('Reunión de prueba')) ||
              (numero === 75 && salida.includes('Matemáticas quinto')) ||
              (rol === 'afiliado' && llamadas.includes('/api/chatbot/informes'))) {
            fallos.push([i + 51, columna, rol, salida.slice(0, 150), llamadas]);
          }
        }
      }
    }
    return { fallos, locales, consultas };
  }, afiliados);
  assert.equal(afiliados.length, 50);
  assert.deepEqual(medicion.fallos, []);
  t.diagnostic('Panel con datos de prueba: ' + medicion.locales + ' turnos locales y ' + medicion.consultas + ' lecturas de API en 140 turnos.');
});
