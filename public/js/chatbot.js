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
const buscarDocumentos = document.createElement('button');
buscarDocumentos.type = 'button';
buscarDocumentos.className = 'chatbot-accion';
buscarDocumentos.textContent = 'Buscar documentos';
const cambiarContrasena = document.createElement('button');
cambiarContrasena.type = 'button';
cambiarContrasena.className = 'chatbot-accion';
cambiarContrasena.textContent = 'Cambiar contraseña';
const cambiarFoto = document.createElement('button');
cambiarFoto.type = 'button';
cambiarFoto.className = 'chatbot-accion';
cambiarFoto.textContent = 'Cambiar foto';
const gestionarAfiliados = document.createElement('button');
gestionarAfiliados.type = 'button';
gestionarAfiliados.className = 'chatbot-accion';
gestionarAfiliados.textContent = 'Gestionar afiliados';
gestionarAfiliados.hidden = true;
acciones.append(accionBuscar, verSugerencias, consultarInformes, consultarDatosPropios, buscarDocumentos, cambiarContrasena, cambiarFoto, gestionarAfiliados);
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

panel.append(cabecera, herramientas, contenido, formulario);

let historialModelo = [];

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

function agregarFormularioCuenta(tipo) {
  const datos = window.SUTENSChatbotDashboard?.obtenerDatosPropios?.();
  if (!datos) {
    agregarMensaje('No pude cargar tu perfil. Actualiza la página e inténtalo de nuevo.', 'bot');
    return;
  }
  const esContrasena = tipo === 'contrasena';
  agregarMensaje(esContrasena
    ? 'Completa este formulario privado. Tu contraseña no se añadirá a la conversación.'
    : 'Selecciona una foto JPG, PNG o WebP (máximo 4 MB).', 'bot');
  const form = document.createElement('form');
  form.className = 'chatbot-cuenta-form';
  form.setAttribute('aria-label', esContrasena ? 'Cambiar contraseña' : 'Cambiar foto de perfil');
  const controles = [];
  const crearCampo = (labelTexto, type, name, extra = {}) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'chatbot-cuenta-campo';
    wrapper.append(document.createTextNode(labelTexto));
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    Object.entries(extra).forEach(([key, value]) => input.setAttribute(key, value));
    input.required = true;
    wrapper.append(input);
    form.append(wrapper);
    controles.push(input);
    return input;
  };
  if (esContrasena) {
    crearCampo('Contraseña actual', 'password', 'contrasenaActual', { autocomplete: 'current-password' });
    crearCampo('Nueva contraseña (mínimo 8 caracteres)', 'password', 'nuevaContrasena', { minlength: '8', autocomplete: 'new-password' });
    crearCampo('Confirmar nueva contraseña', 'password', 'confirmarContrasena', { minlength: '8', autocomplete: 'new-password' });
  } else {
    crearCampo('Foto de perfil', 'file', 'foto', { accept: 'image/jpeg,image/png,image/webp' });
  }
  const estado = document.createElement('p');
  estado.className = 'chatbot-cuenta-estado';
  estado.setAttribute('role', 'status');
  estado.setAttribute('aria-live', 'polite');
  const guardar = document.createElement('button');
  guardar.type = 'submit';
  guardar.className = 'btn btn-primario';
  guardar.textContent = esContrasena ? 'Actualizar contraseña' : 'Actualizar foto';
  form.append(guardar, estado);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    estado.textContent = '';
    if (esContrasena && controles[1].value !== controles[2].value) {
      estado.textContent = 'Las contraseñas nuevas no coinciden.';
      controles[2].focus();
      return;
    }
    if (!esContrasena && (!controles[0].files?.[0] || controles[0].files[0].size > 4 * 1024 * 1024)) {
      estado.textContent = 'Selecciona una imagen válida de hasta 4 MB.';
      return;
    }
    guardar.disabled = true;
    estado.textContent = 'Guardando…';
    try {
      const payload = new FormData();
      payload.append('nombre1', datos.nombre1);
      payload.append('nombre2', datos.nombre2);
      payload.append('apellido1', datos.apellido1);
      payload.append('apellido2', datos.apellido2);
      payload.append('correo', datos.correo);
      if (esContrasena) {
        payload.append('contrasenaActual', controles[0].value);
        payload.append('nuevaContrasena', controles[1].value);
      } else {
        payload.append('foto', controles[0].files[0]);
      }
      await apiFetch('/api/auth/me', { method: 'PATCH', body: payload });
      form.reset();
      estado.textContent = esContrasena ? 'Contraseña actualizada correctamente.' : 'Foto de perfil actualizada correctamente.';
      document.dispatchEvent(new CustomEvent('sutens:perfil-actualizado'));
    } catch (error) {
      estado.textContent = error.message || 'No se pudo actualizar el perfil. Inténtalo de nuevo.';
      if (esContrasena) controles.forEach((control) => { control.value = ''; });
      else form.reset();
    } finally {
      guardar.disabled = false;
    }
  });
  mensajes.append(form);
  contenido.scrollTop = contenido.scrollHeight;
  controles[0].focus();
}

