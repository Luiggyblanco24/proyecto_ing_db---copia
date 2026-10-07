// Panel de usuarios

let esAdmin = false;
let puedeVerAfiliados = false;
let esDirectivaPrincipal = false;
let esSecretarioGeneral = false;
let puedeGestionarAfiliados = false;
let modoAdministracion = 'pendientes';
let puedeCrearEvento = false;
let puedeSubirBiblioteca = false;
let puedePublicarDocumentos = false;
let perfilActual = null;
let eventosActuales = [];
let documentosBibliotecaActuales = [];
let materiasEducativas = [];
let rolesDisponibles = [];
let usuariosActuales = [];
let subdirectivasDisponibles = [];
let cargosSindicales = [];
let rolesLaboralesDisponibles = [];
let afiliadosVisiblesActuales = [];
const afiliadosSeleccionados = new Map();

// ---------- Utilidades ----------
function escapeHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caracter]);
}

function badgeEstado(estado) {
  const map = {
    pendiente: 'amarillo',
    aprobado: 'verde',
    rechazado: 'rojo',
    retirado: 'rojo',
  };
  return `<span class="badge ${map[estado] || 'azul'}">${escapeHTML(estado)}</span>`;
}

function badgeRoles(roles) {
  if (!roles || roles.length === 0) return '<span class="badge azul">Sin rol</span>';
  return roles
    .map((r) => `<span class="badge azul">${escapeHTML(r)}</span>`)
    .join(' ');
}

function controlEstadoSindical(afiliado) {
  const estado = afiliado.estado_sindical || 'activo';
  const tieneAsignacion = Boolean(afiliado.id_subdirectiva);
  return `<select aria-label="Estado sindical" ${afiliado.estado === 'aprobado' ? '' : 'disabled'}
      onchange="cambiarEstadoSindical(${Number(afiliado.id_afiliado)}, this.value)">
    <option value="activo" ${estado === 'activo' ? 'selected' : ''} ${tieneAsignacion ? '' : 'disabled'}>Activo</option>
    <option value="inactivo" ${estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
  </select>`;
}

function nombreCompleto(a) {
  return [a.nombre1, a.nombre2, a.apellido1, a.apellido2].filter(Boolean).join(' ');
}

function parametrosFiltros(scope) {
  const parametros = new URLSearchParams();
  const busqueda = document.getElementById(`filtro-${scope}-q`).value.trim();
  const cargo = document.getElementById(`filtro-${scope}-cargo`).value;
  const rol = document.getElementById(`filtro-${scope}-rol`).value;
  const subdirectiva = document.getElementById(`filtro-${scope}-subdirectiva`).value;
  if (busqueda) parametros.set('q', busqueda);
  if (cargo) parametros.set('cargo', cargo);
  if (rol) parametros.set('rol', rol);
  if (subdirectiva) parametros.set('id_subdirectiva', subdirectiva);
  if (scope === 'global') {
    const estado = modoAdministracion === 'pendientes'
      ? 'pendiente'
      : document.getElementById('filtro-global-estado').value;
    const estadoSindical = document.getElementById('filtro-global-sindical').value;
    if (estado) parametros.set('estado', estado);
    if (estadoSindical) parametros.set('estado_sindical', estadoSindical);
  }
  return parametros;
}

function poblarFiltrosAfiliados() {
  for (const scope of ['local', 'global']) {
    const selectorCargo = document.getElementById(`filtro-${scope}-cargo`);
    const selectorRol = document.getElementById(`filtro-${scope}-rol`);
    const selectorSubdirectiva = document.getElementById(`filtro-${scope}-subdirectiva`);
    if (!selectorCargo || !selectorRol || !selectorSubdirectiva) continue;
    selectorCargo.innerHTML = '<option value="">Todos los cargos</option>' + cargosSindicales.map((cargo) =>
      `<option value="${escapeHTML(cargo.nombre)}">${escapeHTML(cargo.nombre)}</option>`
    ).join('');
    selectorRol.innerHTML = '<option value="">Todos los roles educativos</option>' + rolesLaboralesDisponibles.map((rol) =>
      `<option value="${escapeHTML(rol.nombre)}">${escapeHTML(rol.nombre)}</option>`
    ).join('');
    selectorSubdirectiva.innerHTML = '<option value="">Todas las subdirectivas</option>' + subdirectivasDisponibles.map((subdirectiva) =>
      `<option value="${escapeHTML(subdirectiva.id_subdirectiva)}">${escapeHTML(subdirectiva.nombre)}</option>`
    ).join('');
  }
}

function actualizarSeleccion(scope) {
  const toolbar = document.getElementById(`acciones-${scope === 'global' ? 'globales' : 'locales'}`);
  const contador = document.getElementById(`contador-${scope}`);
  if (!toolbar || !contador) return;
  const cantidad = [...afiliadosSeleccionados.values()].filter((seleccion) => seleccion.scope === scope).length;
  toolbar.hidden = cantidad === 0;
  contador.textContent = `${cantidad} seleccionados`;
}

function limpiarSeleccion(scope) {
  for (const [id, seleccion] of afiliadosSeleccionados) {
    if (seleccion.scope === scope) afiliadosSeleccionados.delete(id);
  }
  const seleccionarTodos = document.querySelector(`.seleccionar-todos[data-scope="${scope}"]`);
  if (seleccionarTodos) seleccionarTodos.checked = false;
  actualizarSeleccion(scope);
}

function renderizarCasilla(afiliado, scope) {
  const id = String(afiliado.id_afiliado);
  const seleccion = afiliadosSeleccionados.get(id);
  return `<input class="selector-afiliado" type="checkbox" data-scope="${scope}" value="${escapeHTML(id)}" aria-label="Seleccionar ${escapeHTML(nombreCompleto(afiliado))}" ${seleccion?.scope === scope ? 'checked' : ''} />`;
}

async function copiarCorreosSeleccionados(scope) {
  const correos = [...new Set([...afiliadosSeleccionados.values()]
    .filter((seleccion) => seleccion.scope === scope)
    .map((seleccion) => seleccion.afiliado.correo)
    .filter(Boolean))];
  if (correos.length === 0) throw new Error('Los afiliados seleccionados no tienen correos registrados');
  await navigator.clipboard.writeText(correos.join('; '));
  return correos.length;
}

function redactarCorreoSeleccionados(scope) {
  const correos = [...new Set([...afiliadosSeleccionados.values()]
    .filter((seleccion) => seleccion.scope === scope)
    .map((seleccion) => seleccion.afiliado.correo)
    .filter(Boolean))];
  if (correos.length === 0) throw new Error('Los afiliados seleccionados no tienen correos registrados');
  if (correos.length > 50) throw new Error('Selecciona como máximo 50 destinatarios para abrir el correo');
  window.location.href = `mailto:?bcc=${encodeURIComponent(correos.join(','))}`;
  return correos.length;
}

