import { CANAL_SOPORTE, CATALOGO_AYUDA_CHATBOT } from './chatbot-help-catalog.js';
import { buscarConsultaPanel } from './chatbot-guia-panel.js';
import { calcularCuotaConsultada, guiaTramiteAfiliacion, informacionAfiliacion, solicitaGuiaAfiliacion } from './datos-afiliacion.js';
import {
  buscarAyuda,
  normalizarPregunta,
  obtenerPreguntasSugeridas,
  validarDestinoChatbot,
} from './chatbot-help-search.js';

const boton = document.createElement('button');
boton.type = 'button';
boton.className = 'chatbot-boton';
boton.hidden = true;
boton.setAttribute('aria-label', 'Abrir asistente');
boton.setAttribute('aria-expanded', 'false');
boton.setAttribute('aria-describedby', 'chatbot-tooltip');

const icono = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
icono.setAttribute('viewBox', '0 0 24 24');
icono.setAttribute('aria-hidden', 'true');
icono.setAttribute('focusable', 'false');
const formaIcono = document.createElementNS('http://www.w3.org/2000/svg', 'path');
formaIcono.setAttribute('d', 'M7.9 20A9 9 0 1 0 4 16.1L2 22z');
icono.append(formaIcono);
boton.append(icono);

const tooltip = document.createElement('span');
tooltip.id = 'chatbot-tooltip';
tooltip.className = 'chatbot-tooltip';
tooltip.hidden = true;
tooltip.setAttribute('role', 'tooltip');
tooltip.textContent = '¿Necesitas ayuda?';

const panel = document.createElement('section');
panel.className = 'chatbot-panel';
panel.hidden = true;
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-labelledby', 'chatbot-titulo');

const cabecera = document.createElement('header');
cabecera.className = 'chatbot-cabecera';
const identidad = document.createElement('div');
identidad.className = 'chatbot-identidad';
const avatarAsistente = document.createElement('span');
avatarAsistente.className = 'chatbot-avatar';
avatarAsistente.setAttribute('aria-hidden', 'true');
avatarAsistente.textContent = 'S';
const identidadTexto = document.createElement('div');
const titulo = document.createElement('h2');
titulo.id = 'chatbot-titulo';
titulo.textContent = 'Asistente SUTENS';
const subtitulo = document.createElement('p');
subtitulo.className = 'chatbot-subtitulo';
subtitulo.textContent = 'Ayuda del sistema · consultas e informes';
identidadTexto.append(titulo, subtitulo);
identidad.append(avatarAsistente, identidadTexto);
const cerrar = document.createElement('button');
cerrar.type = 'button';
cerrar.className = 'chatbot-cerrar';
cerrar.setAttribute('aria-label', 'Cerrar asistente');
cerrar.textContent = '×';
cabecera.append(identidad, cerrar);

const acciones = document.createElement('div');
acciones.className = 'chatbot-acciones';
acciones.setAttribute('role', 'group');
acciones.setAttribute('aria-label', 'Acciones de ayuda');
const verSugerencias = document.createElement('button');
verSugerencias.type = 'button';
verSugerencias.className = 'chatbot-accion';
verSugerencias.textContent = 'Ver preguntas sugeridas';
const consultarInformes = document.createElement('button');
consultarInformes.type = 'button';
consultarInformes.className = 'chatbot-accion';
consultarInformes.textContent = 'Informes';
consultarInformes.setAttribute('aria-label', 'Consultar informes');
consultarInformes.hidden = true;
consultarInformes.setAttribute('aria-expanded', 'false');
consultarInformes.setAttribute('aria-controls', 'chatbot-panel-informes');
const consultarDatosPropios = document.createElement('button');
consultarDatosPropios.type = 'button';
consultarDatosPropios.className = 'chatbot-accion';
consultarDatosPropios.textContent = 'Mis datos';
consultarDatosPropios.setAttribute('aria-label', 'Consultar mis datos');
const buscarDocumentos = document.createElement('button');
buscarDocumentos.type = 'button';
buscarDocumentos.className = 'chatbot-accion';
buscarDocumentos.textContent = 'Buscar documentos';
const gestionarAfiliados = document.createElement('button');
gestionarAfiliados.type = 'button';
gestionarAfiliados.className = 'chatbot-accion';
gestionarAfiliados.textContent = 'Gestionar afiliados';
gestionarAfiliados.hidden = true;
acciones.append(verSugerencias, consultarInformes, consultarDatosPropios, buscarDocumentos, gestionarAfiliados);
acciones.hidden = true;
const herramientas = document.createElement('div');
herramientas.className = 'chatbot-herramientas';
const alternarAcciones = document.createElement('button');
alternarAcciones.type = 'button';
alternarAcciones.className = 'chatbot-herramientas-toggle';
alternarAcciones.textContent = 'Acciones';
alternarAcciones.setAttribute('aria-expanded', 'false');
alternarAcciones.setAttribute('aria-controls', 'chatbot-acciones');
acciones.id = 'chatbot-acciones';
herramientas.append(alternarAcciones, acciones);

const panelInformes = document.createElement('section');
panelInformes.className = 'chatbot-informes';
panelInformes.id = 'chatbot-panel-informes';
panelInformes.hidden = true;
panelInformes.setAttribute('aria-labelledby', 'chatbot-informes-titulo');
const tituloInformes = document.createElement('h3');
tituloInformes.id = 'chatbot-informes-titulo';
tituloInformes.textContent = 'Informes agregados';
const formularioInforme = document.createElement('form');
formularioInforme.className = 'chatbot-informes-form';
const mensajeInforme = document.createElement('p');
mensajeInforme.className = 'chatbot-informes-mensaje';
mensajeInforme.setAttribute('role', 'status');
mensajeInforme.setAttribute('aria-live', 'polite');
panelInformes.append(tituloInformes, formularioInforme, mensajeInforme);

function crearControlInforme(id, etiquetaTexto, tipo = 'select') {
  const contenedor = document.createElement('div');
  contenedor.className = 'chatbot-filtro';
  const etiqueta = document.createElement('label');
  etiqueta.htmlFor = id;
  etiqueta.textContent = etiquetaTexto;
  const control = document.createElement(tipo === 'select' ? 'select' : 'input');
  control.id = id;
  if (tipo !== 'select') control.type = tipo;
  if (tipo === 'select') {
    const opcionInicial = document.createElement('option');
    opcionInicial.value = '';
    opcionInicial.textContent = 'Todos';
    control.append(opcionInicial);
  }
  contenedor.append(etiqueta, control);
  formularioInforme.append(contenedor);
  return control;
}

function asignarOpciones(control, opciones) {
  while (control.options.length > 1) control.remove(1);
  opciones.forEach(({ value, label }) => {
    const opcion = document.createElement('option');
    opcion.value = String(value);
    opcion.textContent = label;
    control.append(opcion);
  });
}

