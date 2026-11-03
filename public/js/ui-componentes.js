// Componentes de interfaz compartidos del panel (solo presentación, sin lógica de negocio).
const UI = (() => {
  const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

  const svg = (contenido, tamano = 24) =>
    `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;

  const iconos = {
    usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    libro: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    birrete: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 10v6"/>',
    red: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    cuenta: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.7a6 6 0 0 1 10 0"/>',
    buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    carpeta: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    mas: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    izquierda: '<path d="m15 18-6-6 6-6"/>',
    derecha: '<path d="m9 18 6-6-6-6"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    papelera: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    archivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    cuadricula: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  };

  const iconoPorVista = {
    'vista-calendario': 'calendario',
    'vista-biblioteca': 'libro',
    'vista-biblioteca-educativa': 'birrete',
    'vista-directorio': 'red',
    'vista-afiliados': 'usuarios',
    'vista-administracion': 'escudo',
    'vista-cuenta': 'cuenta',
  };

  const paletaAvatar = ['#15803d', '#1d4ed8', '#b45309', '#6d28d9', '#be123c', '#0f766e'];

  function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    const primera = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primera + ultima).toLocaleUpperCase('es');
  }

  function avatar(nombre, clase = '') {
    let suma = 0;
    for (const letra of String(nombre || '')) suma += letra.charCodeAt(0);
    const color = paletaAvatar[suma % paletaAvatar.length];
    return `<span class="avatar-iniciales ${clase}" style="--avatar:${color}" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
  }

  // Estado de carga con filas esqueleto (el texto accesible indica la carga)
  function skeletonFilas(columnas, filas = 5) {
    const celdas = Array.from({ length: columnas }, () => '<td><span class="skeleton"></span></td>').join('');
    return Array.from({ length: filas }, () => `<tr class="fila-skeleton" aria-hidden="true">${celdas}</tr>`).join('');
  }

  function skeletonTarjetas(cantidad = 3) {
    return Array.from({ length: cantidad }, () =>
      '<div class="tarjeta-skeleton" aria-hidden="true"><span class="skeleton bloque"></span><div><span class="skeleton"></span><span class="skeleton corto"></span></div></div>').join('');
  }

  // Avatares apilados con contador de los restantes
  function avatares(nombres, total = nombres.length, maximo = 4) {
    if (total === 0) return '';
    const visibles = nombres.slice(0, maximo).map((nombre) => avatar(nombre, 'mini')).join('');
    const resto = total - Math.min(nombres.length, maximo);
    return `<span class="avatares-apilados">${visibles}${resto > 0 ? `<span class="avatar-iniciales mini mas" aria-hidden="true">+${resto}</span>` : ''}</span>`;
  }

  function estadoVacio({ icono = 'carpeta', mensaje, accion }) {
    return `
      <div class="estado-vacio">
        <span class="estado-vacio__icono">${svg(iconos[icono] || iconos.carpeta, 28)}</span>
        <p>${esc(mensaje)}</p>
        ${accion ? `<button class="btn btn-secundario btn-sm" type="button" data-ui-accion="${esc(accion.id)}">${esc(accion.texto)}</button>` : ''}
      </div>`;
  }

  function decorarBanners() {
    document.querySelectorAll('.vista > .panel-header').forEach((cabecera) => {
      const clave = iconoPorVista[cabecera.closest('.vista').id];
      if (!clave || cabecera.querySelector('.panel-icono')) return;
      cabecera.insertAdjacentHTML('beforeend',
        `<span class="panel-icono" aria-hidden="true">${svg(iconos[clave], 150)}</span><div class="panel-resumen" hidden></div>`);
    });
  }

  function setResumen(idVista, datos) {
    const contenedor = document.querySelector(`#${idVista} .panel-resumen`);
    if (!contenedor) return;
    contenedor.innerHTML = datos.map((dato) =>
      `<div class="stat-pill"><strong>${esc(dato.valor)}</strong><span>${esc(dato.etiqueta)}</span></div>`).join('');
    contenedor.hidden = datos.length === 0;
  }

  let temporizadorToast;
  function toast(mensaje) {
    let nodo = document.getElementById('ui-toast');
    if (!nodo) {
      nodo = document.createElement('div');
      nodo.id = 'ui-toast';
      nodo.setAttribute('role', 'status');
      nodo.setAttribute('aria-live', 'polite');
      document.body.appendChild(nodo);
    }
    nodo.textContent = mensaje;
    nodo.classList.add('visible');
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => nodo.classList.remove('visible'), 3200);
  }

  // Chips con los filtros activos; quitar uno limpia el control y repite la búsqueda existente.
  function iniciarChips({ ids, contenedor, botonBuscar }) {
    const nodo = document.getElementById(contenedor);
    if (!nodo) return;
    const controles = ids.map((id) => document.getElementById(id)).filter(Boolean);

    function pintar() {
      const activos = controles.filter((control) => control.value.trim());
      nodo.hidden = activos.length === 0;
      nodo.innerHTML = activos.map((control) => {
        const texto = control.tagName === 'SELECT' ? control.selectedOptions[0].textContent : `“${control.value.trim()}”`;
        return `<span class="chip-filtro">${esc(texto)}<button type="button" data-chip="${esc(control.id)}" aria-label="Quitar filtro ${esc(texto)}">${svg(iconos.cerrar, 14)}</button></span>`;
      }).join('');
    }

    nodo.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-chip]');
      if (!boton) return;
      document.getElementById(boton.dataset.chip).value = '';
      pintar();
      document.getElementById(botonBuscar).click();
    });
    controles.forEach((control) => {
      control.addEventListener('change', pintar);
      control.addEventListener('input', pintar);
    });
    document.getElementById(botonBuscar).addEventListener('click', () => setTimeout(pintar, 0));
    pintar();
  }

  // Paginación en cliente: oculta filas fuera de la página actual sin tocar los datos.
  function paginar({ cuerpo, pie, tamano = 10 }) {
    const tbody = document.getElementById(cuerpo);
    const nodo = document.getElementById(pie);
    if (!tbody || !nodo) return;
    let pagina = 1;

    function filas() {
      return [...tbody.querySelectorAll('tr:not(.fila-skeleton):not(.fila-vacia)')];
    }

    function pintar() {
      const todas = filas();
      const paginas = Math.max(1, Math.ceil(todas.length / tamano));
      pagina = Math.min(pagina, paginas);
      todas.forEach((fila, indice) => {
        fila.hidden = indice < (pagina - 1) * tamano || indice >= pagina * tamano;
      });
      if (todas.length <= tamano) {
        nodo.innerHTML = '';
        return;
      }
      const desde = (pagina - 1) * tamano + 1;
      const hasta = Math.min(pagina * tamano, todas.length);
      const numeros = Array.from({ length: paginas }, (_, i) => i + 1).map((n) =>
        `<button type="button" class="pagina-btn${n === pagina ? ' activa' : ''}" data-pagina="${n}" ${n === pagina ? 'aria-current="page"' : ''} aria-label="Página ${n}">${n}</button>`).join('');
      nodo.innerHTML = `
        <span class="paginacion__info">${desde}–${hasta} / ${todas.length}</span>
        <div class="paginacion__botones" role="navigation" aria-label="Paginación">
          <button type="button" class="pagina-btn" data-pagina="${pagina - 1}" aria-label="Página anterior" ${pagina === 1 ? 'disabled' : ''}>‹</button>
          ${numeros}
          <button type="button" class="pagina-btn" data-pagina="${pagina + 1}" aria-label="Página siguiente" ${pagina === paginas ? 'disabled' : ''}>›</button>
        </div>`;
    }

    nodo.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-pagina]');
      if (!boton || boton.disabled) return;
      pagina = Number(boton.dataset.pagina);
      pintar();
      tbody.closest('.tabla-wrapper')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    new MutationObserver(() => {
      pagina = 1;
      pintar();
    }).observe(tbody, { childList: true });
    pintar();
  }

  // Chips que reflejan las opciones de un <select> (el select sigue siendo la fuente de verdad)
  function chipsDesdeSelect(idSelect, idContenedor) {
    const select = document.getElementById(idSelect);
    const contenedor = document.getElementById(idContenedor);
    if (!select || !contenedor) return;
    contenedor.innerHTML = [...select.options].map((opcion) =>
      `<button type="button" class="chip-opcion" data-valor="${esc(opcion.value)}" aria-pressed="${opcion.value === select.value}">${esc(opcion.textContent)}</button>`).join('');
    if (contenedor.dataset.enlazado) return;
    contenedor.dataset.enlazado = '1';
    contenedor.addEventListener('click', (evento) => {
      const chip = evento.target.closest('[data-valor]');
      if (!chip) return;
      select.value = chip.dataset.valor;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      contenedor.querySelectorAll('[data-valor]').forEach((nodo) =>
        nodo.setAttribute('aria-pressed', String(nodo === chip)));
    });
  }

  let modalPrevia;
  let urlPrevia;
  function cerrarVistaPrevia() {
    modalPrevia?.classList.remove('visible');
    modalPrevia?.querySelector('iframe')?.removeAttribute('src');
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
  }

  // Vista previa de PDF: descarga autenticada a un blob que se muestra en un iframe
  async function vistaPrevia(ruta, titulo) {
    if (!modalPrevia) {
      modalPrevia = document.createElement('div');
      modalPrevia.className = 'modal-fondo';
      modalPrevia.innerHTML = `
        <div class="modal modal-previa" role="dialog" aria-modal="true" aria-labelledby="titulo-previa">
          <div class="modal-previa__cabecera">
            <h2 id="titulo-previa"></h2>
            <button type="button" class="btn-icono" aria-label="Cerrar vista previa" title="Cerrar">${svg(iconos.cerrar, 18)}</button>
          </div>
          <iframe title="Vista previa del documento"></iframe>
        </div>`;
      document.body.appendChild(modalPrevia);
      modalPrevia.addEventListener('click', (evento) => {
        if (evento.target === modalPrevia || evento.target.closest('.btn-icono')) cerrarVistaPrevia();
      });
      document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && modalPrevia.classList.contains('visible')) cerrarVistaPrevia();
      });
    }
    try {
      const respuesta = await fetch(ruta, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!respuesta.ok) throw new Error('No se pudo cargar la vista previa');
      const blob = await respuesta.blob();
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      urlPrevia = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      modalPrevia.querySelector('h2').textContent = titulo;
      modalPrevia.querySelector('iframe').src = urlPrevia;
      modalPrevia.classList.add('visible');
      modalPrevia.querySelector('.btn-icono').focus();
    } catch (error) {
      toast(error.message);
    }
  }

  function iconoArchivo(extension) {
    const tipo = String(extension || '').replace('.', '').toUpperCase() || 'DOC';
    return `<div class="documento-icono tipo-${esc(tipo.toLowerCase())}" aria-hidden="true">${svg(iconos.archivo, 22)}<span>${esc(tipo)}</span></div>`;
  }

  function ajustarAlturaCabecera() {
    const cabecera = document.querySelector('.topbar');
    if (cabecera) document.documentElement.style.setProperty('--topbar-h', `${cabecera.offsetHeight}px`);
  }

  function iniciar() {
    decorarBanners();
    ajustarAlturaCabecera();
    window.addEventListener('resize', ajustarAlturaCabecera);
    document.addEventListener('click', (evento) => {
      const accion = evento.target.closest('[data-ui-accion]');
      if (accion) document.getElementById(accion.dataset.uiAccion)?.click();
    });
    document.addEventListener('click', (evento) => {
      document.querySelectorAll('details.menu-acciones[open]').forEach((menu) => {
        if (!menu.contains(evento.target) || evento.target.closest('.btn-menu')) menu.open = false;
      });
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape') return;
      document.querySelectorAll('details.menu-acciones[open]').forEach((menu) => {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      });
    });
    document.addEventListener('click', (evento) => {
      const modo = evento.target.closest('[data-modo-lista]');
      if (!modo) return;
      const destino = document.getElementById(modo.dataset.destino);
      destino?.classList.toggle('modo-grid', modo.dataset.modoLista === 'grid');
      modo.parentElement.querySelectorAll('[data-modo-lista]').forEach((boton) =>
        boton.setAttribute('aria-pressed', String(boton === modo)));
    });
    iniciarChips({
      ids: ['filtro-local-q', 'filtro-local-cargo', 'filtro-local-rol', 'filtro-local-subdirectiva'],
      contenedor: 'chips-local',
      botonBuscar: 'btn-buscar-local',
    });
    paginar({ cuerpo: 'cuerpo-afiliados', pie: 'paginacion-local', tamano: 10 });
  }

  return { esc, svg, iconos, iniciales, avatar, avatares, skeletonFilas, skeletonTarjetas, estadoVacio, setResumen, toast, chipsDesdeSelect, vistaPrevia, iconoArchivo, iniciar };
})();

UI.iniciar();