async function descargarAfiliados(formato, scope) {
  const ruta = scope === 'global' ? '/api/afiliados/exportar' : '/api/membresia/exportar';
  const queryString = parametrosFiltros(scope).toString();
  const respuesta = await fetch(`${ruta}?${queryString}${queryString ? '&' : ''}formato=${formato}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo descargar el archivo');
  }
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `afiliados-sutens.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
  enlace.click();
  URL.revokeObjectURL(url);
}

// ---------- Cargar perfil del usuario ----------
async function cargarPerfil() {
  try {
    const perfil = await apiFetch('/api/auth/me');
    perfilActual = perfil;
    document.getElementById('nombre-usuario').textContent =
      `Hola, ${[perfil.nombre1, perfil.apellido1].filter(Boolean).join(' ')}`;
    document.getElementById('titulo-bienvenida').textContent =
      `Bienvenido, ${[perfil.nombre1, perfil.apellido1].filter(Boolean).join(' ')}`;
    document.getElementById('cuenta-nombre1').value = perfil.nombre1 || '';
    document.getElementById('cuenta-nombre2').value = perfil.nombre2 || '';
    document.getElementById('cuenta-apellido1').value = perfil.apellido1 || '';
    document.getElementById('cuenta-apellido2').value = perfil.apellido2 || '';
    document.getElementById('cuenta-correo').value = perfil.correo || '';
    document.getElementById('btn-guardar-foto').hidden = true;
    document.getElementById('avatar-iniciales').textContent =
      [perfil.nombre1, perfil.apellido1].filter(Boolean).map((parte) => parte[0]).join('').toLocaleUpperCase('es');
    const avatares = [document.getElementById('avatar-topbar'), document.getElementById('avatar-cuenta')];
    avatares.forEach((avatar) => {
      if (perfil.foto_perfil_url) {
        avatar.src = perfil.foto_perfil_url;
        avatar.hidden = false;
      } else {
        avatar.removeAttribute('src');
        avatar.hidden = true;
      }
    });
    document.getElementById('avatar-iniciales').hidden = Boolean(perfil.foto_perfil_url);

    esAdmin = perfil.roles.includes('Administrador SUTENS');
    const cargosPrincipales = [
      'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General', 'Tesorero General',
    ];
    esDirectivaPrincipal = cargosPrincipales.includes(perfil.cargo_departamental);
    esSecretarioGeneral = perfil.cargo_departamental === 'Secretario General';
    puedePublicarDocumentos = esAdmin || (
      perfil.estado === 'aprobado' && perfil.estado_sindical === 'activo' && esDirectivaPrincipal
    );
    puedeGestionarAfiliados = esAdmin || esDirectivaPrincipal;
    document.getElementById('filtro-local-subdirectiva').hidden = !puedeGestionarAfiliados;
    puedeCrearEvento = esAdmin || esDirectivaPrincipal || (
      perfil.estado === 'aprobado' && perfil.estado_sindical === 'activo' &&
      ['Presidente', 'Vicepresidente', 'Secretario', 'Fiscal', 'Tesorero'].includes(perfil.cargo_sindical)
    );
    puedeSubirBiblioteca = esAdmin || (
      perfil.estado === 'aprobado' && perfil.estado_sindical === 'activo' &&
      ['Presidente', 'Vicepresidente', 'Secretario', 'Fiscal', 'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General']
        .some((cargo) => [perfil.cargo_sindical, perfil.cargo_departamental].includes(cargo))
    );
    puedeVerAfiliados = puedeGestionarAfiliados ||
      ['Presidente', 'Vicepresidente', 'Secretario', 'Fiscal'].includes(perfil.cargo_sindical);
    document.getElementById('roles-usuario').innerHTML = badgeRoles(perfil.roles);
    document.getElementById('detalle-bienvenida').textContent = [
      perfil.cargo_departamental,
      perfil.cargo_departamental === perfil.cargo_sindical ? null : perfil.cargo_sindical,
      perfil.rol_laboral,
      perfil.subdirectiva,
      perfil.institucion,
      perfil.sede,
    ].filter(Boolean).join(' · ') || 'Afiliado SUTENS';

    if (esAdmin) document.getElementById('btn-registrar').style.display = 'inline-block';
    if (esAdmin || esDirectivaPrincipal) {
      document.getElementById('btn-crear-subdirectiva').style.display = 'inline-block';
      document.getElementById('btn-crear-institucion').style.display = 'inline-block';
      document.getElementById('btn-crear-sede').style.display = 'inline-block';
    }
    document.getElementById('btn-crear-evento').hidden = !puedeCrearEvento;
    document.getElementById('campo-evento-subdirectiva').hidden = !(esAdmin || esDirectivaPrincipal);
    document.getElementById('evento-subdirectiva').required = esAdmin || esDirectivaPrincipal;
    document.getElementById('btn-subir-documento').hidden = !puedeSubirBiblioteca;
    document.getElementById('campo-documento-subdirectiva').hidden = !esAdmin;
    document.getElementById('nav-administracion').hidden = !(esAdmin || esDirectivaPrincipal);
    if (puedeVerAfiliados) document.getElementById('nav-afiliados').hidden = false;
    renderizarOpcionesInicio();
    if (perfil.estado === 'aprobado') await cargarEstadisticasAfiliacion();
  } catch (err) {
    // Token inválido o expirado
    cerrarSesion();
  }
}

async function cargarEstadisticasAfiliacion() {
  const seccion = document.getElementById('estadisticas-afiliacion');
  const contenido = document.getElementById('contenido-estadisticas-afiliacion');
  const mensaje = document.getElementById('mensaje-estadisticas-afiliacion');
  seccion.hidden = false;
  mensaje.textContent = '';
  mensaje.className = 'mensaje';

  try {
    const estadisticas = await apiFetch('/api/membresia/estadisticas');
    document.getElementById('titulo-estadisticas-afiliacion').textContent =
      estadisticas.alcance === 'departamental' ? 'Afiliación departamental' : estadisticas.nombre_subdirectiva;
    contenido.replaceChildren();

    const tarjetaTotal = document.createElement('article');
    tarjetaTotal.className = 'estadistica-total';
    const etiquetaTotal = document.createElement('span');
    etiquetaTotal.className = 'sobrelinea';
    etiquetaTotal.textContent = estadisticas.alcance === 'departamental'
      ? 'AFILIADOS APROBADOS EN SUTENS'
      : 'AFILIADOS APROBADOS EN TU SUBDIRECTIVA';
    const valorTotal = document.createElement('strong');
    valorTotal.textContent = Number(estadisticas.total_afiliados).toLocaleString('es-CO');
    tarjetaTotal.append(etiquetaTotal, valorTotal);
    contenido.append(tarjetaTotal);

    if (estadisticas.alcance !== 'departamental') return;

    const distribucion = document.createElement('section');
    distribucion.className = 'estadistica-panel';
    const tituloDistribucion = document.createElement('h3');
    tituloDistribucion.textContent = 'Afiliados por subdirectiva';
    const listaSubdirectivas = document.createElement('div');
    listaSubdirectivas.className = 'lista-estadisticas-subdirectivas';
    estadisticas.subdirectivas.forEach((subdirectiva) => {
      const fila = document.createElement('div');
      fila.className = 'fila-estadistica-subdirectiva';
      const nombre = document.createElement('span');
      nombre.textContent = subdirectiva.nombre;
      const total = document.createElement('strong');
      total.textContent = Number(subdirectiva.total_afiliados).toLocaleString('es-CO');
      fila.append(nombre, total);
      listaSubdirectivas.append(fila);
    });
    if (estadisticas.subdirectivas.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'texto-estadistica-vacia';
      vacio.textContent = 'Aún no hay subdirectivas registradas.';
      listaSubdirectivas.append(vacio);
    }
    distribucion.append(tituloDistribucion, listaSubdirectivas);

    const crecimiento = document.createElement('section');
    crecimiento.className = 'estadistica-panel';
    const tituloCrecimiento = document.createElement('h3');
    tituloCrecimiento.textContent = 'Crecimiento de los últimos 6 meses';
    const listaCrecimiento = document.createElement('div');
    listaCrecimiento.className = 'lista-crecimiento-mensual';
    const maximoAltas = Math.max(1, ...estadisticas.crecimiento.map((mes) => Number(mes.nuevas_altas)));
    estadisticas.crecimiento.forEach((mes) => {
      const fila = document.createElement('div');
      fila.className = 'fila-crecimiento-mensual';
      const etiqueta = document.createElement('span');
      etiqueta.textContent = mes.etiqueta;
      const barraFondo = document.createElement('span');
      barraFondo.className = 'barra-crecimiento-fondo';
      const barra = document.createElement('span');
      barra.className = 'barra-crecimiento';
      barra.style.width = `${(Number(mes.nuevas_altas) / maximoAltas) * 100}%`;
      barraFondo.append(barra);
      const valor = document.createElement('strong');
      valor.textContent = `+${Number(mes.nuevas_altas).toLocaleString('es-CO')}`;
      const detalle = document.createElement('span');
      detalle.className = 'detalle-crecimiento';
      if (mes.porcentaje !== null) {
        const porcentaje = Number(mes.porcentaje);
        detalle.textContent = `${porcentaje > 0 ? '+' : ''}${porcentaje.toLocaleString('es-CO')}% vs. mes anterior`;
      } else {
        detalle.textContent = 'altas aprobadas';
      }
      fila.append(etiqueta, barraFondo, valor, detalle);
      listaCrecimiento.append(fila);
    });
    crecimiento.append(tituloCrecimiento, listaCrecimiento);
    const paneles = document.createElement('div');
    paneles.className = 'paneles-estadisticas';
    paneles.append(distribucion, crecimiento);
    contenido.append(paneles);
  } catch (error) {
    contenido.replaceChildren();
    mensaje.textContent = error.message;
    mensaje.className = 'mensaje error visible';
  }
}

function renderizarOpcionesInicio() {
  const opciones = [
    { vista: 'vista-directorio', titulo: 'Estructura sindical', detalle: 'Subdirectivas, instituciones y sedes' },
    { vista: 'vista-calendario', titulo: 'Calendario', detalle: 'Próximas actividades sindicales' },
    { vista: 'vista-biblioteca', titulo: 'Biblioteca sindical', detalle: 'Actas, permisos, decretos y más' },
  ];
  if (esAdmin || esDirectivaPrincipal || puedeVerAfiliados) {
    opciones.push({
      vista: 'vista-afiliados',
      titulo: esAdmin || esDirectivaPrincipal ? 'Afiliados' : 'Afiliados de mi subdirectiva',
      detalle: esAdmin || esDirectivaPrincipal ? 'Consulta el padrón general' : perfilActual?.subdirectiva || 'Consulta tu subdirectiva',
    });
  }
  if (esAdmin || esDirectivaPrincipal) {
    opciones.push({ vista: 'vista-administracion', titulo: 'Administración', detalle: 'Gestión sindical' });
  }

  document.getElementById('opciones-inicio').innerHTML = opciones.map((opcion) => `
    <button class="opcion-inicio" data-vista="${opcion.vista}">
      <span class="sobrelinea">SUTENS</span>
      <strong>${escapeHTML(opcion.titulo)}</strong>
      <span>${escapeHTML(opcion.detalle)}</span>
    </button>
  `).join('');
  document.querySelectorAll('#opciones-inicio [data-vista]').forEach((boton) => {
    boton.addEventListener('click', () => mostrarVista(boton.dataset.vista));
  });
}

async function mostrarVista(idVista) {
  document.querySelectorAll('.vista').forEach((vista) => {
    vista.hidden = vista.id !== idVista;
  });
  document.querySelectorAll('.nav-vista').forEach((boton) => {
    boton.classList.toggle('activo', boton.dataset.vista === idVista);
  });
  document.getElementById('nav-vistas').classList.remove('abierto');
  document.getElementById('btn-menu-movil').setAttribute('aria-expanded', 'false');
  document.getElementById('btn-menu-movil').setAttribute('aria-label', 'Abrir menú de navegación');

  if (idVista === 'vista-directorio') await cargarDirectorio();
  if (idVista === 'vista-calendario') await cargarEventos();
  if (idVista === 'vista-biblioteca') await cargarBiblioteca();
  if (idVista === 'vista-biblioteca-educativa') await cargarBibliotecaEducativa();
  if (idVista === 'vista-afiliados') await cargarAfiliadosVisibles();
  if (idVista === 'vista-administracion' && puedeGestionarAfiliados) await cargarUsuarios();
}

function puedeMarcarEventoRealizado(evento) {
  if (esAdmin || esDirectivaPrincipal) return true;
  return puedeCrearEvento && !evento.es_principal &&
    String(perfilActual?.id_subdirectiva) === String(evento.id_subdirectiva);
}

async function cargarEventos() {
  const lista = document.getElementById('lista-eventos');
  const mensaje = document.getElementById('mensaje-calendario');
  mensaje.className = 'mensaje';
  try {
    eventosActuales = await apiFetch('/api/calendario/eventos');
    const siguiente = eventosActuales.find((evento) =>
      evento.estado === 'programado' && new Date(evento.fecha_inicio) >= new Date()
    );
    const recordatorio = document.getElementById('recordatorio-evento');
    recordatorio.hidden = !siguiente;
    if (siguiente) {
      recordatorio.dataset.idEvento = String(siguiente.id_evento);
      document.getElementById('recordatorio-titulo').textContent = siguiente.titulo;
      document.getElementById('recordatorio-detalle').textContent =
        `${new Date(siguiente.fecha_inicio).toLocaleString('es-CO')} · ${siguiente.subdirectiva || 'Directiva Departamental'}`;
    }

    if (eventosActuales.length === 0) {
      lista.innerHTML = '<p class="vacio-eventos">No hay actividades programadas para tu alcance.</p>';
      return;
    }
    lista.innerHTML = eventosActuales.map((evento) => {
      const fechaInicio = new Date(evento.fecha_inicio);
      const fechaFin = evento.fecha_fin ? new Date(evento.fecha_fin) : null;
      const inicioPasado = fechaInicio <= new Date();
      const puedeConfirmar = perfilActual?.estado === 'aprobado' &&
        evento.estado === 'programado' && !inicioPasado;
      const puedeCompletar = evento.estado === 'programado' && inicioPasado && puedeMarcarEventoRealizado(evento);
      const puedeCancelar = evento.estado === 'programado' && !inicioPasado && puedeMarcarEventoRealizado(evento);
      const etiquetasEstado = {
        programado: ['amarillo', 'Programada'],
        realizado: ['verde', 'Realizada'],
        cancelado: ['rojo', 'Cancelada'],
      };
      const [claseEstado, textoEstado] = etiquetasEstado[evento.estado] || etiquetasEstado.programado;
      return `
        <article id="evento-${Number(evento.id_evento)}" class="evento-item" tabindex="-1">
          <div class="evento-fecha">
            <span>${escapeHTML(fechaInicio.toLocaleDateString('es-CO', { weekday: 'short' }))}</span>
            <strong>${escapeHTML(fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }))}</strong>
            <time datetime="${escapeHTML(fechaInicio.toISOString())}">${escapeHTML(fechaInicio.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))}</time>
          </div>
          <div class="evento-contenido">
            <div class="evento-titulo">
              <h3>${escapeHTML(evento.titulo)}</h3>
              <span class="badge azul">${escapeHTML(evento.tipo)}</span>
              <span class="badge ${claseEstado}">${textoEstado}</span>
            </div>
            <p>${escapeHTML(evento.descripcion || 'Sin detalles adicionales')}</p>
            <span class="evento-metadata">${escapeHTML(evento.subdirectiva || 'Directiva Departamental')}${evento.lugar ? ` · ${escapeHTML(evento.lugar)}` : ''}${fechaFin ? ` · Hasta ${escapeHTML(fechaFin.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))}` : ''}</span>
            ${evento.motivo_cancelacion ? `<p class="motivo-cancelacion">Motivo de cancelación: ${escapeHTML(evento.motivo_cancelacion)}</p>` : ''}
            <div class="evento-acciones">
              <span class="evento-asistencia">${Number(evento.asistentes_confirmados) || 0} asistencia${Number(evento.asistentes_confirmados) === 1 ? '' : 's'} confirmada${Number(evento.asistentes_confirmados) === 1 ? '' : 's'}</span>
              <details class="evento-asistentes">
                <summary>Ver quiénes confirmaron (${Number(evento.asistentes_confirmados) || 0})</summary>
                ${evento.asistentes?.length
                  ? `<ul>${evento.asistentes.map((asistente) => `<li>${escapeHTML(asistente.nombre)}</li>`).join('')}</ul>`
                  : '<p>Aún no hay confirmaciones.</p>'}
              </details>
              ${puedeConfirmar ? `<button class="btn btn-secundario btn-sm btn-asistencia" type="button" data-id-evento="${Number(evento.id_evento)}" data-confirmada="${!evento.mi_asistencia}">${evento.mi_asistencia ? 'Cancelar asistencia' : 'Confirmar asistencia'}</button>` : ''}
              ${puedeCompletar ? `<button class="btn btn-verde btn-sm btn-evento-realizado" type="button" data-id-evento="${Number(evento.id_evento)}">Marcar como realizada</button>` : ''}
              ${puedeCancelar ? `<button class="btn btn-rojo btn-sm btn-evento-cancelar" type="button" data-id-evento="${Number(evento.id_evento)}">Cancelar actividad</button>` : ''}
              ${evento.estado === 'realizado' && evento.mi_asistencia ? '<span class="badge verde">Asistencia confirmada</span>' : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
    document.querySelectorAll('.btn-asistencia').forEach((boton) => {
      boton.addEventListener('click', () => cambiarAsistenciaEvento(boton));
    });
    document.querySelectorAll('.btn-evento-realizado').forEach((boton) => {
      boton.addEventListener('click', () => completarEvento(boton));
    });
    document.querySelectorAll('.btn-evento-cancelar').forEach((boton) => {
      boton.addEventListener('click', () => cancelarEventoCalendario(boton));
    });
  } catch (err) {
    lista.innerHTML = '';
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    document.getElementById('recordatorio-evento').hidden = true;
  }
}

async function abrirEventoRecordado() {
  const recordatorio = document.getElementById('recordatorio-evento');
  const idEvento = recordatorio.dataset.idEvento;
  if (!idEvento) return;

  await mostrarVista('vista-calendario');
  const tarjeta = document.getElementById(`evento-${Number(idEvento)}`);
  if (!tarjeta) return;

  tarjeta.classList.remove('evento-destacado');
  void tarjeta.offsetWidth;
  tarjeta.classList.add('evento-destacado');
  tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
  tarjeta.focus({ preventScroll: true });
}

async function cambiarAsistenciaEvento(boton) {
  const mensaje = document.getElementById('mensaje-calendario');
  boton.disabled = true;
  try {
    const resultado = await apiFetch(`/api/calendario/eventos/${boton.dataset.idEvento}/asistencia`, {
      method: 'PATCH',
      body: JSON.stringify({ confirmada: boton.dataset.confirmada === 'true' }),
    });
    await cargarEventos();
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    boton.disabled = false;
  }
}

async function completarEvento(boton) {
  const mensaje = document.getElementById('mensaje-calendario');
  boton.disabled = true;
  try {
    const resultado = await apiFetch(`/api/calendario/eventos/${boton.dataset.idEvento}/realizado`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    await cargarEventos();
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    boton.disabled = false;
  }
}

async function cancelarEventoCalendario(boton) {
  if (!window.confirm('¿Cancelar esta actividad? Las personas que pueden verla verán el estado cancelado.')) return;
  const mensaje = document.getElementById('mensaje-calendario');
  boton.disabled = true;
  try {
    const resultado = await apiFetch(`/api/calendario/eventos/${boton.dataset.idEvento}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    await cargarEventos();
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    boton.disabled = false;
  }
}

async function cargarCategoriasBiblioteca() {
  const categorias = await apiFetch('/api/biblioteca/categorias');
  const opciones = categorias.map((categoria) =>
    `<option value="${escapeHTML(categoria.nombre)}">${escapeHTML(categoria.nombre)}</option>`
  ).join('');
  document.getElementById('documento-categoria').innerHTML = categorias.map((categoria) =>
    `<option value="${escapeHTML(categoria.id_categoria)}">${escapeHTML(categoria.nombre)}</option>`
  ).join('');
  document.getElementById('filtro-biblioteca-categoria').innerHTML =
    '<option value="">Todas las categorías</option>' + opciones;
}

async function descargarDocumento(idDocumento, titulo) {
  const respuesta = await fetch(`/api/biblioteca/${idDocumento}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo descargar el documento');
  }
  const archivo = await respuesta.blob();
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${titulo.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
  enlace.click();
  URL.revokeObjectURL(url);
}

async function cargarBiblioteca() {
  const lista = document.getElementById('lista-biblioteca');
  const mensaje = document.getElementById('mensaje-biblioteca');
  mensaje.className = 'mensaje';
  try {
    const documentos = await apiFetch('/api/biblioteca');
    documentosBibliotecaActuales = documentos;
    const consulta = document.getElementById('filtro-biblioteca-q').value.trim().toLocaleLowerCase('es');
    const categoria = document.getElementById('filtro-biblioteca-categoria').value;
    const visibles = documentos.filter((documento) => {
      const coincideCategoria = !categoria || documento.categoria === categoria;
      const texto = `${documento.titulo} ${documento.descripcion || ''} ${documento.categoria}`.toLocaleLowerCase('es');
      return coincideCategoria && (!consulta || texto.includes(consulta));
    });
    if (visibles.length === 0) {
      lista.innerHTML = '<p class="vacio-eventos">No hay documentos que coincidan con la búsqueda.</p>';
      return;
    }
    lista.innerHTML = visibles.map((documento) => {
      const extension = documento.archivo_url
        ? `.${documento.archivo_url.split('.').pop().toLocaleLowerCase('en')}`
        : '';
      return `
        <article class="documento-item">
          <div class="documento-icono" aria-hidden="true">${extension ? extension.slice(1).toLocaleUpperCase('es') : 'DOC'}</div>
          <div class="documento-contenido">
            <div class="documento-titulo">
              <h3>${escapeHTML(documento.titulo)}</h3>
              <span class="badge azul">${escapeHTML(documento.categoria)}</span>
            </div>
            <p>${escapeHTML(documento.descripcion || 'Sin descripción adicional')}</p>
            <span class="evento-metadata">${escapeHTML(documento.subdirectiva || 'Sindicato')}
              · ${escapeHTML(new Date(documento.fecha_publicacion).toLocaleString('es-CO'))}
              ${documento.cargado_por ? `· Cargado por ${escapeHTML(documento.cargado_por)}` : ''}</span>
          </div>
          <div class="documento-acciones">
            ${extension ? `<button class="btn btn-secundario btn-sm btn-descargar-documento" type="button"
              data-id-documento="${Number(documento.id_documento)}"
              data-titulo="${escapeHTML(documento.titulo)}" data-extension="${escapeHTML(extension)}">Descargar</button>` : '<span class="ayuda-campo">Sin archivo adjunto</span>'}
            ${documento.puede_publicar ? `
              <label class="control-publicacion control-publicacion-lista">
                <input class="toggle-publicacion-documento" type="checkbox"
                  data-id-documento="${Number(documento.id_documento)}" ${documento.es_publico ? 'checked' : ''} />
                <span>${documento.es_publico ? 'Visible en Comunicaciones' : 'Oculta en Comunicaciones'}</span>
              </label>
            ` : ''}
            ${documento.puede_editar ? `
              <button class="btn btn-secundario btn-sm btn-editar-documento" type="button" data-id-documento="${Number(documento.id_documento)}">Editar</button>
              <button class="btn btn-rojo btn-sm btn-eliminar-documento" type="button" data-id-documento="${Number(documento.id_documento)}">Eliminar</button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
    lista.querySelectorAll('.btn-descargar-documento').forEach((boton) => {
      boton.addEventListener('click', async () => {
        boton.disabled = true;
        try {
          await descargarDocumento(boton.dataset.idDocumento, boton.dataset.titulo);
        } catch (err) {
          mensaje.textContent = err.message;
          mensaje.className = 'mensaje error';
        } finally {
          boton.disabled = false;
        }
      });
    });
    lista.querySelectorAll('.btn-editar-documento').forEach((boton) => {
      boton.addEventListener('click', () => prepararEdicionDocumento(boton.dataset.idDocumento));
    });
    lista.querySelectorAll('.btn-eliminar-documento').forEach((boton) => {
      boton.addEventListener('click', () => eliminarDocumentoBiblioteca(boton.dataset.idDocumento));
    });
    lista.querySelectorAll('.toggle-publicacion-documento').forEach((control) => {
      control.addEventListener('change', async () => {
        const estadoSolicitado = control.checked;
        control.disabled = true;
        try {
          const resultado = await apiFetch(`/api/biblioteca/${control.dataset.idDocumento}/publicacion`, {
            method: 'PATCH',
            body: JSON.stringify({ publico: estadoSolicitado }),
          });
          mensaje.textContent = resultado.mensaje;
          mensaje.className = 'mensaje exito';
          await cargarBiblioteca();
        } catch (err) {
          control.checked = !estadoSolicitado;
          mensaje.textContent = err.message;
          mensaje.className = 'mensaje error';
        } finally {
          control.disabled = false;
        }
      });
    });
  } catch (err) {
    lista.innerHTML = '';
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
}

async function cargarMateriasEducativas() {
  if (materiasEducativas.length > 0) return;
  materiasEducativas = await apiFetch('/api/biblioteca/educativa/materias');
  document.getElementById('material-educativo-materia').innerHTML = materiasEducativas
    .map((materia) => `<option value="${Number(materia.id_materia)}">${escapeHTML(materia.nombre)}</option>`)
    .join('');
}

async function descargarMaterialEducativo(idDocumento, titulo) {
  const respuesta = await fetch(`/api/biblioteca/educativa/${idDocumento}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo descargar el material educativo');
  }
  const archivo = await respuesta.blob();
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${titulo.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function crearTarjetaMaterialEducativo(documento) {
  const extension = documento.archivo_url
    ? `.${documento.archivo_url.split('.').pop().toLocaleLowerCase('en')}`
    : '';
  return `
    <article class="documento-item material-educativo-item">
      <div class="documento-icono" aria-hidden="true">${escapeHTML(extension.slice(1).toLocaleUpperCase('es') || 'DOC')}</div>
      <div class="documento-contenido">
        <div class="documento-titulo">
          <h4>${escapeHTML(documento.titulo)}</h4>
          <span class="badge verde">${documento.tipo_recurso === 'guia' ? 'Guía' : 'Metodología de apoyo'}</span>
          ${documento.grado ? `<span class="badge azul">${escapeHTML(documento.grado)}</span>` : ''}
        </div>
        ${documento.materia ? `<p class="material-educativo-materia">${escapeHTML(documento.materia)}</p>` : ''}
        <p>${escapeHTML(documento.descripcion || 'Sin descripción adicional')}</p>
        <span class="evento-metadata">
          ${documento.cargado_por ? `Compartido por ${escapeHTML(documento.cargado_por)} · ` : ''}
          ${escapeHTML(new Date(documento.fecha_publicacion).toLocaleDateString('es-CO'))}
        </span>
      </div>
      <div class="documento-acciones">
        ${extension ? `<button class="btn btn-secundario btn-sm btn-descargar-material" type="button"
          data-id-documento="${Number(documento.id_documento)}"
          data-titulo="${escapeHTML(documento.titulo)}" data-extension="${escapeHTML(extension)}">Descargar</button>` : ''}
        ${documento.puede_eliminar ? `<button class="btn btn-rojo btn-sm btn-eliminar-material"
          type="button" data-id-documento="${Number(documento.id_documento)}">Eliminar</button>` : ''}
      </div>
    </article>
  `;
}

async function cargarBibliotecaEducativa() {
  const lista = document.getElementById('lista-biblioteca-educativa');
  const mensaje = document.getElementById('mensaje-biblioteca-educativa');
  mensaje.className = 'mensaje';
  try {
    await cargarMateriasEducativas();
    const documentos = await apiFetch('/api/biblioteca/educativa');
    lista.replaceChildren();
    const guias = documentos.filter((documento) => documento.tipo_recurso === 'guia');
    const metodologias = documentos.filter((documento) => documento.tipo_recurso === 'metodologia_apoyo');

    if (guias.length === 0 && metodologias.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'vacio-eventos';
      vacio.textContent = 'Todavía no hay materiales educativos. Comparte una guía o una metodología de apoyo.';
      lista.append(vacio);
      return;
    }

    const gruposGrado = new Map();
    guias.forEach((guia) => {
      const grado = guia.grado || 'Sin grado especificado';
      if (!gruposGrado.has(grado)) gruposGrado.set(grado, new Map());
      const gruposMateria = gruposGrado.get(grado);
      if (!gruposMateria.has(guia.materia || 'Sin materia')) gruposMateria.set(guia.materia || 'Sin materia', []);
      gruposMateria.get(guia.materia || 'Sin materia').push(guia);
    });

    for (const [grado, gruposMateria] of gruposGrado) {
      const seccionGrado = document.createElement('section');
      seccionGrado.className = 'grupo-biblioteca-educativa';
      const tituloGrado = document.createElement('h3');
      tituloGrado.textContent = `Grado ${grado}`;
      seccionGrado.append(tituloGrado);
      for (const [materia, recursos] of gruposMateria) {
        const grupoMateria = document.createElement('section');
        grupoMateria.className = 'subgrupo-biblioteca-educativa';
        const tituloMateria = document.createElement('h4');
        tituloMateria.textContent = materia;
        const listaGuias = document.createElement('div');
        listaGuias.className = 'lista-documentos';
        listaGuias.innerHTML = recursos.map(crearTarjetaMaterialEducativo).join('');
        grupoMateria.append(tituloMateria, listaGuias);
        seccionGrado.append(grupoMateria);
      }
      lista.append(seccionGrado);
    }

    if (metodologias.length > 0) {
      const seccionMetodologias = document.createElement('section');
      seccionMetodologias.className = 'grupo-biblioteca-educativa';
      const tituloMetodologias = document.createElement('h3');
      tituloMetodologias.textContent = 'Metodologías de apoyo para docentes';
      const listaMetodologias = document.createElement('div');
      listaMetodologias.className = 'lista-documentos';
      listaMetodologias.innerHTML = metodologias.map(crearTarjetaMaterialEducativo).join('');
      seccionMetodologias.append(tituloMetodologias, listaMetodologias);
      lista.append(seccionMetodologias);
    }

    lista.querySelectorAll('.btn-descargar-material').forEach((boton) => {
      boton.addEventListener('click', async () => {
        boton.disabled = true;
        try {
          await descargarMaterialEducativo(boton.dataset.idDocumento, boton.dataset.titulo);
        } catch (error) {
          mensaje.textContent = error.message;
          mensaje.className = 'mensaje error';
        } finally {
          boton.disabled = false;
        }
      });
    });
    lista.querySelectorAll('.btn-eliminar-material').forEach((boton) => {
      boton.addEventListener('click', async () => {
        if (!window.confirm('¿Eliminar este material de la biblioteca educativa?')) return;
        boton.disabled = true;
        try {
          const resultado = await apiFetch(`/api/biblioteca/educativa/${boton.dataset.idDocumento}`, { method: 'DELETE' });
          mensaje.textContent = resultado.mensaje;
          mensaje.className = 'mensaje exito';
          await cargarBibliotecaEducativa();
        } catch (error) {
          mensaje.textContent = error.message;
          mensaje.className = 'mensaje error';
        } finally {
          boton.disabled = false;
        }
      });
    });
  } catch (error) {
    lista.replaceChildren();
    mensaje.textContent = error.message;
    mensaje.className = 'mensaje error';
  }
}

function actualizarCamposClasificacionEducativa() {
  const guia = document.getElementById('material-educativo-tipo').value === 'guia';
  document.getElementById('campos-clasificacion-guia').hidden = !guia;
  document.getElementById('material-educativo-grado').required = guia;
  document.getElementById('material-educativo-materia').required = guia;
}

function configurarFormularioBiblioteca(modo) {
  const formulario = document.getElementById('form-biblioteca');
  const archivo = document.getElementById('documento-archivo');
  const editando = modo === 'editar';
  document.getElementById('titulo-form-biblioteca').textContent = editando
    ? 'Editar documento sindical'
    : 'Agregar documento sindical';
  document.getElementById('btn-guardar-documento').textContent = editando
    ? 'Guardar cambios'
    : 'Publicar documento';
  document.getElementById('label-documento-archivo').textContent = editando
    ? 'Reemplazar archivo (opcional)'
    : 'Archivo PDF o Word *';
  document.getElementById('ayuda-documento-archivo').textContent = editando
    ? 'Deja vacío para conservar el archivo actual. PDF, DOC o DOCX, máximo 20 MB.'
    : 'PDF, DOC o DOCX, máximo 20 MB';
  archivo.required = !editando;
  document.getElementById('campo-documento-subdirectiva').hidden = editando || !esAdmin;
  actualizarControlPublicacionDocumento();
  formulario.hidden = false;
}

function actualizarControlPublicacionDocumento() {
  const contenedor = document.getElementById('campo-documento-publico');
  contenedor.hidden = !puedePublicarDocumentos;
}

function ocultarFormularioBiblioteca() {
  const formulario = document.getElementById('form-biblioteca');
  formulario.reset();
  document.getElementById('documento-id').value = '';
  document.getElementById('documento-archivo').required = true;
  document.getElementById('titulo-form-biblioteca').textContent = 'Agregar documento sindical';
  document.getElementById('btn-guardar-documento').textContent = 'Publicar documento';
  document.getElementById('label-documento-archivo').textContent = 'Archivo PDF o Word *';
  document.getElementById('ayuda-documento-archivo').textContent = 'PDF, DOC o DOCX, máximo 20 MB';
  document.getElementById('documento-publico').checked = false;
  document.getElementById('campo-documento-publico').hidden = true;
  document.getElementById('campo-documento-subdirectiva').hidden = !esAdmin;
  formulario.hidden = true;
}

function prepararNuevoDocumento() {
  const formulario = document.getElementById('form-biblioteca');
  formulario.reset();
  document.getElementById('documento-id').value = '';
  configurarFormularioBiblioteca('nuevo');
}

function prepararEdicionDocumento(idDocumento) {
  const documento = documentosBibliotecaActuales.find((item) => String(item.id_documento) === String(idDocumento));
  if (!documento || !documento.puede_editar) return;
  const formulario = document.getElementById('form-biblioteca');
  formulario.reset();
  document.getElementById('documento-id').value = documento.id_documento;
  document.getElementById('documento-titulo').value = documento.titulo;
  document.getElementById('documento-descripcion').value = documento.descripcion || '';
  document.getElementById('documento-categoria').value = String(documento.id_categoria);
  document.getElementById('documento-publico').checked = Boolean(documento.es_publico);
  configurarFormularioBiblioteca('editar');
  formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function eliminarDocumentoBiblioteca(idDocumento) {
  const documento = documentosBibliotecaActuales.find((item) => String(item.id_documento) === String(idDocumento));
  if (!documento?.puede_editar || !window.confirm(`¿Eliminar “${documento.titulo}” de la biblioteca?`)) return;
  const mensaje = document.getElementById('mensaje-biblioteca');
  mensaje.className = 'mensaje';
  try {
    const resultado = await apiFetch(`/api/biblioteca/${idDocumento}`, { method: 'DELETE' });
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
    await cargarBiblioteca();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
}

async function cargarDirectorio() {
  const tbody = document.getElementById('cuerpo-directorio');
  const mensaje = document.getElementById('mensaje-directorio');
  mensaje.className = 'mensaje';
  try {
    const subdirectivas = await apiFetch('/api/subdirectivas');
    if (subdirectivas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">Aún no hay subdirectivas registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = subdirectivas.map((subdirectiva) => `
      <tr>
        <td>
          <div class="nombre-subdirectiva-directorio">
            <strong>${escapeHTML(subdirectiva.nombre)}</strong>
            ${subdirectiva.es_principal ? '<span class="badge azul">Principal</span>' : ''}
            ${puedeGestionarAfiliados ? `<button class="boton-icono-editar" type="button" data-renombrar="subdirectiva" data-id="${escapeHTML(subdirectiva.id_subdirectiva)}" data-nombre="${escapeHTML(subdirectiva.nombre)}" aria-label="Editar nombre de ${escapeHTML(subdirectiva.nombre)}" title="Editar subdirectiva"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>` : ''}
          </div>
        </td>
        <td>${subdirectiva.instituciones.length
          ? subdirectiva.instituciones.map((institucion) => `
            <section class="institucion-directorio">
              <div class="nombre-institucion-directorio">
                <strong>${escapeHTML(institucion.nombre)}</strong>
                ${puedeGestionarAfiliados ? `<button class="boton-icono-editar" type="button" data-renombrar="institucion" data-id="${escapeHTML(institucion.id_institucion)}" data-nombre="${escapeHTML(institucion.nombre)}" aria-label="Editar nombre de ${escapeHTML(institucion.nombre)}" title="Editar institución"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>` : ''}
              </div>
              <div class="sedes-directorio">${institucion.sedes.length
                ? institucion.sedes.map((sede) => `<span class="sede-directorio"><span class="sede-etiqueta">${escapeHTML(sede.nombre)}</span>${puedeGestionarAfiliados ? `<button class="boton-icono-editar" type="button" data-renombrar="sede" data-id="${escapeHTML(sede.id_sede)}" data-nombre="${escapeHTML(sede.nombre)}" aria-label="Editar nombre de ${escapeHTML(sede.nombre)}" title="Editar sede"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>` : ''}</span>`).join('')
                : '<span class="ayuda-campo">Sin sedes registradas</span>'}</div>
            </section>
          `).join('')
          : 'Sin instituciones educativas registradas'}</td>
      </tr>
    `).join('');
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    tbody.innerHTML = '';
  }
}

async function cargarAfiliadosVisibles() {
  const tbody = document.getElementById('cuerpo-afiliados');
  const mensaje = document.getElementById('mensaje-afiliados');
  document.getElementById('titulo-afiliados').textContent = esAdmin || esDirectivaPrincipal
    ? 'Afiliados del sindicato'
    : `Afiliados de ${perfilActual?.subdirectiva || 'mi subdirectiva'}`;
  mensaje.className = 'mensaje';
  try {
    const queryString = parametrosFiltros('local').toString();
    const afiliados = await apiFetch(`/api/membresia/afiliados?${queryString}`);
    afiliadosVisiblesActuales = afiliados;
    if (afiliados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">No hay afiliados que coincidan con los filtros.</td></tr>';
      return;
    }
    tbody.innerHTML = afiliados.map((afiliado) => `
      <tr>
        <td data-label="Seleccionar">${renderizarCasilla(afiliado, 'local')}</td>
        <td data-label="Nombre">${escapeHTML(nombreCompleto(afiliado))}</td>
        <td data-label="Cédula">${escapeHTML(afiliado.cedula)}</td>
        <td data-label="Correo">${escapeHTML(afiliado.correo || '—')}</td>
        <td data-label="Cargo sindical">${escapeHTML(afiliado.cargo_sindical || 'Sin cargo local')}</td>
        <td data-label="Institución educativa">${escapeHTML(afiliado.institucion || '—')}</td>
        <td data-label="Sede">${escapeHTML(afiliado.sede || '—')}</td>
        <td data-label="Rol en sede">${escapeHTML(afiliado.rol_laboral || 'Sin asignar')}</td>
        <td data-label="Estado sindical">${badgeEstado(afiliado.estado_sindical)}</td>
      </tr>
    `).join('');
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
    tbody.innerHTML = '';
  }
}

// ---------- Cargar lista de usuarios ----------
async function cargarUsuarios() {
  const tbody = document.getElementById('cuerpo-tabla');
  const busqueda = document.getElementById('filtro-global-q').value.trim();
  limpiarSeleccion('global');

  if (modoAdministracion === 'busqueda' && !busqueda) {
    usuariosActuales = [];
    tbody.innerHTML = '<tr><td colspan="14">Escribe un nombre o número de cédula para buscar un afiliado y actualizar sus datos.</td></tr>';
    return;
  }

  try {
    const queryString = parametrosFiltros('global').toString();
    const usuarios = await apiFetch(`/api/afiliados?${queryString}`);
    usuariosActuales = usuarios;

    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#6b7280;">No hay afiliados que coincidan con los filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = usuarios.map((a) => {
      const puedeAprobar = esAdmin || esSecretarioGeneral;
      const acciones = puedeGestionarAfiliados
        ? `<div class="acciones">
         ${a.estado === 'aprobado' ? `<button class="btn btn-secundario btn-sm" onclick="abrirModalAsignacion(${Number(a.id_afiliado)})">Asignación</button>` : ''}
         ${esAdmin && a.usuario ? `<button class="btn btn-secundario btn-sm" onclick="abrirModalRoles(${Number(a.id_afiliado)})">Actualizar roles</button>` : ''}
         ${puedeAprobar && a.estado === 'pendiente' ? `<button class="btn btn-verde btn-sm" onclick="cambiarEstado(${Number(a.id_afiliado)}, 'aprobado')">Aprobar</button>
             <button class="btn btn-rojo btn-sm" onclick="cambiarEstado(${Number(a.id_afiliado)}, 'rechazado')">Rechazar</button>` : ''}
           </div>`
        : '—';

      return `<tr>
        <td data-label="Seleccionar">${renderizarCasilla(a, 'global')}</td>
        <td data-label="Nombre">${escapeHTML(nombreCompleto(a))}</td>
        <td data-label="Cédula">${escapeHTML(a.cedula)}</td>
        <td data-label="Correo">${escapeHTML(a.correo || '—')}</td>
        <td data-label="Usuario">${escapeHTML(a.usuario || '—')}</td>
        <td data-label="Roles">${badgeRoles(a.roles)}</td>
        <td data-label="Subdirectiva">${escapeHTML(a.subdirectiva || '—')}</td>
        <td data-label="Cargo sindical">${escapeHTML(a.cargo_sindical || (a.cargo_departamental ? 'Sin cargo local' : '—'))}
          ${a.cargo_departamental ? `<small>Directiva Departamental: ${escapeHTML(a.cargo_departamental)}</small>` : ''}
        </td>
        <td data-label="Institución educativa">${escapeHTML(a.institucion || '—')}</td>
        <td data-label="Sede">${escapeHTML(a.sede || '—')}</td>
        <td data-label="Rol en sede">${escapeHTML(a.rol_laboral || 'Sin asignar')}</td>
        <td data-label="Solicitud">${badgeEstado(a.estado)}</td>
        <td data-label="Estado sindical">${controlEstadoSindical(a)}</td>
        <td data-label="Acciones">${acciones}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; color:#991b1b;">${escapeHTML(err.message)}</td></tr>`;
  }
}

function cambiarModoAdministracion(modo) {
  modoAdministracion = modo;
  const esBusqueda = modo === 'busqueda';
  const filtroEstado = document.getElementById('filtro-global-estado');
  const campoBusqueda = document.getElementById('filtro-global-q');
  const botonPendientes = document.getElementById('btn-modo-pendientes');
  const botonBusqueda = document.getElementById('btn-modo-busqueda');

  botonPendientes.classList.toggle('activo', !esBusqueda);
  botonPendientes.setAttribute('aria-pressed', String(!esBusqueda));
  botonBusqueda.classList.toggle('activo', esBusqueda);
  botonBusqueda.setAttribute('aria-pressed', String(esBusqueda));
  filtroEstado.hidden = !esBusqueda;
  filtroEstado.value = esBusqueda ? '' : 'pendiente';
  campoBusqueda.value = '';
  campoBusqueda.placeholder = esBusqueda
    ? 'Nombre o número de cédula'
    : 'Filtrar pendientes por nombre o cédula';
  document.getElementById('btn-buscar-global').textContent = esBusqueda
    ? 'Buscar afiliado'
    : 'Buscar solicitudes';
  document.getElementById('mensaje').className = 'mensaje';
  usuariosActuales = [];
  limpiarSeleccion('global');
  document.getElementById('cuerpo-tabla').innerHTML = esBusqueda
    ? '<tr><td colspan="14">Escribe un nombre o número de cédula para buscar un afiliado y actualizar sus datos.</td></tr>'
    : '<tr><td colspan="14">Carga las solicitudes pendientes para revisarlas.</td></tr>';
  if (!esBusqueda) cargarUsuarios();
}

async function cargarEstructuraSindical() {
  const [subdirectivas, cargos, rolesLaborales] = await Promise.all([
    apiFetch('/api/subdirectivas'),
    apiFetch('/api/subdirectivas/cargos'),
    apiFetch('/api/subdirectivas/roles-laborales'),
  ]);
  subdirectivasDisponibles = subdirectivas;
  cargosSindicales = cargos;
  rolesLaboralesDisponibles = rolesLaborales;
  poblarFiltrosAfiliados();
  poblarSelectSubdirectivas('asignacion-subdirectiva');
  const selectorEvento = document.getElementById('evento-subdirectiva');
  selectorEvento.innerHTML = subdirectivasDisponibles.map((subdirectiva) =>
    `<option value="${escapeHTML(subdirectiva.id_subdirectiva)}">${escapeHTML(subdirectiva.nombre)}</option>`
  ).join('');
  const subdirectivaInicial = esAdmin
    ? subdirectivasDisponibles.find((subdirectiva) => subdirectiva.es_principal)
    : subdirectivasDisponibles.find((subdirectiva) => String(subdirectiva.id_subdirectiva) === String(perfilActual?.id_subdirectiva));
  if (subdirectivaInicial) selectorEvento.value = String(subdirectivaInicial.id_subdirectiva);
}

function poblarSelectSubdirectivas(idSelect, seleccionado = '') {
  const select = document.getElementById(idSelect);
  select.innerHTML = '<option value="">Selecciona una subdirectiva...</option>' +
    subdirectivasDisponibles.map((subdirectiva) =>
      `<option value="${escapeHTML(subdirectiva.id_subdirectiva)}" ${String(subdirectiva.id_subdirectiva) === String(seleccionado) ? 'selected' : ''}>${escapeHTML(subdirectiva.nombre)}</option>`
    ).join('');
}

function sedesDeSubdirectiva(subdirectiva) {
  return (subdirectiva?.instituciones || []).flatMap((institucion) =>
    institucion.sedes.map((sede) => ({ ...sede, institucion: institucion.nombre }))
  );
}

function poblarSelectInstituciones(idSelect) {
  const select = document.getElementById(idSelect);
  const instituciones = subdirectivasDisponibles.flatMap((subdirectiva) =>
    subdirectiva.instituciones.map((institucion) =>
      `<option value="${escapeHTML(institucion.id_institucion)}">${escapeHTML(subdirectiva.nombre)} · ${escapeHTML(institucion.nombre)}</option>`
    ));
  select.innerHTML = '<option value="">Selecciona una institución educativa...</option>' + instituciones.join('');
  select.disabled = instituciones.length === 0;
  return instituciones.length;
}

function actualizarSedesAsignacion(idSede = '') {
  const idSubdirectiva = document.getElementById('asignacion-subdirectiva').value;
  const subdirectiva = subdirectivasDisponibles.find((item) => String(item.id_subdirectiva) === idSubdirectiva);
  const select = document.getElementById('asignacion-sede');
  const sedes = sedesDeSubdirectiva(subdirectiva);
  select.innerHTML = '<option value="">Sin sede asignada...</option>' +
    sedes.map((sede) =>
      `<option value="${escapeHTML(sede.id_sede)}" ${String(sede.id_sede) === String(idSede) ? 'selected' : ''}>${escapeHTML(sede.institucion)} · ${escapeHTML(sede.nombre)}</option>`
    ).join('');
  select.disabled = false;
}

function actualizarCargosAsignacion(idCargo = '') {
  const idSubdirectiva = document.getElementById('asignacion-subdirectiva').value;
  const subdirectiva = subdirectivasDisponibles.find((item) => String(item.id_subdirectiva) === idSubdirectiva);
  const cargos = cargosSindicales.filter((cargo) => {
    const esCargoGeneral = cargo.nombre.endsWith(' General');
    return subdirectiva?.es_principal
      ? esCargoGeneral || cargo.nombre === 'Afiliado'
      : !esCargoGeneral;
  });
  const selectorCargo = document.getElementById('asignacion-cargo');
  selectorCargo.innerHTML = `<option value="">${subdirectiva?.es_principal ? 'Selecciona un cargo...' : 'Sin cargo en esta subdirectiva'}</option>` +
    cargos.map((cargo) =>
      `<option value="${escapeHTML(cargo.id_cargo_sindical)}" ${String(cargo.id_cargo_sindical) === String(idCargo) ? 'selected' : ''}>${escapeHTML(cargo.nombre)}</option>`
    ).join('');
  selectorCargo.required = Boolean(subdirectiva?.es_principal);
}

function abrirModalAsignacion(idAfiliado) {
  if (!puedeGestionarAfiliados) return;
  const afiliado = usuariosActuales.find((item) => Number(item.id_afiliado) === idAfiliado);
  if (!afiliado) return;

  document.getElementById('id-afiliado-asignacion').value = idAfiliado;
  document.getElementById('nombre-afiliado-asignacion').textContent = nombreCompleto(afiliado);
  document.getElementById('mensaje-asignacion').className = 'mensaje';
  poblarSelectSubdirectivas('asignacion-subdirectiva', afiliado.id_subdirectiva);
  actualizarSedesAsignacion(afiliado.id_sede);
  actualizarCargosAsignacion(afiliado.id_cargo_sindical);
  document.getElementById('asignacion-rol-laboral').innerHTML = '<option value="">Sin rol laboral asignado...</option>' +
    rolesLaboralesDisponibles.map((rol) =>
      `<option value="${escapeHTML(rol.id_rol_laboral)}" ${rol.nombre === afiliado.rol_laboral ? 'selected' : ''}>${escapeHTML(rol.nombre)}</option>`
    ).join('');
  document.getElementById('modal-asignacion').classList.add('visible');
}

async function cambiarEstadoSindical(idAfiliado, estado) {
  try {
    await apiFetch(`/api/afiliados/${idAfiliado}/estado-sindical`, {
      method: 'PATCH',
      body: JSON.stringify({ estado_sindical: estado }),
    });
    await cargarUsuarios();
  } catch (err) {
    alert(err.message);
    await cargarUsuarios();
  }
}

function cerrarModalPanel(idModal) {
  document.getElementById(idModal).classList.remove('visible');
  document.querySelector(`#${idModal} form`)?.reset();
}

async function cargarRolesDisponibles() {
  rolesDisponibles = await apiFetch('/api/afiliados/roles');
}

function abrirModalRoles(idAfiliado) {
  if (!esAdmin) return;

  const afiliado = usuariosActuales.find((usuario) => Number(usuario.id_afiliado) === idAfiliado);
  if (!afiliado) return;

  document.getElementById('id-afiliado-roles').value = idAfiliado;
  document.getElementById('nombre-afiliado-roles').textContent = nombreCompleto(afiliado);
  document.getElementById('mensaje-roles').className = 'mensaje';
  document.getElementById('opciones-roles').innerHTML = rolesDisponibles.map((rol) => `
    <label class="opcion-rol">
      <input type="checkbox" value="${escapeHTML(rol.nombre)}" ${afiliado.roles.includes(rol.nombre) ? 'checked' : ''} />
      <span>${escapeHTML(rol.nombre)}</span>
    </label>
  `).join('');
  document.getElementById('modal-roles').classList.add('visible');
}

function cerrarModalRoles() {
  document.getElementById('modal-roles').classList.remove('visible');
  document.getElementById('form-roles').reset();
}

// ---------- Aprobar / rechazar ----------
async function cambiarEstado(id, estado) {
  try {
    await apiFetch(`/api/afiliados/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
    cargarUsuarios();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Modal de registro (admin) ----------
function abrirModal() {
  document.getElementById('modal-registrar').classList.add('visible');
}

function cerrarModal() {
  document.getElementById('modal-registrar').classList.remove('visible');
  document.getElementById('mensaje-modal').className = 'mensaje';
  document.getElementById('form-registrar-admin').reset();
}

document.getElementById('btn-registrar').addEventListener('click', abrirModal);

document.getElementById('form-registrar-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-modal');
  mensaje.className = 'mensaje';

  const datos = {
    nombre1: document.getElementById('r-nombre1').value.trim(),
    nombre2: document.getElementById('r-nombre2').value.trim(),
    apellido1: document.getElementById('r-apellido1').value.trim(),
    apellido2: document.getElementById('r-apellido2').value.trim(),
    cedula: document.getElementById('r-cedula').value.trim(),
    fecha_nacimiento: document.getElementById('r-fecha_nacimiento').value,
    correo: document.getElementById('r-correo').value.trim(),
    celular: document.getElementById('r-celular').value.trim(),
    usuario: document.getElementById('r-usuario').value.trim(),
    password: document.getElementById('r-password').value,
    rol: document.getElementById('r-rol').value,
  };

  try {
    const data = await apiFetch('/api/afiliados', {
      method: 'POST',
      body: JSON.stringify(datos),
    });

    mensaje.textContent = data.mensaje;
    mensaje.className = 'mensaje exito';
    setTimeout(() => {
      cerrarModal();
      cargarUsuarios();
    }, 800);
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

document.getElementById('form-roles').addEventListener('submit', async (e) => {
  e.preventDefault();
  const idAfiliado = document.getElementById('id-afiliado-roles').value;
  const roles = [...document.querySelectorAll('#opciones-roles input:checked')].map((input) => input.value);
  const mensaje = document.getElementById('mensaje-roles');
  mensaje.className = 'mensaje';

  try {
    const respuesta = await apiFetch(`/api/afiliados/${idAfiliado}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    });
    mensaje.textContent = respuesta.mensaje;
    mensaje.className = 'mensaje exito';
    setTimeout(async () => {
      cerrarModalRoles();
      await cargarUsuarios();
    }, 600);
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

document.getElementById('btn-recargar-biblioteca').addEventListener('click', cargarBiblioteca);
document.getElementById('filtro-biblioteca-q').addEventListener('input', cargarBiblioteca);
document.getElementById('filtro-biblioteca-categoria').addEventListener('change', cargarBiblioteca);
document.getElementById('btn-recargar-material-educativo').addEventListener('click', cargarBibliotecaEducativa);
document.getElementById('btn-subir-material-educativo').addEventListener('click', async () => {
  const formulario = document.getElementById('form-material-educativo');
  try {
    await cargarMateriasEducativas();
    formulario.reset();
    actualizarCamposClasificacionEducativa();
    formulario.hidden = false;
    formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    const mensaje = document.getElementById('mensaje-biblioteca-educativa');
    mensaje.textContent = error.message;
    mensaje.className = 'mensaje error';
  }
});
document.getElementById('btn-cancelar-material-educativo').addEventListener('click', () => {
  const formulario = document.getElementById('form-material-educativo');
  formulario.reset();
  formulario.hidden = true;
  actualizarCamposClasificacionEducativa();
});
document.getElementById('material-educativo-tipo').addEventListener('change', actualizarCamposClasificacionEducativa);
document.getElementById('form-material-educativo').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formulario = event.currentTarget;
  const boton = formulario.querySelector('[type="submit"]');
  const mensaje = document.getElementById('mensaje-biblioteca-educativa');
  mensaje.className = 'mensaje';
  boton.disabled = true;
  try {
    const resultado = await apiFetch('/api/biblioteca/educativa', {
      method: 'POST',
      body: new FormData(formulario),
    });
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
    formulario.reset();
    formulario.hidden = true;
    actualizarCamposClasificacionEducativa();
    await cargarBibliotecaEducativa();
  } catch (error) {
    mensaje.textContent = error.message;
    mensaje.className = 'mensaje error';
  } finally {
    boton.disabled = false;
  }
});
document.getElementById('documento-categoria').addEventListener('change', actualizarControlPublicacionDocumento);
document.getElementById('btn-subir-documento').addEventListener('click', prepararNuevoDocumento);
document.getElementById('btn-cancelar-documento').addEventListener('click', ocultarFormularioBiblioteca);
document.getElementById('form-biblioteca').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formulario = event.currentTarget;
  const idDocumento = document.getElementById('documento-id').value;
  const mensaje = document.getElementById('mensaje-biblioteca');
  const boton = formulario.querySelector('[type="submit"]');
  mensaje.className = 'mensaje';
  boton.disabled = true;
  try {
    const respuesta = await apiFetch(idDocumento ? `/api/biblioteca/${idDocumento}` : '/api/biblioteca', {
      method: idDocumento ? 'PATCH' : 'POST',
      body: (() => {
        const datos = new FormData(formulario);
        if (puedePublicarDocumentos) {
          datos.set('publico', document.getElementById('documento-publico').checked ? 'true' : 'false');
        }
        return datos;
      })(),
    });
    mensaje.textContent = respuesta.mensaje;
    mensaje.className = 'mensaje exito';
    ocultarFormularioBiblioteca();
    await cargarBiblioteca();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  } finally {
    boton.disabled = false;
  }
});

document.getElementById('asignacion-subdirectiva').addEventListener('change', () => {
  actualizarSedesAsignacion();
  actualizarCargosAsignacion();
});
document.getElementById('btn-crear-subdirectiva').addEventListener('click', () => {
  document.getElementById('mensaje-subdirectiva').className = 'mensaje';
  document.getElementById('modal-subdirectiva').classList.add('visible');
});
document.getElementById('btn-crear-institucion').addEventListener('click', () => {
  document.getElementById('mensaje-institucion').className = 'mensaje';
  poblarSelectSubdirectivas('institucion-subdirectiva');
  document.getElementById('modal-institucion').classList.add('visible');
});
document.getElementById('btn-crear-sede').addEventListener('click', () => {
  const mensaje = document.getElementById('mensaje-sede');
  mensaje.className = 'mensaje';
  const cantidadInstituciones = poblarSelectInstituciones('sede-institucion');
  document.querySelector('#form-sede [type="submit"]').disabled = cantidadInstituciones === 0;
  if (cantidadInstituciones === 0) {
    mensaje.textContent = 'Primero crea una institución educativa para poder registrar sus sedes.';
    mensaje.className = 'mensaje error';
  }
  document.getElementById('modal-sede').classList.add('visible');
});

document.getElementById('form-asignacion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const idAfiliado = document.getElementById('id-afiliado-asignacion').value;
  const mensaje = document.getElementById('mensaje-asignacion');
  mensaje.className = 'mensaje';
  const idSede = document.getElementById('asignacion-sede').value;
  const idRolLaboral = document.getElementById('asignacion-rol-laboral').value;
  if (Boolean(idSede) !== Boolean(idRolLaboral)) {
    mensaje.textContent = 'Selecciona juntos la sede y el rol laboral, o déjalos ambos sin asignar.';
    mensaje.className = 'mensaje error';
    return;
  }
  try {
    const resultado = await apiFetch(`/api/afiliados/${idAfiliado}/asignacion`, {
      method: 'PATCH',
      body: JSON.stringify({
        id_subdirectiva: document.getElementById('asignacion-subdirectiva').value,
        id_sede: idSede,
        id_cargo_sindical: document.getElementById('asignacion-cargo').value,
        id_rol_laboral: idRolLaboral,
      }),
    });
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
    setTimeout(async () => {
      cerrarModalPanel('modal-asignacion');
      await cargarUsuarios();
    }, 600);
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

document.getElementById('form-subdirectiva').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-subdirectiva');
  try {
    await apiFetch('/api/subdirectivas', {
      method: 'POST',
      body: JSON.stringify({ nombre: document.getElementById('nombre-subdirectiva').value.trim() }),
    });
    cerrarModalPanel('modal-subdirectiva');
    await cargarEstructuraSindical();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

document.getElementById('form-institucion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-institucion');
  const idSubdirectiva = document.getElementById('institucion-subdirectiva').value;
  try {
    await apiFetch(`/api/subdirectivas/${idSubdirectiva}/instituciones`, {
      method: 'POST',
      body: JSON.stringify({ nombre: document.getElementById('nombre-institucion').value.trim() }),
    });
    cerrarModalPanel('modal-institucion');
    await cargarEstructuraSindical();
    await cargarDirectorio();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

document.getElementById('form-sede').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje-sede');
  const idInstitucion = document.getElementById('sede-institucion').value;
  try {
    await apiFetch(`/api/subdirectivas/instituciones/${idInstitucion}/sedes`, {
      method: 'POST',
      body: JSON.stringify({ nombre: document.getElementById('nombre-sede').value.trim() }),
    });
    cerrarModalPanel('modal-sede');
    await cargarEstructuraSindical();
    await cargarDirectorio();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

function abrirModalRenombrarEstructura(tipo, id, nombre) {
  const etiquetas = {
    subdirectiva: 'subdirectiva',
    institucion: 'institución educativa',
    sede: 'sede',
  };
  const maximaLongitud = tipo === 'institucion' ? 150 : 100;
  document.getElementById('renombrar-tipo').value = tipo;
  document.getElementById('renombrar-id').value = id;
  document.getElementById('renombrar-nombre').value = nombre;
  document.getElementById('renombrar-nombre').maxLength = maximaLongitud;
  document.getElementById('titulo-renombrar-estructura').textContent =
    `Cambiar nombre de ${etiquetas[tipo]}`;
  document.getElementById('mensaje-renombrar-estructura').className = 'mensaje';
  document.getElementById('modal-renombrar-estructura').classList.add('visible');
}

document.getElementById('cuerpo-directorio').addEventListener('click', (event) => {
  const boton = event.target.closest('[data-renombrar]');
  if (!boton || !puedeGestionarAfiliados) return;
  abrirModalRenombrarEstructura(boton.dataset.renombrar, boton.dataset.id, boton.dataset.nombre);
});

document.getElementById('form-renombrar-estructura').addEventListener('submit', async (event) => {
  event.preventDefault();
  const tipo = document.getElementById('renombrar-tipo').value;
  const id = document.getElementById('renombrar-id').value;
  const nombre = document.getElementById('renombrar-nombre').value.trim();
  const rutas = {
    subdirectiva: `/api/subdirectivas/${id}`,
    institucion: `/api/subdirectivas/instituciones/${id}`,
    sede: `/api/subdirectivas/sedes/${id}`,
  };
  const mensaje = document.getElementById('mensaje-renombrar-estructura');
  mensaje.className = 'mensaje';
  try {
    await apiFetch(rutas[tipo], { method: 'PATCH', body: JSON.stringify({ nombre }) });
    cerrarModalPanel('modal-renombrar-estructura');
    await cargarEstructuraSindical();
    await cargarDirectorio();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});

function limpiarFiltros(scope) {
  document.getElementById(`filtro-${scope}-q`).value = '';
  document.getElementById(`filtro-${scope}-cargo`).value = '';
  document.getElementById(`filtro-${scope}-rol`).value = '';
  document.getElementById(`filtro-${scope}-subdirectiva`).value = '';
  if (scope === 'global') {
    document.getElementById('filtro-global-estado').value = modoAdministracion === 'pendientes' ? 'pendiente' : '';
    document.getElementById('filtro-global-sindical').value = '';
    cargarUsuarios();
  } else {
    cargarAfiliadosVisibles();
  }
}

document.getElementById('btn-buscar-local').addEventListener('click', cargarAfiliadosVisibles);
document.getElementById('btn-limpiar-local').addEventListener('click', () => limpiarFiltros('local'));
document.getElementById('btn-buscar-global').addEventListener('click', cargarUsuarios);
document.getElementById('btn-limpiar-global').addEventListener('click', () => limpiarFiltros('global'));
document.getElementById('btn-modo-pendientes').addEventListener('click', () => cambiarModoAdministracion('pendientes'));
document.getElementById('btn-modo-busqueda').addEventListener('click', () => cambiarModoAdministracion('busqueda'));
document.getElementById('filtro-global-q').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    cargarUsuarios();
  }
});

document.addEventListener('change', (event) => {
  const control = event.target;
  if (control.matches('.selector-afiliado')) {
    const scope = control.dataset.scope;
    const lista = scope === 'global' ? usuariosActuales : afiliadosVisiblesActuales;
    const afiliado = lista.find((item) => String(item.id_afiliado) === control.value);
    if (control.checked && afiliado) {
      afiliadosSeleccionados.set(control.value, { afiliado, scope });
    } else if (afiliadosSeleccionados.get(control.value)?.scope === scope) {
      afiliadosSeleccionados.delete(control.value);
    }
    actualizarSeleccion(scope);
  }

  if (control.matches('.seleccionar-todos')) {
    const scope = control.dataset.scope;
    const lista = scope === 'global' ? usuariosActuales : afiliadosVisiblesActuales;
    for (const afiliado of lista) {
      const id = String(afiliado.id_afiliado);
      if (control.checked) afiliadosSeleccionados.set(id, { afiliado, scope });
      else if (afiliadosSeleccionados.get(id)?.scope === scope) afiliadosSeleccionados.delete(id);
    }
    document.querySelectorAll(`.selector-afiliado[data-scope="${scope}"]`).forEach((checkbox) => {
      checkbox.checked = control.checked;
    });
    actualizarSeleccion(scope);
  }
});

document.querySelectorAll('[data-accion-seleccion]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const scope = boton.closest('.seleccion-afiliados').id === 'acciones-globales' ? 'global' : 'local';
    const mensaje = document.getElementById(scope === 'global' ? 'mensaje' : 'mensaje-afiliados');
    const accion = boton.dataset.accionSeleccion;
    mensaje.className = 'mensaje';
    try {
      if (accion === 'copiar') {
        const cantidad = await copiarCorreosSeleccionados(scope);
        mensaje.textContent = `Se copiaron ${cantidad} correos.`;
        mensaje.className = 'mensaje exito';
      } else if (accion.startsWith('correo-')) {
        const cantidad = redactarCorreoSeleccionados(scope);
        mensaje.textContent = `Se abrió el correo con ${cantidad} destinatarios en CCO.`;
        mensaje.className = 'mensaje exito';
      } else {
        await descargarAfiliados(accion.startsWith('xlsx-') ? 'excel' : 'pdf', scope);
      }
    } catch (err) {
      mensaje.textContent = err.message;
      mensaje.className = 'mensaje error';
    }
  });
});

document.querySelectorAll('.nav-vista').forEach((boton) => {
  boton.addEventListener('click', () => mostrarVista(boton.dataset.vista));
});
document.getElementById('btn-menu-movil').addEventListener('click', () => {
  const nav = document.getElementById('nav-vistas');
  const abierto = nav.classList.toggle('abierto');
  document.getElementById('btn-menu-movil').setAttribute('aria-expanded', String(abierto));
  document.getElementById('btn-menu-movil').setAttribute(
    'aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
  );
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') mostrarVistaMenuCerrado();
});
document.addEventListener('click', (event) => {
  const nav = document.getElementById('nav-vistas');
  const boton = document.getElementById('btn-menu-movil');
  if (!nav.contains(event.target) && !boton.contains(event.target)) mostrarVistaMenuCerrado();
});

function mostrarVistaMenuCerrado() {
  document.getElementById('nav-vistas').classList.remove('abierto');
  document.getElementById('btn-menu-movil').setAttribute('aria-expanded', 'false');
  document.getElementById('btn-menu-movil').setAttribute('aria-label', 'Abrir menú de navegación');
}

document.getElementById('btn-recargar-directorio').addEventListener('click', cargarDirectorio);
document.getElementById('btn-recargar-afiliados').addEventListener('click', cargarAfiliadosVisibles);
document.getElementById('btn-recargar-calendario').addEventListener('click', cargarEventos);
document.querySelector('[data-abrir-calendario]').addEventListener('click', abrirEventoRecordado);
document.getElementById('btn-crear-evento').addEventListener('click', () => {
  const formulario = document.getElementById('form-crear-evento');
  const selector = document.getElementById('evento-subdirectiva');
  if (esAdmin && !selector.value) {
    const principal = subdirectivasDisponibles.find((subdirectiva) => subdirectiva.es_principal);
    if (principal) selector.value = String(principal.id_subdirectiva);
  }
  const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  document.getElementById('evento-inicio').value = ahora.toISOString().slice(0, 16);
  formulario.hidden = false;
});
document.getElementById('btn-cancelar-evento').addEventListener('click', () => {
  document.getElementById('form-crear-evento').reset();
  document.getElementById('form-crear-evento').hidden = true;
});
document.getElementById('form-crear-evento').addEventListener('submit', async (event) => {
  event.preventDefault();
  const mensaje = document.getElementById('mensaje-calendario');
  mensaje.className = 'mensaje';
  const selectorSubdirectiva = document.getElementById('evento-subdirectiva');
  const fechaFin = document.getElementById('evento-fin').value;
  try {
    const resultado = await apiFetch('/api/calendario/eventos', {
      method: 'POST',
      body: JSON.stringify({
        titulo: document.getElementById('evento-titulo').value.trim(),
        tipo: document.getElementById('evento-tipo').value,
        fecha_inicio: new Date(document.getElementById('evento-inicio').value).toISOString(),
        fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
        lugar: document.getElementById('evento-lugar').value.trim(),
        descripcion: document.getElementById('evento-descripcion').value.trim(),
        id_subdirectiva: esAdmin || esDirectivaPrincipal
          ? selectorSubdirectiva.value
          : perfilActual.id_subdirectiva,
      }),
    });
    mensaje.textContent = resultado.mensaje;
    mensaje.className = 'mensaje exito';
    document.getElementById('form-crear-evento').reset();
    document.getElementById('form-crear-evento').hidden = true;
    await cargarEventos();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
});
document.getElementById('foto-perfil').addEventListener('change', (event) => {
  const archivo = event.target.files[0];
  if (!archivo) return;
  const urlTemporal = URL.createObjectURL(archivo);
  const avatar = document.getElementById('avatar-cuenta');
  avatar.src = urlTemporal;
  avatar.hidden = false;
  document.getElementById('avatar-iniciales').hidden = true;
  document.getElementById('btn-guardar-foto').hidden = false;
});
document.getElementById('btn-guardar-foto').addEventListener('click', () => {
  document.getElementById('form-cuenta').requestSubmit();
});

document.getElementById('form-cuenta').addEventListener('submit', async (event) => {
  event.preventDefault();
  const mensaje = document.getElementById('mensaje-cuenta');
  const boton = event.currentTarget.querySelector('[type="submit"]');
  mensaje.className = 'mensaje';
  boton.disabled = true;
  try {
    const respuesta = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      body: new FormData(event.currentTarget),
    });
    mensaje.textContent = respuesta.mensaje;
    mensaje.className = 'mensaje exito';
    document.getElementById('cuenta-contrasena-actual').value = '';
    document.getElementById('cuenta-contrasena-nueva').value = '';
    document.getElementById('foto-perfil').value = '';
    await cargarPerfil();
  } catch (err) {
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  } finally {
    boton.disabled = false;
  }
});

// ---------- Inicialización ----------
async function inicializarPanel() {
  await cargarPerfil();
  try {
    await cargarCategoriasBiblioteca();
  } catch (err) {
    const mensaje = document.getElementById('mensaje-biblioteca');
    mensaje.textContent = err.message;
    mensaje.className = 'mensaje error';
  }
  if (puedeVerAfiliados || puedeCrearEvento) {
    try {
      if (esAdmin) await cargarRolesDisponibles();
      await cargarEstructuraSindical();
    } catch (err) {
      const mensaje = document.getElementById('mensaje');
      mensaje.textContent = err.message;
      mensaje.className = 'mensaje error';
    }
  }
  await cargarEventos();
  await mostrarVista('vista-inicio');
}

inicializarPanel();
