import { CANAL_SOPORTE, CATALOGO_AYUDA_CHATBOT } from './chatbot-help-catalog.js';
import {
  buscarAyuda,
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
const accionBuscar = document.createElement('button');
accionBuscar.type = 'button';
accionBuscar.className = 'chatbot-accion';
accionBuscar.textContent = 'Ayuda del sistema';
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
acciones.append(accionBuscar, verSugerencias, consultarInformes, consultarDatosPropios);

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
const campo = document.createElement('input');
campo.type = 'text';
campo.maxLength = 500;
campo.placeholder = 'Pregunta sobre el sistema o el sindicato…';
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

panel.append(cabecera, acciones, contenido, formulario);

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
  const contenido = document.createElement('p');
  contenido.textContent = texto;
  burbuja.append(etiqueta, contenido);
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
    botonDestino.textContent = destino.id === 'biblioteca' ? 'Abrir biblioteca' : `Abrir ${entrada.titulo}`;
    botonDestino.addEventListener('click', () => {
      const navego = window.SUTENSChatbotDashboard?.navegarA?.(destino.id);
      if (!navego) agregarMensaje('Esa vista no está disponible para tu perfil.', 'bot');
    });
    mensajes.append(botonDestino);
    return;
  }

  const enlace = document.createElement('a');
  enlace.className = 'chatbot-enlace';
  enlace.href = destino.ruta;
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
  const subdirectivas = await apiFetch('/api/subdirectivas');
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
  pregunta.textContent = 'Descarga el informe y, si lo necesitas, sus datos asociados.';
  const nota = document.createElement('p');
  nota.className = 'chatbot-informes-ayuda';
  nota.textContent = 'La descarga vuelve a consultar los datos; los resultados pueden cambiar. Datos personales de uso restringido (Ley 1581 de 2012).';
  const estado = document.createElement('p');
  estado.className = 'chatbot-informes-mensaje';
  estado.setAttribute('role', 'status');
  opciones.append(pregunta, nota);

  for (const [formato, etiqueta] of [
    ['pdf', 'PDF · Informe y afiliados'],
    ['excel', 'Excel · Informe y afiliados'],
    ['correos', 'Excel · Solo correos'],
  ]) {
    const descargar = document.createElement('button');
    descargar.type = 'button';
    descargar.className = 'chatbot-accion';
    descargar.textContent = etiqueta;
    descargar.addEventListener('click', async () => {
      descargar.disabled = true;
      estado.textContent = 'Preparando descarga…';
      try {
        const archivo = await apiFetchArchivo('/api/chatbot/informes/exportar', {
          method: 'POST',
          body: JSON.stringify({ ...solicitud, formato }),
        });
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `sutens-${formato}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
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
  }
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
      body: JSON.stringify(solicitud),
    });
    mensajeInforme.textContent = '';
    ejecutarInforme.textContent = 'Generar informe';
    panelInformes.hidden = true;
    consultarInformes.setAttribute('aria-expanded', 'false');
    const encabezado = agregarMensaje(resultado.titulo, 'bot');
    crearTablaInforme(resultado);
    if (resultado.descargas_habilitadas === true && resultado.filas.length > 0) {
      mostrarOpcionesDescarga(solicitud);
    }
    encabezado.tabIndex = -1;
    encabezado.focus({ preventScroll: true });
    contenido.scrollTop += encabezado.getBoundingClientRect().top - contenido.getBoundingClientRect().top;
  } catch (error) {
    mensajeInforme.textContent = error.message || 'No se pudo generar el informe.';
    ejecutarInforme.textContent = 'Reintentar informe';
  } finally {
    ejecutarInforme.disabled = false;
  }
}

function responder(texto) {
  agregarMensaje(texto, 'usuario');
  if (/\b(mi|mis)\s+(datos|información|perfil|estado|correo|nombre|afiliación|subdirectiva)\b/i.test(texto)) {
    mostrarDatosPropios();
    return;
  }
  const resultado = buscarAyuda(texto, CATALOGO_AYUDA_CHATBOT, capacidadesVisibles());

  if (resultado.estado === 'demasiado-largo') {
    agregarMensaje('La pregunta debe tener máximo 500 caracteres.', 'bot');
    return;
  }
  if (resultado.estado === 'vacio') {
    agregarMensaje('Escribe una pregunta para buscar ayuda.', 'bot');
    return;
  }
  if (resultado.estado === 'pendiente') {
    mostrarCanalSoporte('No hay un procedimiento confirmado para ese tema.');
    return;
  }
  if (resultado.estado === 'respuesta') {
    agregarMensaje(resultado.entrada.respuesta, 'bot');
    agregarAccionDestino(resultado.entrada);
    return;
  }
  if (resultado.estado === 'sugerencias') {
    agregarMensaje('No encontré una coincidencia única. ¿Te refieres a alguna de estas opciones?', 'bot');
    mostrarSugerencias(resultado.entradas);
    return;
  }
  agregarMensaje('Lo siento, mis funciones se limitan al sistema de gestión y a la organización sindical. No encuentro una respuesta confirmada para esa consulta. Para información oficial sobre un proceso interno, contacta al equipo administrador. ¿Puedo ayudarte con algo del sistema o del sindicato?', 'bot');
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
  mensajes.replaceChildren();
  panelInformes.hidden = true;
  consultarInformes.setAttribute('aria-expanded', 'false');
  agregarMensaje('Hola, soy el asistente virtual de SUTENS. Puedo orientarte sobre el sistema y la organización sindical. Escribe una pregunta o elige una opción.', 'bot');
}

boton.addEventListener('click', () => alternar(panel.hidden));
cerrar.addEventListener('click', () => alternar(false));
accionBuscar.addEventListener('click', () => campo.focus());
verSugerencias.addEventListener('click', mostrarPreguntasSugeridas);
consultarDatosPropios.addEventListener('click', mostrarDatosPropios);
limpiar.addEventListener('click', limpiarConversacion);
consultarInformes.addEventListener('click', async () => {
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
    mensajeInforme.textContent = error.message || 'No se pudieron cargar los filtros organizacionales.';
  }
  informeSelect.focus();
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
  const texto = campo.value.trim();
  if (!texto) {
    agregarMensaje('Escribe una pregunta para buscar ayuda.', 'bot');
    campo.focus();
    return;
  }
  campo.value = '';
  responder(texto);
  campo.focus();
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