const informeSelect = crearControlInforme('chatbot-informe', 'Tipo de informe');
informeSelect.options[0].textContent = 'Selecciona un informe';
informeSelect.required = true;
asignarOpciones(informeSelect, [
  { value: 'afiliados_por_estado', label: 'Afiliados por estado' },
  { value: 'afiliados_por_subdirectiva', label: 'Afiliados por subdirectiva' },
  { value: 'afiliados_por_institucion_sede', label: 'Afiliados por institución o sede' },
  { value: 'aprobaciones_por_mes', label: 'Aprobaciones por mes' },
]);
const estadoSelect = crearControlInforme('chatbot-estado', 'Estado de afiliación');
asignarOpciones(estadoSelect, [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'retirado', label: 'Retirado' },
]);
const estadoSindicalSelect = crearControlInforme('chatbot-estado-sindical', 'Estado sindical');
asignarOpciones(estadoSindicalSelect, [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
]);
const agrupacionSelect = crearControlInforme('chatbot-agrupacion', 'Agrupar por');
asignarOpciones(agrupacionSelect, [
  { value: 'institucion', label: 'Institución' },
  { value: 'sede', label: 'Sede' },
]);
const subdirectivaSelect = crearControlInforme('chatbot-subdirectiva', 'Subdirectiva');
const institucionSelect = crearControlInforme('chatbot-institucion', 'Institución');
const sedeSelect = crearControlInforme('chatbot-sede', 'Sede');
const desdeInput = crearControlInforme('chatbot-desde', 'Desde', 'date');
const hastaInput = crearControlInforme('chatbot-hasta', 'Hasta', 'date');
const ayudaInforme = document.createElement('p');
ayudaInforme.className = 'chatbot-informes-ayuda';
ayudaInforme.textContent = 'Solo se muestran conteos. Los grupos con menos de 5 afiliados se omiten.';
const ejecutarInforme = document.createElement('button');
ejecutarInforme.type = 'submit';
ejecutarInforme.className = 'btn btn-primario';
ejecutarInforme.textContent = 'Generar informe';
formularioInforme.append(ayudaInforme, ejecutarInforme);
const restablecerFiltros = document.createElement('button');
restablecerFiltros.type = 'button';
restablecerFiltros.className = 'chatbot-filtros-limpiar';
restablecerFiltros.textContent = 'Limpiar filtros';
formularioInforme.append(restablecerFiltros);
let estructuraInformes = [];

const mensajes = document.createElement('div');
mensajes.className = 'chatbot-mensajes';
mensajes.setAttribute('role', 'log');
mensajes.setAttribute('aria-live', 'polite');
mensajes.setAttribute('aria-relevant', 'additions text');
mensajes.setAttribute('aria-label', 'Conversación con el asistente');

const contenido = document.createElement('div');
contenido.className = 'chatbot-contenido';
contenido.append(panelInformes, mensajes);

const formulario = document.createElement('form');
formulario.className = 'chatbot-form';
const campo = document.createElement('textarea');
campo.rows = 1;
campo.maxLength = 500;
campo.placeholder = 'Pregunta aquí sin incluir claves ni datos personales.';
campo.setAttribute('aria-label', 'Escribe tu pregunta');
campo.autocomplete = 'off';
campo.required = true;
const enviar = document.createElement('button');
enviar.type = 'submit';
enviar.className = 'btn btn-primario';
enviar.textContent = 'Enviar';
const limpiar = document.createElement('button');
limpiar.type = 'button';
limpiar.className = 'chatbot-limpiar';
limpiar.textContent = 'Borrar conversación';
formulario.append(campo, enviar, limpiar);

panel.append(cabecera, herramientas, contenido, formulario);

let historialModelo = [];
let conversandoDeAfiliacion = false;
let ultimaActividad = null;
let ultimaBusqueda = null;
let conversacion = new AbortController();

function capacidadesVisibles() {
  // Solo controla qué opciones se presentan; el servidor sigue autorizando cada operación.
  return window.SUTENSChatbotDashboard?.obtenerCapacidades?.() || {};
}

function agregarMensaje(texto, autor) {
  const burbuja = document.createElement('div');
  burbuja.className = `chatbot-mensaje chatbot-${autor}`;
  const etiqueta = document.createElement('span');
  etiqueta.className = 'chatbot-autor';
  etiqueta.textContent = autor === 'usuario' ? 'Tú' : 'Asistente SUTENS';
  const parrafo = document.createElement('p');
  parrafo.textContent = texto;
  burbuja.append(etiqueta, parrafo);
  mensajes.append(burbuja);
  contenido.scrollTop = contenido.scrollHeight;
  return burbuja;
}

function agregarAccionDestino(entrada) {
  const destino = entrada.destino;
  if (!validarDestinoChatbot(destino)) return;

  if (destino.tipo === 'vista') {
    const botonDestino = document.createElement('button');
    botonDestino.type = 'button';
    botonDestino.className = 'chatbot-enlace';
    botonDestino.textContent = 'Abrir ' + ({ calendario: 'Calendario', biblioteca: 'Biblioteca sindical', 'biblioteca-educativa': 'Biblioteca educativa', 'mi-cuenta': 'Mi cuenta', afiliados: 'Afiliados', administracion: 'Administración' }[destino.id] || entrada.titulo);
    botonDestino.addEventListener('click', () => {
      const navego = window.SUTENSChatbotDashboard?.navegarA?.(destino.id);
      if (navego) alternar(false);
      else agregarMensaje('Esa vista no está disponible para tu perfil.', 'bot');
    });
    mensajes.append(botonDestino);
    return;
  }

  const enlace = document.createElement('a');
  enlace.className = 'chatbot-enlace';
  enlace.href = destino.ruta;
  if (destino.ruta === informacionAfiliacion.formularioPdfUrl) {
    enlace.target = '_blank';
    enlace.rel = 'noopener';
  }
  enlace.textContent = `Abrir ${entrada.titulo}`;
  mensajes.append(enlace);
}

function mostrarSugerencias(entradas) {
  const grupo = document.createElement('div');
  grupo.className = 'chatbot-sugerencias';
  grupo.setAttribute('role', 'group');
  grupo.setAttribute('aria-label', 'Preguntas sugeridas');
  entradas.forEach((entrada) => {
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'chatbot-sugerencia';
    opcion.textContent = entrada.preguntas[0] || entrada.titulo;
    opcion.addEventListener('click', () => responder(opcion.textContent));
    grupo.append(opcion);
  });
  mensajes.append(grupo);
  contenido.scrollTop = contenido.scrollHeight;
}

function mostrarDatosPropios() {
  const datos = window.SUTENSChatbotDashboard?.obtenerDatosPropios?.();
  if (!datos) {
    agregarMensaje('No pude cargar tu perfil. Inténtalo de nuevo o consulta con el equipo administrador.', 'bot');
    return;
  }

  const tarjeta = document.createElement('dl');
  tarjeta.className = 'chatbot-datos-propios';
  const etiquetas = {
    nombre: 'Nombre',
    correo: 'Correo',
    estadoAfiliacion: 'Estado de afiliación',
    estadoSindical: 'Estado sindical',
    subdirectiva: 'Subdirectiva',
    institucion: 'Institución',
    sede: 'Sede',
    cargo: 'Cargo sindical',
  };
  Object.entries(etiquetas).forEach(([clave, etiqueta]) => {
    if (!datos[clave]) return;
    const termino = document.createElement('dt');
    termino.textContent = etiqueta;
    const definicion = document.createElement('dd');
    definicion.textContent = String(datos[clave]);
    tarjeta.append(termino, definicion);
  });
  agregarMensaje('Estos son los datos de tu perfil:', 'bot');
  mensajes.append(tarjeta);
  contenido.scrollTop = contenido.scrollHeight;
}