async function buscarDocumentosSindicales(consulta = '') {
  const normalizarBusqueda = (valor) => String(valor || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const termino = normalizarBusqueda(consulta.trim());
  try {
    const [sindicales, educativas] = await Promise.all([
      apiFetch('/api/biblioteca'),
      apiFetch('/api/biblioteca/educativa'),
    ]);
    const documentos = [
      ...sindicales.map((documento) => ({ ...documento, tipoBiblioteca: 'Sindical' })),
      ...educativas.map((documento) => ({ ...documento, tipoBiblioteca: 'Educativa' })),
    ];
    const resultados = documentos.filter((documento) => !termino ||
      normalizarBusqueda(`${documento.titulo || ''} ${documento.descripcion || ''} ${documento.categoria || ''} ${documento.materia || ''} ${documento.tipo_recurso || ''}`)
        .includes(termino)).slice(0, 5);
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
      tarjeta.append(encabezado, tipo, resumen);
      mensajes.append(tarjeta);
    });
    if (!termino && documentos.length > resultados.length) {
      agregarMensaje('Escribe palabras del título o tema para buscar entre los documentos disponibles.', 'bot');
    }
  } catch (error) {
    agregarMensaje(error.message || 'No pude consultar las bibliotecas de documentos. Inténtalo de nuevo.', 'bot');
  }
  contenido.scrollTop = contenido.scrollHeight;
}