async function buscarDocumentosSindicales(consulta = '') {
  const { signal } = conversacion;
  ultimaBusqueda = consulta;
  const normalizarBusqueda = (valor) => String(valor || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const termino = normalizarBusqueda(consulta.trim());
  const palabrasIgnoradas = new Set([
    'a', 'al', 'algun', 'alguna', 'algunas', 'algunos', 'algun', 'archivo', 'archivos', 'ayuda',
    'buscar', 'busca', 'con', 'cual', 'cuales', 'de', 'del', 'dime', 'documento', 'documentos',
    'el', 'en', 'encuentra', 'es', 'esta', 'hay', 'la', 'las', 'lo', 'los', 'me', 'muestra',
    'necesito', 'para', 'por', 'puede', 'puedes', 'quiero', 'que', 'resumen', 'resume', 'sobre',
    'un', 'una', 'unas', 'uno', 'unos', 'ver', 'mostrar', 'solicitada', 'solicitado', 'cualquier',
    'documento', 'archivo', 'favor', 'educativos', 'recientes', 'grado', 'grados', 'materia', 'materias', 'biblioteca', 'sindical', 'sindicato',
    'educativo', 'educativa', 'educativos', 'educativas',
  ]);
  const terminos = termino.split(/[^\p{L}\p{N}]+/u)
    .filter((palabra) => (palabra.length > 1 || /^\d$/.test(palabra)) && !palabrasIgnoradas.has(palabra));
  const educativoSolicitado = /\b(educativ[oa]s?|grado|materia|guia|ingles|matematicas|ciencias|espanol|escolar)\b/i.test(termino);
  const sindicalSolicitado = /\b(sindical|sindicato|acta|asamblea|estatutos|directiva|comunicado)\b/i.test(termino);
  const buscando = document.createElement('p');
  buscando.className = 'chatbot-escribiendo';
  buscando.textContent = 'Buscando en la biblioteca…';
  mensajes.append(buscando);
  contenido.scrollTop = contenido.scrollHeight;
  try {
    const respuestas = await Promise.allSettled([
      educativoSolicitado && !sindicalSolicitado ? [] : apiFetch('/api/biblioteca', { signal }),
      sindicalSolicitado && !educativoSolicitado ? [] : apiFetch('/api/biblioteca/educativa', { signal }),
    ]);
    buscando.remove();
    if (signal.aborted) return;
    if (educativoSolicitado && !sindicalSolicitado && respuestas[1].status === 'rejected') {
      throw respuestas[1].reason;
    }
    if (sindicalSolicitado && !educativoSolicitado && respuestas[0].status === 'rejected') {
      throw respuestas[0].reason;
    }
    const sindicales = respuestas[0].status === 'fulfilled' && Array.isArray(respuestas[0].value)
      ? respuestas[0].value : [];
    const educativas = respuestas[1].status === 'fulfilled' && Array.isArray(respuestas[1].value)
      ? respuestas[1].value : [];
    if (!sindicales.length && !educativas.length && respuestas.every((respuesta) => respuesta.status === 'rejected')) {
      throw respuestas[0].reason || respuestas[1].reason || new Error('No se pudieron consultar las bibliotecas.');
    }
    const documentos = [
      ...sindicales.map((documento) => ({ ...documento, tipoBiblioteca: 'Sindical' })),
      ...educativas.map((documento) => ({ ...documento, tipoBiblioteca: 'Educativa' })),
    ];
    const documentosVisibles = educativoSolicitado && !sindicalSolicitado
      ? documentos.filter((documento) => documento.tipoBiblioteca === 'Educativa')
      : sindicalSolicitado && !educativoSolicitado
        ? documentos.filter((documento) => documento.tipoBiblioteca === 'Sindical')
        : documentos;
    const gradoSolicitado = extraerGrado(termino);
    const materiaSolicitada = termino.match(/\b(ingles|matematicas|espanol|ciencias|biologia|quimica|fisica|sociales)\b/)?.[1];
    const primaria = /\bprimaria\b/.test(termino);
    const resultados = documentosVisibles.map((documento) => {
      const titulo = normalizarBusqueda(documento.titulo);
      const clasificacion = normalizarBusqueda([
        documento.descripcion,
        documento.categoria,
        documento.materia,
        documento.tipo_recurso,
        documento.grado,
      ].filter(Boolean).join(' '));
      const gradoFicha = normalizarBusqueda(documento.grado);
      const grados = gradoFicha.match(/\b\d{1,2}\b/g) || [extraerGrado(gradoFicha)];
      if ((gradoSolicitado && !grados.includes(gradoSolicitado)) ||
          (materiaSolicitada && ![titulo, clasificacion].some((dato) => dato.includes(materiaSolicitada))) ||
          (primaria && !clasificacion.includes('primaria') && !titulo.includes('primaria') &&
            !grados.some((grado) => /^[1-5]$/.test(grado)))) {
        return { documento, puntaje: 0 };
      }
      const puntaje = terminos.reduce((total, palabra) => {
        if (titulo.includes(palabra)) return total + 4;
        if (normalizarBusqueda(`${documento.materia || ''} ${documento.categoria || ''} ${documento.tipo_recurso || ''} ${documento.grado || ''}`).includes(palabra)) return total + 3;
        if (clasificacion.includes(palabra)) return total + 1;
        return total;
      }, 0);
      return { documento, puntaje: terminos.length ? puntaje : 1 };
    }).filter(({ puntaje }) => puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 5)
      .map(({ documento }) => documento);
    agregarMensaje(resultados.length
      ? `Encontré ${resultados.length} documento${resultados.length === 1 ? '' : 's'}${termino ? ` relacionado${resultados.length === 1 ? '' : 's'} con “${consulta.trim()}”` : ' reciente' + (resultados.length === 1 ? '' : 's')}:`
      : 'No encontré documentos con ese título o tema en las bibliotecas disponibles para tu cuenta.', 'bot');
    resultados.forEach((documento) => {
      const tarjeta = document.createElement('article');
      tarjeta.className = 'chatbot-documento';
      const encabezado = document.createElement('strong');
      encabezado.textContent = documento.titulo || 'Documento sin título';
      const tipo = document.createElement('span');
      tipo.className = 'chatbot-documento-tipo';
      tipo.textContent = [documento.tipoBiblioteca, documento.categoria || documento.materia || documento.tipo_recurso]
        .filter(Boolean).join(' · ');
      const resumen = document.createElement('p');
      resumen.textContent = documento.descripcion?.trim()
        ? `Resumen de la ficha: ${documento.descripcion.trim().slice(0, 500)}${documento.descripcion.trim().length > 500 ? '…' : ''}`
        : 'La ficha no incluye una descripción; el asistente solo puede mostrar el título y la clasificación del documento.';
      const extension = String(documento.archivo_url || '').match(/\.(pdf|doc|docx)$/i)?.[0]?.toLowerCase();
      const abrir = document.createElement('button');
      abrir.type = 'button';
      abrir.className = 'chatbot-documento-abrir';
      abrir.textContent = extension === '.pdf' ? 'Ver documento' : extension ? `Descargar ${extension.slice(1).toUpperCase()}` : 'Archivo no disponible';
      abrir.disabled = !extension;
      if (extension) {
        abrir.addEventListener('click', async () => {
          abrir.disabled = true;
          try {
            const ruta = documento.tipoBiblioteca === 'Educativa'
              ? `/api/biblioteca/educativa/${documento.id_documento}/archivo`
              : `/api/biblioteca/${documento.id_documento}/archivo`;
            if (extension === '.pdf' && window.UI?.vistaPrevia) {
              await window.UI.vistaPrevia(ruta, documento.titulo || 'Documento');
            } else {
              const archivo = await apiFetchArchivo(ruta);
              const url = URL.createObjectURL(archivo);
              const enlace = document.createElement('a');
              enlace.href = url;
              enlace.download = `${documento.titulo || 'documento'}${extension}`;
              enlace.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          } catch (error) {
            if (!signal.aborted) agregarMensaje(error.message || 'No se pudo abrir el archivo solicitado.', 'bot');
          } finally {
            abrir.disabled = false;
          }
        });
      }
      tarjeta.append(encabezado, tipo, resumen, abrir);
      mensajes.append(tarjeta);
    });
    if (!termino && documentosVisibles.length > resultados.length) {
      agregarMensaje('Escribe el tema, el nombre de la materia, el grado o el tipo de documento para afinar la búsqueda.', 'bot');
    }
  } catch (error) {
    if (signal.aborted) return;
    agregarMensaje(error.message || 'No pude consultar las bibliotecas de documentos. Inténtalo de nuevo.', 'bot');
  }
  contenido.scrollTop = contenido.scrollHeight;
}

function esSaludo(texto) {
  const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  return /^(hola|buenos dias|buenas tardes|buenas noches|buenas|saludos|que tal|hey)[.!?\s]*$/.test(normalizado);
}

function mostrarCanalSoporte(prefijo) {
  const canal = CANAL_SOPORTE.trim();
  const mensaje = canal
    ? `${prefijo} Canal de soporte: ${canal}.`
    : `${prefijo} El canal de soporte aún no está configurado. Contacta al equipo administrador de SUTENS.`;
  agregarMensaje(mensaje, 'bot');
}

function actualizarVisibilidadInformes() {
  // La visibilidad es solo una ayuda de interfaz; el servidor aplica la autorización real.
  consultarInformes.hidden = !capacidadesVisibles().viewReports;
  gestionarAfiliados.hidden = !capacidadesVisibles().manageAffiliates;
}

function actualizarDisponibilidadChatbot() {
  const habilitado = window.SUTENSChatbotDashboard?.chatbotHabilitado?.() === true;
  boton.hidden = !habilitado;
  tooltip.hidden = !habilitado;
  if (!habilitado) {
    panel.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
  }
}

function actualizarFiltrosInforme() {
  const informe = informeSelect.value;
  estadoSelect.closest('.chatbot-filtro').hidden = ![
    'afiliados_por_subdirectiva',
    'afiliados_por_institucion_sede',
  ].includes(informe);
  estadoSindicalSelect.closest('.chatbot-filtro').hidden = ![
    'afiliados_por_estado',
    'afiliados_por_subdirectiva',
    'afiliados_por_institucion_sede',
  ].includes(informe);
  agrupacionSelect.closest('.chatbot-filtro').hidden = informe !== 'afiliados_por_institucion_sede';
  subdirectivaSelect.closest('.chatbot-filtro').hidden = ![
    'afiliados_por_subdirectiva',
    'afiliados_por_institucion_sede',
  ].includes(informe);
  institucionSelect.closest('.chatbot-filtro').hidden = informe !== 'afiliados_por_institucion_sede';
  sedeSelect.closest('.chatbot-filtro').hidden = informe !== 'afiliados_por_institucion_sede' ||
    agrupacionSelect.value !== 'sede';
  desdeInput.closest('.chatbot-filtro').hidden = informe !== 'aprobaciones_por_mes';
  hastaInput.closest('.chatbot-filtro').hidden = informe !== 'aprobaciones_por_mes';
  ayudaInforme.hidden = informe === 'aprobaciones_por_mes';
}

function actualizarInstituciones() {
  const subdirectiva = estructuraInformes.find(
    (item) => String(item.id_subdirectiva) === subdirectivaSelect.value
  );
  asignarOpciones(institucionSelect, (subdirectiva?.instituciones || []).map((institucion) => ({
    value: institucion.id_institucion,
    label: institucion.nombre,
  })));
  actualizarSedes();
}

function actualizarSedes() {
  const subdirectiva = estructuraInformes.find(
    (item) => String(item.id_subdirectiva) === subdirectivaSelect.value
  );
  const institucion = subdirectiva?.instituciones?.find(
    (item) => String(item.id_institucion) === institucionSelect.value
  );
  asignarOpciones(sedeSelect, (institucion?.sedes || []).map((sede) => ({
    value: sede.id_sede,
    label: sede.nombre,
  })));
}

async function cargarFiltrosEstructurales() {
  if (estructuraInformes.length) return;
  const { signal } = conversacion;
  const subdirectivas = await apiFetch('/api/subdirectivas', { signal });
  if (signal.aborted) return;
  estructuraInformes = subdirectivas.filter((item) => !item.es_principal);
  asignarOpciones(subdirectivaSelect, estructuraInformes.map((item) => ({
    value: item.id_subdirectiva,
    label: item.nombre,
  })));
}

function crearTablaInforme(resultado) {
  const resumen = document.createElement('p');
  resumen.textContent = `Alcance: ${resultado.alcance}. Generado: ${new Date(resultado.generado_en).toLocaleString('es-CO')}`;
  mensajes.append(resumen);

  const filtrosAplicados = Object.entries(resultado.filtros || {})
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
  if (resultado.agrupacion) filtrosAplicados.push(['agrupacion', resultado.agrupacion]);
  const etiquetasFiltros = {
    estado: 'Estado de afiliación',
    estado_sindical: 'Estado sindical',
    id_subdirectiva: 'Subdirectiva',
    id_institucion: 'Institución',
    id_sede: 'Sede',
    desde: 'Desde',
    hasta: 'Hasta',
    periodo: 'Periodo',
    agrupacion: 'Agrupado por',
  };
  const nombreFiltro = (clave, valor) => {
    if (clave === 'id_subdirectiva') {
      return estructuraInformes.find((item) => String(item.id_subdirectiva) === String(valor))?.nombre || valor;
    }
    if (clave === 'id_institucion' || clave === 'id_sede') {
      for (const subdirectiva of estructuraInformes) {
        for (const institucion of subdirectiva.instituciones || []) {
          if (clave === 'id_institucion' && String(institucion.id_institucion) === String(valor)) {
            return institucion.nombre;
          }
          const sede = (institucion.sedes || []).find((item) => String(item.id_sede) === String(valor));
          if (clave === 'id_sede' && sede) return sede.nombre;
        }
      }
    }
    if (clave === 'agrupacion') {
      return ({
        estado: 'Estado de afiliación',
        subdirectiva: 'Subdirectiva',
        institucion: 'Institución',
        sede: 'Sede',
        mes: 'Mes',
      })[valor] || valor;
    }
    return String(valor);
  };
  const detalleFiltros = document.createElement('p');
  detalleFiltros.textContent = filtrosAplicados.length
    ? `Filtros aplicados: ${filtrosAplicados.map(([clave, valor]) =>
      `${etiquetasFiltros[clave] || clave}: ${nombreFiltro(clave, valor)}`
    ).join(' · ')}`
    : 'Filtros aplicados: ninguno';
  mensajes.append(detalleFiltros);

  (resultado.avisos || []).forEach((texto) => {
    const aviso = document.createElement('p');
    aviso.className = 'chatbot-aviso-privacidad';
    aviso.textContent = texto;
    mensajes.append(aviso);
  });

  if (!resultado.filas.length) {
    const vacio = document.createElement('p');
    vacio.textContent = resultado.privacidad?.hubo_supresion
      ? 'No hay grupos que puedan mostrarse sin comprometer la privacidad.'
      : 'No se encontraron resultados con esos filtros.';
    mensajes.append(vacio);
    return;
  }

  const tabla = document.createElement('table');
  tabla.className = 'chatbot-tabla';
  const caption = document.createElement('caption');
  caption.textContent = resultado.titulo;
  const thead = document.createElement('thead');
  const filaCabecera = document.createElement('tr');
  ['Grupo', 'Cantidad'].forEach((texto) => {
    const celda = document.createElement('th');
    celda.scope = 'col';
    celda.textContent = texto;
    filaCabecera.append(celda);
  });
  thead.append(filaCabecera);
  const tbody = document.createElement('tbody');
  resultado.filas.forEach((fila) => {
    const tr = document.createElement('tr');
    const grupo = document.createElement('th');
    grupo.scope = 'row';
    grupo.textContent = String(fila.grupo);
    const cantidad = document.createElement('td');
    cantidad.textContent = String(fila.cantidad);
    tr.append(grupo, cantidad);
    tbody.append(tr);
  });
  tabla.append(caption, thead, tbody);
  mensajes.append(tabla);
  contenido.scrollTop = contenido.scrollHeight;
}

function mostrarOpcionesDescarga(solicitud) {
  const opciones = document.createElement('div');
  opciones.className = 'chatbot-descargas';
  opciones.setAttribute('role', 'group');
  opciones.setAttribute('aria-label', 'Opciones para descargar el informe');
  const pregunta = document.createElement('p');
  pregunta.textContent = 'El archivo incluye los totales de cada grupo. La descarga actualiza las cifras.';
  const estado = document.createElement('p');
  estado.className = 'chatbot-informes-mensaje';
  estado.setAttribute('role', 'status');
  opciones.append(pregunta);

  const descargar = document.createElement('button');
  descargar.type = 'button';
  descargar.className = 'chatbot-accion';
  descargar.textContent = 'Descargar resumen en Excel';
  descargar.addEventListener('click', async () => {
    descargar.disabled = true;
    estado.textContent = 'Preparando descarga…';
    try {
      const archivo = await apiFetchArchivo('/api/chatbot/informes/exportar', {
        method: 'POST',
        body: JSON.stringify({ ...solicitud, formato: 'resumen' }),
      });
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'sutens-resumen.xlsx';
      enlace.click();
      URL.revokeObjectURL(url);
      estado.textContent = 'Descarga preparada.';
    } catch (error) {
      estado.textContent = error.message || 'No se pudo descargar el archivo.';
    } finally {
      descargar.disabled = false;
    }
  });
  opciones.append(descargar);
  const omitir = document.createElement('button');
  omitir.type = 'button';
  omitir.className = 'chatbot-accion';
  omitir.textContent = 'No descargar';
  omitir.addEventListener('click', () => {
    opciones.remove();
    campo.focus();
  });
  opciones.append(omitir);
  opciones.append(estado);
  mensajes.append(opciones);
}

async function enviarInforme(evento) {
  const { signal } = conversacion;
  evento.preventDefault();
  mensajeInforme.textContent = 'Generando informe…';
  ejecutarInforme.disabled = true;
  const informe = informeSelect.value;
  const filtros = {};
  const agregarSiVisible = (nombre, control) => {
    if (!control.closest('.chatbot-filtro').hidden && control.value) filtros[nombre] = control.value;
  };
  agregarSiVisible('estado', estadoSelect);
  agregarSiVisible('estado_sindical', estadoSindicalSelect);
  agregarSiVisible('id_subdirectiva', subdirectivaSelect);
  agregarSiVisible('id_institucion', institucionSelect);
  agregarSiVisible('id_sede', sedeSelect);
  agregarSiVisible('desde', desdeInput);
  agregarSiVisible('hasta', hastaInput);
  const solicitud = { informe, filtros };
  if (informe === 'afiliados_por_institucion_sede') {
    solicitud.agrupacion = agrupacionSelect.value || 'institucion';
  }

  agregarMensaje(`Consultar informe: ${informeSelect.options[informeSelect.selectedIndex].textContent}`, 'usuario');
  try {
    const resultado = await apiFetch('/api/chatbot/informes', {
      method: 'POST',
      signal, body: JSON.stringify(solicitud),
    });
    if (signal.aborted) return;
    mensajeInforme.textContent = '';
    ejecutarInforme.textContent = 'Generar informe';
    panelInformes.hidden = true;
    consultarInformes.setAttribute('aria-expanded', 'false');
    const encabezado = presentarInforme(resultado, solicitud);
    encabezado.tabIndex = -1;
    encabezado.focus({ preventScroll: true });
    contenido.scrollTop += encabezado.getBoundingClientRect().top - contenido.getBoundingClientRect().top;
  } catch (error) {
    if (signal.aborted) return;
    mensajeInforme.textContent = error.message || 'No se pudo generar el informe.';
    ejecutarInforme.textContent = 'Reintentar informe';
  } finally {
    ejecutarInforme.disabled = false;
  }
}

function presentarInforme(resultado, solicitud) {
  const encabezado = agregarMensaje(resultado.titulo, 'bot');
  crearTablaInforme(resultado);
  if (resultado.descargas_habilitadas === true && resultado.filas.length > 0) mostrarOpcionesDescarga(solicitud);
  return encabezado;
}

function orientar(id) {
  const entrada = CATALOGO_AYUDA_CHATBOT.find((item) => item.id === id);
  agregarMensaje(entrada.respuesta, 'bot');
  agregarAccionDestino(entrada);
}

function recordarTurno(texto, respuesta) {
  historialModelo.push({ role: 'user', content: texto }, { role: 'assistant', content: respuesta.slice(0, 1200) });
  historialModelo = historialModelo.slice(-6);
}

function responderSobreAfiliacion(texto, pregunta, seguimiento) {
  const temaExplicito = /\b(afiliar\w*|afilio|afiliacion|cuota sindical|estatutos (?:de sutens|del sindicato))\b/.test(pregunta);
  const calculo = seguimiento || /\b(cuota|descontarian|aportaria)\b/.test(pregunta) ? calcularCuotaConsultada(texto) : null;
  const repregunta = /^(?:y )?(?:(?:el |la |los |las )?(?:costo|costos|cuota|precio|formulario|formato|requisitos|documentos|normas|estatutos|reglamento)|cuanto (?:cuesta|pago|vale)|que (?:normas|requisitos|documentos) (?:aplican|necesito)|donde (?:lo (?:entrego|radico)|se entrega))$/.test(pregunta);
  if (!temaExplicito && !calculo && !(seguimiento && repregunta)) return false;
  const tramite = solicitaGuiaAfiliacion(pregunta) ||
    /\b(formularios?|formatos?|requisitos?|documentos?|papeles|que necesito|como (?:me afilio|afiliar\w*))\b/.test(pregunta);
  const costo = /\b(costo[s]?|cuotas?|precio|cuesta|vale|valdria|pago|paga|pagar|descuent\w*|cobran)\b/.test(pregunta);
  const normas = /\b(normas?|normativa|estatutos?|reglamentos?)\b/.test(pregunta);
  const entrega = /\b(entreg\w*|radic\w*)\b/.test(pregunta);
  const partes = [];
  if (tramite) {
    partes.push(guiaTramiteAfiliacion);
  }
  if (entrega) partes.push('Puedes entregarlo al delegado de la subdirectiva municipal o en ' + informacionAfiliacion.sedeFisica + '.');
  if (calculo) partes.push(calculo);
  else if (costo) partes.push('La cuota mensual es del ' + informacionAfiliacion.cuotaSindical.porcentajeSalarioBasico +
    ' % del salario básico y se descuenta por nómina. El formulario no indica un cobro aparte por inscribirse.');
  if (normas) partes.push(informacionAfiliacion.compromisoEstatutario +
    ' Para consultar artículos o requisitos específicos, busca los estatutos vigentes en la Biblioteca sindical o solicítalos a la Secretaría General.');
  if (!partes.length) return false;
  const respuesta = partes.join('\n\n');
  agregarMensaje(respuesta, 'bot');
  agregarAccionDestino({ titulo: 'formulario oficial de afiliación (PDF)', destino: { tipo: 'ruta', ruta: informacionAfiliacion.formularioPdfUrl } });
  if (normas) mostrarSugerencias([{ preguntas: ['Buscar estatutos en la biblioteca sindical'] }]);
  recordarTurno(texto, respuesta);
  contenido.scrollTop = contenido.scrollHeight;
  return true;
}

async function responder(texto) {
  if (enviar.disabled) return;
  const { signal } = conversacion;
  const pregunta = normalizarPregunta(texto);
  const seguimientoAfiliacion = conversandoDeAfiliacion;
  conversandoDeAfiliacion = false;
  const capacidades = capacidadesVisibles();
  if (/\b(?:mi |la )?(?:clave|contrasena|password)\s*(?:es|:|=)\s*\S+/i.test(texto.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
    agregarMensaje('Escribe tus credenciales únicamente en Mi cuenta. Desde allí puedes cambiar tu contraseña.', 'bot');
    agregarAccionDestino({ destino: { tipo: 'vista', id: 'mi-cuenta' } });
    return;
  }
  agregarMensaje(texto, 'usuario');
  const actividadAnterior = ultimaActividad;
  if (ultimaActividad && /^(y )?(donde( es| sera| queda| se realiza)?|cuando( es| sera| se realiza)?|a que hora( es| empieza| comienza)?|en que lugar|quienes confirmaron( asistencia)?|cuantos confirmaron|ya confirme|confirme mi asistencia)$/.test(pregunta)) {
    mostrarActividad(ultimaActividad, pregunta);
    return;
  }
  ultimaActividad = null;
  const busquedaAnterior = ultimaBusqueda;
  ultimaBusqueda = null;
  if (esSaludo(texto)) {
    agregarMensaje('¡Hola! ¿Quieres buscar un documento, consultar tu próxima actividad o revisar tu perfil?', 'bot');
    return;
  }
  // Las consultas concretas conservan los permisos y datos de la sesión.
  const tema = buscarConsultaPanel(texto);
  if (tema && !calcularCuotaConsultada(texto) &&
      !(/\b(formulario|formato|afiliar\w*)\b/.test(pregunta) && /\b(costo|normas|cuota|precio)\b/.test(pregunta))) {
    enviar.disabled = true;
    try {
      if (await responderTemaPanel(tema, texto, pregunta, capacidades, actividadAnterior, busquedaAnterior, signal)) return;
    } catch {
      if (!signal.aborted) agregarMensaje('No pude cargar los datos de la consulta. Intenta de nuevo desde el panel.', 'bot');
      return;
    } finally {
      if (!signal.aborted) enviar.disabled = false;
    }
  }
  if (/\b(clave|contrasena|password)\b/.test(pregunta) && /\b(otro|otra|ajena|tercero)\b/.test(pregunta)) {
    if (capacidades.resetUserPassword) orientar('restablecer-contrasena-usuario');
    else agregarMensaje('Solo Administración puede restablecer la contraseña de otra cuenta.', 'bot');
    return;
  }
  if (/\b(aprobar|aprueba|asignar|asigna|mover|mueve|gestionar|rechazar)\b/.test(pregunta) && /\b(afiliados?|solicitudes|solicitud|subdirectiva|cedulas?|\d{5,})\b/.test(pregunta)) {
    if (pregunta.includes('rechazar')) {
      if (capacidades.rejectAffiliates) {
        agregarMensaje('Abre Administración y elige Rechazar en la fila de la solicitud pendiente.', 'bot');
        agregarAccionDestino({ destino: { tipo: 'vista', id: 'administracion' } });
      } else agregarMensaje('Solo Administración y Secretaría General pueden rechazar una solicitud.', 'bot');
    } else if (capacidades.manageAffiliates) orientar('gestionar-afiliados');
    else agregarMensaje('La gestión de solicitudes requiere un perfil autorizado. Puedes consultar tu perfil en Mis datos.', 'bot');
    return;
  }
  if (/\b(clave|contrasena|password|foto|avatar)\b/.test(pregunta) && /\b(cambi\w*|actualiz\w*|modific\w*|subir)\b/.test(pregunta)) {
    orientar('actualizar-mis-datos');
    return;
  }
  if ((/\b(informes?|reportes?)\b/.test(pregunta) || /\b(cuantos|total de|cantidad de) afiliados\b/.test(pregunta)) && !/\b(documento|biblioteca)\b/.test(pregunta)) {
    if (capacidades.viewReports) {
      if (/subdirectivas?/.test(pregunta)) informeSelect.value = 'afiliados_por_subdirectiva';
      else if (/institucion|sede/.test(pregunta)) {
        informeSelect.value = 'afiliados_por_institucion_sede';
        agrupacionSelect.value = /sede/.test(pregunta) ? 'sede' : 'institucion';
      } else if (/aprobaciones.*mes/.test(pregunta)) informeSelect.value = 'aprobaciones_por_mes';
      else if (/estado|cuantos|cantidad|total/.test(pregunta)) informeSelect.value = 'afiliados_por_estado';
      actualizarFiltrosInforme();
      const estadoPedido = pregunta.match(/\b(pendiente|aprobado|rechazado|retirado)s?\b/);
      if (estadoPedido && !estadoSelect.closest('.chatbot-filtro').hidden) estadoSelect.value = estadoPedido[1];
      agregarMensaje('Elige el informe y sus filtros para consultar las cifras del padrón.', 'bot');
      if (panelInformes.hidden) consultarInformes.click();
    } else agregarMensaje('Los informes del padrón requieren un perfil autorizado.', 'bot');
    return;
  }
  if (/\b(confirmar|confirmo|retirar|retiro|cancelar)\b/.test(pregunta) && /\basistencia\b/.test(pregunta) &&
      !/\b(ya|quien|quienes|cuantos)\b/.test(pregunta)) {
    orientar('calendario');
    return;
  }
  if (responderSobreAfiliacion(texto, pregunta, seguimientoAfiliacion)) {
    conversandoDeAfiliacion = true;
    return;
  }
  const ayuda = buscarAyuda(texto, CATALOGO_AYUDA_CHATBOT, capacidades);
  if (/^(ayuda|que puedes hacer|que puedo preguntar|en que me puedes ayudar)$/.test(pregunta)) {
    mostrarPreguntasSugeridas();
    return;
  }
  const esGuia = /^(como|donde|pasos|ayuda)\b/.test(pregunta);
  if (ayuda.estado === 'respuesta' && esGuia) {
    orientar(ayuda.entrada.id);
    return;
  }
  if (/\b(mi|mis) (datos|informacion|perfil|estado|correo|nombre|afiliacion|subdirectiva)\b/.test(pregunta)) {
    if (/\b(edit\w*|actualiz\w*|cambi\w*|modific\w*)\b/.test(pregunta)) orientar('actualizar-mis-datos');
    else mostrarDatosPropios();
    return;
  }
  enviar.disabled = true;
  try {
    if (busquedaAnterior !== null && /^(y |solo |filtra |filtrar )?(de |por |para )?(grado|materia|matematicas|ingles|ciencias|espanol)\b/.test(pregunta)) {
      const temaAnterior = busquedaAnterior.replace(/\bgrado\s+\d{1,2}\b/gi, '');
      await buscarDocumentosSindicales((temaAnterior + ' ' + texto).trim());
    } else if (/\b(documentos?|biblioteca|archivos?|actas?|grados?|materias?|guias?|educativ[oa]s?)\b/.test(pregunta)) {
      await buscarDocumentosSindicales(texto);
    } else if (/\b(actividad|actividades|eventos?|asistencia|asistentes|confirmaron|asamblea|reunion|capacitacion)\b/.test(pregunta)) {
      await responderConsultaActividades(texto);
    } else if (ayuda.estado === 'respuesta') {
      orientar(ayuda.entrada.id);
    } else if (ayuda.estado === 'pendiente') {
      mostrarCanalSoporte('Para esta consulta necesitas ayuda del equipo SUTENS.');
    } else if (ayuda.estado === 'sugerencias' && pregunta.split(' ').length <= 3) {
      agregarMensaje('¿Cuál de estas opciones necesitas?', 'bot');
      mostrarSugerencias(ayuda.entradas);
    } else if (window.SUTENSChatbotDashboard?.iaDisponible?.() === false) {
      agregarMensaje('No encontré una respuesta verificada para esa pregunta. ¿Alguna de estas opciones se acerca a lo que necesitas?', 'bot');
      mostrarSugerencias(ayuda.entradas || obtenerPreguntasSugeridas(CATALOGO_AYUDA_CHATBOT, capacidades));
    } else {
      await responderConIA(texto, ayuda.entradas);
    }
  } finally {
    if (!signal.aborted) enviar.disabled = false;
  }
}

function mostrarActividad(evento, texto) {
  const fecha = new Date(evento.fecha_inicio);
  const fechaTexto = Number.isNaN(fecha.getTime()) ? 'Fecha por confirmar' : fecha.toLocaleString('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
  });
  let detalle = `${evento.titulo} · ${fechaTexto} · ${evento.estado}${evento.lugar ? ' · ' + evento.lugar : ''}.`;
  if (/asistencia|asistentes|confirm/i.test(texto)) {
    detalle += ` Asistencias confirmadas: ${Number(evento.asistentes_confirmados) || 0}. Tu asistencia: ${evento.mi_asistencia ? 'confirmada' : 'sin confirmar'}.`;
    if (/quien|quién|nombres/i.test(texto) && evento.asistentes?.length) {
      detalle += ' Confirmaron: ' + evento.asistentes.map((persona) => persona.nombre).join(', ') + '.';
    }
  }
  agregarMensaje(detalle, 'bot');
}

function extraerGrado(pregunta) {
  const numero = pregunta.match(/\b(?:grado\s+|para\s+)(\d{1,2})\b/)?.[1];
  if (numero) return numero;
  const ordinales = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'septimo', 'octavo', 'noveno', 'decimo', 'undecimo'];
  const indice = ordinales.findIndex((grado) => pregunta.split(' ').includes(grado));
  return indice < 0 ? '' : String(indice + 1);
}

async function responderTemaPanel(tema, texto, pregunta, capacidades, actividad, busqueda, signal) {
  if (tema.capacidad && !capacidades[tema.capacidad]) {
    agregarMensaje(tema.denegado, 'bot');
    return true;
  }
  if (tema.texto) {
    agregarMensaje(tema.texto, 'bot');
    if (tema.vista) agregarAccionDestino({ destino: { tipo: 'vista', id: tema.vista } });
    if (tema.pdf) {
      conversandoDeAfiliacion = true;
      agregarAccionDestino({ titulo: 'formulario oficial de afiliación (PDF)', destino: { tipo: 'ruta', ruta: informacionAfiliacion.formularioPdfUrl } });
    }
    recordarTurno(texto, tema.texto);
    return true;
  }
  switch (tema.accion) {
    case 'estado':
    case 'subdirectiva': {
      const datos = window.SUTENSChatbotDashboard?.obtenerDatosPropios?.();
      const esEstado = tema.accion === 'estado';
      const valor = esEstado ? datos?.estadoAfiliacion : datos?.subdirectiva;
      agregarMensaje(valor ? (esEstado ? 'Tu estado de afiliación es ' : 'Tu subdirectiva registrada es ') + valor + '.' :
        'Ese dato no aparece en tu perfil actual. Consulta Mis datos o solicita su revisión a Administración.', 'bot');
      break;
    }
    case 'permisos': {
      const funciones = ['consultar tu perfil', 'ver el calendario', 'buscar en las bibliotecas'];
      if (capacidades.manageAffiliates) funciones.push('gestionar afiliaciones');
      if (capacidades.viewReports) funciones.push('generar informes');
      if (capacidades.resetUserPassword) funciones.push('restablecer contraseñas de otras cuentas');
      agregarMensaje('Con tu perfil puedes ' + funciones.join(', ') + '.', 'bot');
      break;
    }
    case 'agenda':
      await responderConsultaActividades(texto);
      break;
    case 'detalle-evento':
      if (actividad) {
        ultimaActividad = actividad;
        mostrarActividad(actividad, /asistencia|confirm|inscrit|anotad|participa/.test(pregunta) ? 'asistencia' : texto);
      } else agregarMensaje('¿De qué actividad se trata? Puedes empezar con «¿Cuál es mi próxima actividad?» y luego consultar sus detalles.', 'bot');
      break;
    case 'material':
    case 'otro-grado': {
      const grado = extraerGrado(pregunta);
      const materia = pregunta.match(/\b(matematicas|ingles|ciencias|espanol|sociales|fisica|quimica|biologia)\b/)?.[1];
      if (tema.accion === 'otro-grado' && (!busqueda || !grado)) {
        agregarMensaje('¿Qué materia y grado quieres buscar?', 'bot');
        break;
      }
      const termino = materia ? 'guías ' + materia : tema.accion === 'otro-grado' ? busqueda.replace(/\b(?:grado\s+\d+|primaria)\b/g, '').trim() : texto;
      await buscarDocumentosSindicales([termino, grado && 'grado ' + grado, pregunta.includes('primaria') && 'primaria'].filter(Boolean).join(' '));
      break;
    }
    case 'actas':
    case 'estatutos':
      await buscarDocumentosSindicales(tema.accion === 'actas' ? 'acta asamblea' : 'estatutos');
      break;
    case 'informe-subdirectivas': {
      if (!capacidades.viewReports) {
        agregarMensaje('Los informes del padrón requieren un perfil autorizado.', 'bot');
        break;
      }
      if (!/\baprobad[oa]s?\b/.test(pregunta) || /\b(pendientes?|rechazad[oa]s?|retirad[oa]s?)\b/.test(pregunta)) return false;
      const solicitud = { informe: 'afiliados_por_subdirectiva', filtros: { estado: 'aprobado' } };
      const resultado = await apiFetch('/api/chatbot/informes', { method: 'POST', body: JSON.stringify(solicitud), signal });
      if (!signal.aborted) presentarInforme(resultado, solicitud);
      break;
    }
    default: return false;
  }
  return true;
}

async function responderConsultaActividades(texto) {
  const { signal } = conversacion;
  const pensando = document.createElement('p');
  pensando.className = 'chatbot-escribiendo';
  pensando.textContent = 'Revisando el calendario…';
  mensajes.append(pensando);
  contenido.scrollTop = contenido.scrollHeight;
  try {
    const eventos = await apiFetch('/api/calendario/eventos', { signal });
    if (signal.aborted) return;
    const ahora = Date.now();
    const consulta = normalizarPregunta(texto);
    const diaColombia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', dateStyle: 'short' });
    const diaPedido = /\bmanana\b/.test(consulta) ? diaColombia.format(ahora + 86400000)
      : /\bhoy\b/.test(consulta) ? diaColombia.format(ahora) : null;
    const mesPedido = /\beste mes\b/.test(consulta) ? diaColombia.format(ahora).slice(0, 7) : null;
    const tipoPedido = consulta.match(/\b(asamblea|reunion|capacitacion)(?:es|s)?\b/)?.[1];
    const preguntaPasado = /\b(realizad[ao]s?|pasad[ao]s?|anteriores|ya se (?:hicieron|realizaron)|ya ocurrieron)\b/.test(consulta);
    const preguntaProxima = /\b(proxim[ao]s?|siguiente|por realizar|se aproxima|pronto)\b/i.test(normalizarPregunta(texto));
    let visibles = (Array.isArray(eventos) ? eventos : []).filter((evento) => {
      const fecha = new Date(evento.fecha_inicio).getTime();
      if (!Number.isFinite(fecha)) return false;
      if (mesPedido && !diaColombia.format(fecha).startsWith(mesPedido)) return false;
      if (/\bprogramad[ao]s?\b/.test(consulta) && evento.estado !== 'programado') return false;
      if (diaPedido && (!Number.isFinite(fecha) || diaColombia.format(fecha) !== diaPedido)) return false;
      if (tipoPedido && !normalizarPregunta([evento.tipo, evento.titulo].join(' ')).includes(tipoPedido)) return false;
      if (preguntaPasado) return /realizad/i.test(texto) ? evento.estado === 'realizado' : fecha < ahora;
      if (preguntaProxima) return evento.estado === 'programado' && fecha >= ahora;
      return true;
    }).sort((a, b) => (new Date(a.fecha_inicio) - new Date(b.fecha_inicio)) * (preguntaPasado ? -1 : 1));
    if (preguntaProxima && !/proxim[oa]s/.test(normalizarPregunta(texto))) visibles = visibles.slice(0, 1);
    else visibles = visibles.slice(0, 5);
    pensando.remove();
    if (!visibles.length) {
      agregarMensaje(preguntaProxima
        ? 'No encontré actividades próximas disponibles para tu perfil en el calendario.'
        : 'No encontré actividades que coincidan en el calendario disponible para tu perfil.', 'bot');
      return;
    }
    agregarMensaje(`Encontré ${visibles.length} actividad${visibles.length === 1 ? '' : 'es'} en el calendario:`, 'bot');
    if (visibles.length === 1) ultimaActividad = visibles[0];
    visibles.forEach((evento) => mostrarActividad(evento, texto));
  } catch (error) {
    pensando.remove();
    if (signal.aborted) return;
    agregarMensaje(error.message || 'No pude consultar el calendario en este momento.', 'bot');
  }
  contenido.scrollTop = contenido.scrollHeight;
}

async function responderConIA(texto, sugerencias = []) {
  const { signal } = conversacion;
  const pensando = document.createElement('p');
  pensando.className = 'chatbot-escribiendo';
  pensando.textContent = 'Asistente SUTENS está pensando…';
  mensajes.append(pensando);
  contenido.scrollTop = contenido.scrollHeight;
  try {
    const resultado = await apiFetch('/api/chatbot/conversar', {
      method: 'POST',
      signal, body: JSON.stringify({ mensaje: texto, historial: historialModelo }),
    });
    pensando.remove();
    if (signal.aborted) return;
    if (!resultado.respuesta?.trim()) throw new Error('Respuesta vacía');
    agregarMensaje(resultado.respuesta, 'bot');
    recordarTurno(texto, resultado.respuesta);
  } catch (error) {
    pensando.remove();
    if (signal.aborted) return;
    const detalle = [400, 429, 502, 503, 504].includes(error?.status) && error.message !== 'Error en la petición'
      ? error.message : 'No pude obtener una respuesta. Puedes volver a enviar tu pregunta.';
    agregarMensaje(detalle, 'bot');
    if (sugerencias.length) mostrarSugerencias(sugerencias);
  }
  contenido.scrollTop = contenido.scrollHeight;
}

function mostrarPreguntasSugeridas() {
  const sugeridas = obtenerPreguntasSugeridas(CATALOGO_AYUDA_CHATBOT, capacidadesVisibles(), 3);
  agregarMensaje('Estas son algunas preguntas disponibles para tu perfil:', 'bot');
  mostrarSugerencias(sugeridas);
}

function alternar(abrir) {
  panel.hidden = !abrir;
  boton.setAttribute('aria-expanded', String(abrir));
  if (abrir) campo.focus();
  else boton.focus();
}

function limpiarConversacion() {
  conversacion.abort();
  conversacion = new AbortController();
  enviar.disabled = false;
  mensajes.replaceChildren();
  historialModelo = [];
  conversandoDeAfiliacion = false;
  ultimaActividad = null;
  ultimaBusqueda = null;
  mensajeInforme.textContent = '';
  panelInformes.hidden = true;
  consultarInformes.setAttribute('aria-expanded', 'false');
  agregarMensaje('Hola, soy el asistente virtual de SUTENS. Puedo orientarte sobre el sistema y la organización sindical. Escribe una pregunta o elige una opción.', 'bot');
}

boton.addEventListener('click', () => alternar(panel.hidden));
cerrar.addEventListener('click', () => alternar(false));
verSugerencias.addEventListener('click', mostrarPreguntasSugeridas);
consultarDatosPropios.addEventListener('click', mostrarDatosPropios);
gestionarAfiliados.addEventListener('click', () => orientar('gestionar-afiliados'));
buscarDocumentos.addEventListener('click', () => buscarDocumentosSindicales());
limpiar.addEventListener('click', limpiarConversacion);
consultarInformes.addEventListener('click', async () => {
  const { signal } = conversacion;
  if (!capacidadesVisibles().viewReports) return;
  panelInformes.hidden = !panelInformes.hidden;
  consultarInformes.setAttribute('aria-expanded', String(!panelInformes.hidden));
  if (panelInformes.hidden) return;
  contenido.scrollTop = 0;
  actualizarVisibilidadInformes();
  actualizarFiltrosInforme();
  try {
    await cargarFiltrosEstructurales();
  } catch (error) {
    if (signal.aborted) return;
    mensajeInforme.textContent = error.message || 'No se pudieron cargar los filtros organizacionales.';
  }
  if (!signal.aborted && !panelInformes.hidden) informeSelect.focus();
});
informeSelect.addEventListener('change', actualizarFiltrosInforme);
agrupacionSelect.addEventListener('change', actualizarFiltrosInforme);
restablecerFiltros.addEventListener('click', () => {
  informeSelect.selectedIndex = 0;
  estadoSelect.selectedIndex = 0;
  estadoSindicalSelect.selectedIndex = 0;
  agrupacionSelect.selectedIndex = 0;
  subdirectivaSelect.selectedIndex = 0;
  institucionSelect.selectedIndex = 0;
  sedeSelect.selectedIndex = 0;
  desdeInput.value = '';
  hastaInput.value = '';
  actualizarInstituciones();
  actualizarFiltrosInforme();
  informeSelect.focus();
});
subdirectivaSelect.addEventListener('change', actualizarInstituciones);
institucionSelect.addEventListener('change', actualizarSedes);
formularioInforme.addEventListener('submit', enviarInforme);
document.addEventListener('sutens:perfil-cargado', actualizarVisibilidadInformes);
document.addEventListener('sutens:perfil-cargado', actualizarDisponibilidadChatbot);
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (enviar.disabled) return;
  const texto = campo.value.trim();
  if (!texto) {
    agregarMensaje('Escribe una pregunta para buscar ayuda.', 'bot');
    campo.focus();
    return;
  }
  campo.value = '';
  campo.style.height = 'auto';
  responder(texto);
  campo.focus();
});
campo.addEventListener('input', () => {
  campo.style.height = 'auto';
  campo.style.height = `${Math.min(campo.scrollHeight, 144)}px`;
});
campo.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    formulario.requestSubmit();
  }
});
alternarAcciones.addEventListener('click', () => {
  acciones.hidden = !acciones.hidden;
  alternarAcciones.setAttribute('aria-expanded', String(!acciones.hidden));
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !panel.hidden) {
    evento.preventDefault();
    alternar(false);
  }
});

limpiarConversacion();
document.body.append(boton, tooltip, panel);
actualizarVisibilidadInformes();
actualizarDisponibilidadChatbot();