function normalizarEtiqueta(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

function crearCampoGestion(form, texto, control) {
  const etiqueta = document.createElement('label');
  etiqueta.className = 'chatbot-cuenta-campo';
  etiqueta.append(document.createTextNode(texto), control);
  form.append(etiqueta);
}

async function mostrarGestionAfiliados(accion, textoOriginal = '') {
  if (!capacidadesVisibles().manageAffiliates) {
    agregarMensaje('No tienes permisos para gestionar afiliados desde el asistente.', 'bot');
    return;
  }
  const tipoAccion = ['aprobar', 'asignar', 'aprobar_y_asignar'].includes(accion?.tipo) ? accion.tipo : 'aprobar';
  const requiereAsignacion = tipoAccion !== 'aprobar';
  let estructura = [];
  let cargosDisponibles = [];
  let rolesLaborales = [];
  const form = document.createElement('form');
  form.className = 'chatbot-gestion-form';
  form.setAttribute('aria-label', 'Preparar gestión de afiliados');
  const tituloGestion = document.createElement('strong');
  tituloGestion.textContent = 'Preparar acción para afiliados';
  const ayuda = document.createElement('p');
  ayuda.className = 'chatbot-cuenta-estado';
  ayuda.textContent = 'Las cédulas se consultan dentro de SUTENS y no se envían al modelo. Revisa la vista previa antes de confirmar.';
  const cedulas = document.createElement('textarea');
  cedulas.rows = 3;
  cedulas.maxLength = 1200;
  cedulas.placeholder = 'Pega aquí cédulas separadas por espacios, comas o saltos de línea';
  cedulas.setAttribute('aria-label', 'Cédulas de afiliados');
  cedulas.value = (textoOriginal.match(/\b\d{5,20}\b/g) || []).join('\n');
  crearCampoGestion(form, 'Cédulas', cedulas);
  const controles = { subdirectiva: null, sede: null, cargo: null, rol: null };

  if (requiereAsignacion) {
    try {
      [estructura, cargosDisponibles, rolesLaborales] = await Promise.all([
        apiFetch('/api/subdirectivas'),
        apiFetch('/api/subdirectivas/cargos'),
        apiFetch('/api/subdirectivas/roles-laborales'),
      ]);
    } catch (error) {
      agregarMensaje(error.message || 'No se pudo cargar la estructura sindical.', 'bot');
      return;
    }
    const crearSelect = (etiqueta) => {
      const control = document.createElement('select');
      control.append(new Option(etiqueta, ''));
      return control;
    };
    controles.subdirectiva = crearSelect('Selecciona una subdirectiva…');
    estructura.forEach((sub) => controles.subdirectiva.append(new Option(sub.nombre, String(sub.id_subdirectiva))));
    const subSolicitada = estructura.find((sub) => normalizarEtiqueta(sub.nombre) === normalizarEtiqueta(accion.subdirectiva));
    if (subSolicitada) controles.subdirectiva.value = String(subSolicitada.id_subdirectiva);
    crearCampoGestion(form, 'Subdirectiva', controles.subdirectiva);
    controles.sede = crearSelect('Sin sede asignada');
    crearCampoGestion(form, 'Sede (opcional)', controles.sede);
    controles.cargo = crearSelect('Sin cargo en esta subdirectiva');
    crearCampoGestion(form, 'Cargo sindical', controles.cargo);
    controles.rol = crearSelect('Sin rol laboral/docente');
    rolesLaborales.forEach((rol) => controles.rol.append(new Option(rol.nombre, String(rol.id_rol_laboral))));
    const rolSolicitado = rolesLaborales.find((rol) => normalizarEtiqueta(rol.nombre) === normalizarEtiqueta(accion.rol_laboral));
    if (rolSolicitado) controles.rol.value = String(rolSolicitado.id_rol_laboral);
    crearCampoGestion(form, 'Rol laboral/docente', controles.rol);

    const actualizarDestino = () => {
      const sub = estructura.find((item) => String(item.id_subdirectiva) === controles.subdirectiva.value);
      const sedes = (sub?.instituciones || []).flatMap((institucion) => (institucion.sedes || []).map((sede) => ({
        id: sede.id_sede, nombre: `${institucion.nombre} · ${sede.nombre}`,
      })));
      const sedeAnterior = controles.sede.value;
      controles.sede.replaceChildren(new Option('Sin sede asignada', ''));
      sedes.forEach((sede) => controles.sede.append(new Option(sede.nombre, String(sede.id))));
      if (sedes.some((sede) => String(sede.id) === sedeAnterior)) controles.sede.value = sedeAnterior;
      const cargos = cargosDisponibles.filter((cargo) => sub?.es_principal
        ? cargo.es_departamental || cargo.nombre === 'Afiliado'
        : !cargo.es_departamental && cargo.nombre !== 'Afiliado');
      controles.cargo.replaceChildren(new Option(sub?.es_principal ? 'Selecciona un cargo…' : 'Sin cargo en esta subdirectiva', ''));
      cargos.forEach((cargo) => controles.cargo.append(new Option(cargo.nombre, String(cargo.id_cargo_sindical))));
      const cargoSolicitado = cargos.find((cargo) => normalizarEtiqueta(cargo.nombre) === normalizarEtiqueta(accion.cargo_sindical));
      if (cargoSolicitado) controles.cargo.value = String(cargoSolicitado.id_cargo_sindical);
      controles.cargo.required = Boolean(sub?.es_principal);
    };
    controles.subdirectiva.addEventListener('change', actualizarDestino);
    if (!controles.subdirectiva.value && estructura.length === 1) controles.subdirectiva.value = String(estructura[0].id_subdirectiva);
    actualizarDestino();
  }

  const resultadoLista = document.createElement('div');
  resultadoLista.className = 'chatbot-gestion-resultados';
  const estado = document.createElement('p');
  estado.className = 'chatbot-cuenta-estado';
  estado.setAttribute('role', 'status');
  estado.setAttribute('aria-live', 'polite');
  const revisar = document.createElement('button');
  revisar.type = 'button';
  revisar.className = 'btn btn-secundario';
  revisar.textContent = 'Consultar y revisar';
  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = 'btn btn-primario';
  confirmar.textContent = 'Confirmar cambios';
  confirmar.hidden = true;
  form.append(tituloGestion, ayuda, revisar, resultadoLista, estado, confirmar);
  mensajes.append(form);
  let afiliadosRevisados = [];
  const invalidarVistaPrevia = () => {
    if (!afiliadosRevisados.length) return;
    afiliadosRevisados = [];
    confirmar.hidden = true;
    estado.textContent = 'Cambiaste la lista o el destino. Vuelve a consultar y revisar antes de confirmar.';
  };
  form.addEventListener('input', invalidarVistaPrevia);
  form.addEventListener('change', invalidarVistaPrevia);

  revisar.addEventListener('click', async () => {
    const lista = cedulas.value.split(/[\s,;]+/).map((valor) => valor.replace(/\D/g, '')).filter(Boolean);
    if (!lista.length || lista.length > 50 || lista.some((cedula) => cedula.length < 5 || cedula.length > 20)) {
      estado.textContent = 'Indica entre 1 y 50 cédulas válidas (entre 5 y 20 dígitos cada una).';
      return;
    }
    if (new Set(lista).size !== lista.length) {
      estado.textContent = 'Hay cédulas repetidas. Elimínalas antes de continuar.';
      return;
    }
    revisar.disabled = true;
    confirmar.hidden = true;
    estado.textContent = 'Consultando en SUTENS…';
    const camposFormulario = [cedulas, ...Object.values(controles).filter(Boolean)];
    camposFormulario.forEach((control) => { control.disabled = true; });
    try {
      const preview = await apiFetch('/api/chatbot/afiliados/previsualizar', {
        method: 'POST', body: JSON.stringify({ cedulas: lista }),
      });
      afiliadosRevisados = preview.afiliados || [];
      resultadoLista.replaceChildren();
      afiliadosRevisados.forEach((afiliado) => {
        const fila = document.createElement('p');
        fila.textContent = `${afiliado.nombre || 'No encontrado'} · ${afiliado.cedula_mascarada} · ${afiliado.estado || 'No registrado'}${afiliado.subdirectiva ? ` · ${afiliado.subdirectiva}` : ''}`;
        resultadoLista.append(fila);
      });
      const sub = estructura.find((item) => String(item.id_subdirectiva) === controles.subdirectiva?.value);
      const destinoValido = !requiereAsignacion || (sub && (!sub.es_principal || Boolean(controles.cargo.value)) &&
        Boolean(controles.sede.value) === Boolean(controles.rol.value));
      const elegibles = afiliadosRevisados.filter((afiliado) => {
        if (!afiliado.id_afiliado) return false;
        if (tipoAccion === 'aprobar') return afiliado.estado === 'pendiente';
        if (tipoAccion === 'asignar') return afiliado.estado === 'aprobado';
        return ['pendiente', 'aprobado'].includes(afiliado.estado);
      });
      estado.textContent = destinoValido
        ? `${elegibles.length} de ${afiliadosRevisados.length} afiliado(s) podría(n) procesarse. Revisa los estados y el destino antes de confirmar.`
        : 'Completa un destino válido. Para asignar un rol laboral debes elegir también una sede, y viceversa.';
      confirmar.hidden = !destinoValido || elegibles.length === 0;
    } catch (error) {
      estado.textContent = error.message || 'No se pudo preparar la vista previa.';
    } finally {
      camposFormulario.forEach((control) => { control.disabled = false; });
      revisar.disabled = false;
    }
    contenido.scrollTop = contenido.scrollHeight;
  });

  confirmar.addEventListener('click', async () => {
    const sub = estructura.find((item) => String(item.id_subdirectiva) === controles.subdirectiva?.value);
    if (requiereAsignacion && (!sub || (sub.es_principal && !controles.cargo.value) ||
        Boolean(controles.sede.value) !== Boolean(controles.rol.value))) {
      estado.textContent = 'Revisa subdirectiva, cargo y pareja sede/rol laboral antes de confirmar.';
      return;
    }
    const total = afiliadosRevisados.filter((afiliado) => afiliado.id_afiliado && (
      tipoAccion === 'aprobar' ? afiliado.estado === 'pendiente' :
        tipoAccion === 'asignar' ? afiliado.estado === 'aprobado' : ['pendiente', 'aprobado'].includes(afiliado.estado)
    )).length;
    const accionTexto = tipoAccion === 'aprobar' ? 'aprobar' : tipoAccion === 'asignar' ? 'asignar o mover' : 'aprobar y asignar';
    if (!window.confirm(`¿Confirmas ${accionTexto} ${total} afiliado(s)${sub ? ` a ${sub.nombre}` : ''}?`)) return;
    const asignacionConfirmada = requiereAsignacion ? {
      id_subdirectiva: controles.subdirectiva.value,
      id_sede: controles.sede.value,
      id_rol_laboral: controles.rol.value,
      id_cargo_sindical: controles.cargo.value,
    } : null;
    revisar.disabled = true;
    confirmar.disabled = true;
    [cedulas, ...Object.values(controles).filter(Boolean)].forEach((control) => { control.disabled = true; });
    estado.textContent = 'Aplicando los cambios autorizados…';
    const resultados = [];
    for (const afiliado of afiliadosRevisados) {
      if (!afiliado.id_afiliado) {
        resultados.push(`${afiliado.cedula_mascarada}: no encontrado`);
        continue;
      }
      try {
        let estadoAfiliacion = afiliado.estado;
        if (['aprobar', 'aprobar_y_asignar'].includes(tipoAccion) && estadoAfiliacion === 'pendiente') {
          await apiFetch(`/api/afiliados/${afiliado.id_afiliado}/estado`, {
            method: 'PATCH', body: JSON.stringify({ estado: 'aprobado' }),
          });
          estadoAfiliacion = 'aprobado';
        } else if (tipoAccion === 'aprobar' && estadoAfiliacion !== 'pendiente') {
          resultados.push(`${afiliado.nombre}: omitido (${estadoAfiliacion})`);
          continue;
        }
        if (requiereAsignacion) {
          if (estadoAfiliacion !== 'aprobado') {
            resultados.push(`${afiliado.nombre}: requiere solicitud aprobada`);
            continue;
          }
          await apiFetch(`/api/afiliados/${afiliado.id_afiliado}/asignacion`, {
            method: 'PATCH',
            body: JSON.stringify(asignacionConfirmada),
          });
        }
        resultados.push(`${afiliado.nombre}: completado`);
      } catch (error) {
        resultados.push(`${afiliado.nombre || afiliado.cedula_mascarada}: ${error.message || 'no se pudo completar'}`);
      }
    }
    const listaResultados = document.createElement('ul');
    resultados.forEach((resultado) => {
      const item = document.createElement('li');
      item.textContent = resultado;
      listaResultados.append(item);
    });
    resultadoLista.replaceChildren(listaResultados);
    estado.textContent = 'Proceso terminado. Revisa cada resultado; puede haber operaciones parciales.';
    document.dispatchEvent(new CustomEvent('sutens:afiliados-actualizados'));
    confirmar.hidden = true;
    confirmar.disabled = false;
    revisar.disabled = false;
    [cedulas, ...Object.values(controles).filter(Boolean)].forEach((control) => { control.disabled = false; });
    contenido.scrollTop = contenido.scrollHeight;
  });
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
  if (esSaludo(texto)) {
    agregarMensaje('¡Hola! Soy el asistente virtual de SUTENS. Puedo ayudarte con documentos, tu perfil, consultas del sistema y preguntas sobre el sindicato. ¿Qué necesitas?', 'bot');
    return;
  }
  if (/\b(cambiar|actualizar|modificar)\b.{0,35}\b(contrasena|clave|password)\b|\b(contrasena|clave)\b.{0,35}\b(cambiar|actualizar|modificar)\b/i.test(texto)) {
    agregarFormularioCuenta('contrasena');
    return;
  }
  if (/\b(cambiar|actualizar|modificar|subir)\b.{0,35}\b(foto|imagen|avatar)\b|\b(foto|imagen|avatar)\b.{0,35}\b(cambiar|actualizar|modificar)\b/i.test(texto)) {
    agregarFormularioCuenta('foto');
    return;
  }
  if (/\b(documento|documentos|biblioteca|archivo|resumen)\b/i.test(texto)) {
    const busqueda = texto.replace(/\b(busca|buscar|encuentra|encontrar|documento|documentos|biblioteca|archivo|archivos|resumen|resume|resumir|resumes|de|del|la|el|un|una|sobre|acerca|por favor|mi sindicato|me|puedes|puede|quiero|necesito|dime|muestra|cual|que|hay|en)\b/gi, ' ').trim();
    void buscarDocumentosSindicales(busqueda);
    return;
  }
  if (/\b(mi|mis)\s+(datos|información|perfil|estado|correo|nombre|afiliación|subdirectiva)\b/i.test(texto)) {
    mostrarDatosPropios();
    return;
  }
  if (/\b(actividad|actividades|evento|eventos|asistencia|asistentes|confirmaron|confirmada)\b/i.test(texto)) {
    void responderConsultaActividades(texto);
    return;
  }
  void responderConIA(texto);
}

async function responderConsultaActividades(texto) {
  const pensando = document.createElement('p');
  pensando.className = 'chatbot-escribiendo';
  pensando.textContent = 'Revisando el calendario…';
  mensajes.append(pensando);
  contenido.scrollTop = contenido.scrollHeight;
  try {
    const eventos = await apiFetch('/api/calendario/eventos');
    const ahora = Date.now();
    const preguntaPasado = /\b(realizad[ao]s?|pasad[ao]s?|anteriores|ya se hicieron|ya se realizaron)\b/i.test(texto);
    const preguntaProxima = /\b(próxim[ao]s?|siguiente|por realizar|se aproxima|pronto)\b/i.test(texto);
    let visibles = (Array.isArray(eventos) ? eventos : []).filter((evento) => {
      const fecha = new Date(evento.fecha_inicio).getTime();
      if (preguntaPasado) return evento.estado === 'realizado' || fecha < ahora;
      if (preguntaProxima) return evento.estado === 'programado' && fecha >= ahora;
      return true;
    });
    if (preguntaProxima) visibles = visibles.slice(0, 1);
    else visibles = visibles.slice(0, 5);
    pensando.remove();
    if (!visibles.length) {
      agregarMensaje(preguntaProxima
        ? 'No encontré actividades próximas disponibles para tu perfil en el calendario.'
        : 'No encontré actividades disponibles para tu perfil en el calendario.', 'bot');
      return;
    }
    agregarMensaje(`Encontré ${visibles.length} actividad${visibles.length === 1 ? '' : 'es'} en el calendario:`, 'bot');
    visibles.forEach((evento) => {
      const fecha = new Date(evento.fecha_inicio);
      const fechaTexto = Number.isNaN(fecha.getTime()) ? 'Fecha por confirmar' : fecha.toLocaleString('es-CO', {
        dateStyle: 'medium', timeStyle: 'short',
      });
      const asistentes = Array.isArray(evento.asistentes) ? evento.asistentes.map((persona) => persona.nombre).filter(Boolean) : [];
      let detalle = `${evento.titulo} · ${fechaTexto}${evento.lugar ? ` · ${evento.lugar}` : ''}.`;
      if (/\b(quién(?:es)?|quienes|asistencia|asistentes|confirmaron|confirmada)\b/i.test(texto)) {
        detalle += asistentes.length
          ? ` Confirmaron asistencia: ${asistentes.join(', ')}.`
          : ' Aún no hay asistentes confirmados.';
      }
      agregarMensaje(detalle, 'bot');
    });
  } catch (error) {
    pensando.remove();
    agregarMensaje(error.message || 'No pude consultar el calendario en este momento.', 'bot');
  }
  contenido.scrollTop = contenido.scrollHeight;
}

async function responderConIA(texto) {
  const pensando = document.createElement('p');
  pensando.className = 'chatbot-escribiendo';
  pensando.textContent = 'Asistente SUTENS está pensando…';
  mensajes.append(pensando);
  contenido.scrollTop = contenido.scrollHeight;
  try {
    const resultado = await apiFetch('/api/chatbot/conversar', {
      method: 'POST',
      body: JSON.stringify({ mensaje: texto, historial: historialModelo }),
    });
    pensando.remove();
    if (resultado.respuesta) agregarMensaje(resultado.respuesta, 'bot');
    historialModelo.push({ role: 'user', content: texto }, { role: 'assistant', content: resultado.respuesta || '' });
    historialModelo = historialModelo.slice(-6);
    if (resultado.accion && capacidadesVisibles().manageAffiliates) {
      await mostrarGestionAfiliados(resultado.accion, texto);
    } else if (resultado.accion) {
      agregarMensaje('Para proteger los datos de afiliados, esa operación solo está disponible para Administración y Directiva Departamental.', 'bot');
    }
  } catch (error) {
    pensando.remove();
    if (/todavía no está configurada/i.test(error.message)) {
      const respuestaLocal = buscarAyuda(texto, CATALOGO_AYUDA_CHATBOT, capacidadesVisibles());
      if (respuestaLocal.estado === 'respuesta') {
        agregarMensaje(respuestaLocal.entrada.respuesta, 'bot');
        agregarAccionDestino(respuestaLocal.entrada);
      } else if (capacidadesVisibles().manageAffiliates && /\b(aprueba|aprobar|asigna|asignar|mueve|mover|cambia|cambiar)\b/i.test(texto)) {
        agregarMensaje('La conexión inteligente aún no está configurada. Puedes preparar la acción desde Gestionar afiliados.', 'bot');
      } else {
        agregarMensaje('La conexión inteligente aún no está configurada. Puedes usar las acciones disponibles en la barra del asistente.', 'bot');
      }
    } else {
      agregarMensaje(error.message || 'No pude responder en este momento. Inténtalo de nuevo.', 'bot');
    }
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
  mensajes.replaceChildren();
  historialModelo = [];
  panelInformes.hidden = true;
  consultarInformes.setAttribute('aria-expanded', 'false');
  agregarMensaje('Hola, soy el asistente virtual de SUTENS. Puedo orientarte sobre el sistema y la organización sindical. Escribe una pregunta o elige una opción.', 'bot');
}

boton.addEventListener('click', () => alternar(panel.hidden));
cerrar.addEventListener('click', () => alternar(false));
accionBuscar.addEventListener('click', () => campo.focus());
verSugerencias.addEventListener('click', mostrarPreguntasSugeridas);
consultarDatosPropios.addEventListener('click', mostrarDatosPropios);
gestionarAfiliados.addEventListener('click', () => mostrarGestionAfiliados({ tipo: 'aprobar' }));
buscarDocumentos.addEventListener('click', () => buscarDocumentosSindicales());
cambiarContrasena.addEventListener('click', () => agregarFormularioCuenta('contrasena'));
cambiarFoto.addEventListener('click', () => agregarFormularioCuenta('foto'));
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
