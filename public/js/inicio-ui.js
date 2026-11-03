// Componentes visuales de la vista de inicio (tarjetas, indicadores, listas).
// Depende de escapeHTML, apiFetch y mostrarVista, definidos en api.js / dashboard.js.
const InicioUI = (() => {
  const trazo = (contenido) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${contenido}</svg>`;

  const ICONOS = {
    red: trazo('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>'),
    calendario: trazo('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    libro: trazo('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
    usuarios: trazo('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
    escudo: trazo('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    archivo: trazo('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>'),
    flecha: '<svg class="feature-card__flecha" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    salir: trazo('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    casa: trazo('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
    chat: trazo('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>'),
  };

  const TARJETAS = {
    'vista-directorio': { icono: 'red', acento: 'verde' },
    'vista-calendario': { icono: 'calendario', acento: 'azul' },
    'vista-biblioteca': { icono: 'libro', acento: 'ambar' },
    'vista-afiliados': { icono: 'usuarios', acento: 'violeta' },
    'vista-administracion': { icono: 'escudo', acento: 'rosa' },
  };

  function featureCard(opcion, indice) {
    const { icono, acento } = TARJETAS[opcion.vista] || { icono: 'red', acento: 'verde' };
    return `
      <button class="opcion-inicio feature-card" type="button" data-vista="${escapeHTML(opcion.vista)}"
        data-acento="${acento}" style="--i:${indice}">
        <span class="feature-card__icono">${ICONOS[icono]}</span>
        <span class="feature-card__etiqueta">SUTENS</span>
        <strong class="feature-card__titulo">${escapeHTML(opcion.titulo)}</strong>
        <span class="feature-card__detalle">${escapeHTML(opcion.detalle)}</span>
        ${ICONOS.flecha}
      </button>`;
  }

  function statCard(id, etiqueta, indice) {
    return `
      <div class="stat-card" style="--i:${indice}">
        <dt>${etiqueta}</dt>
        <dd id="${id}">—</dd>
      </div>`;
  }

  function eventItem(evento, indice) {
    const fecha = new Date(evento.fecha_inicio);
    const mes = fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
    const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    return `
      <li>
        <button class="item-lista" type="button" data-vista="vista-calendario" style="--i:${indice}">
          <span class="item-lista__fecha" aria-hidden="true"><strong>${fecha.getDate()}</strong><span>${escapeHTML(mes)}</span></span>
          <span>
            <span class="item-lista__titulo">${escapeHTML(evento.titulo)}</span>
            <span class="item-lista__meta">${escapeHTML(hora)} · ${escapeHTML(evento.subdirectiva || 'Directiva Departamental')}</span>
          </span>
        </button>
      </li>`;
  }

  function documentItem(documento, indice) {
    const fecha = new Date(documento.fecha_publicacion).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return `
      <li>
        <button class="item-lista" type="button" data-vista="vista-biblioteca" style="--i:${indice}">
          <span class="item-lista__icono" aria-hidden="true">${ICONOS.archivo}</span>
          <span>
            <span class="item-lista__titulo">${escapeHTML(documento.titulo)}</span>
            <span class="item-lista__meta">${escapeHTML(documento.categoria || 'Documento')} · ${escapeHTML(fecha)}</span>
          </span>
        </button>
      </li>`;
  }

  const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animarNumero(elemento, destino) {
    if (reducirMovimiento() || destino === 0) {
      elemento.textContent = destino.toLocaleString('es-CO');
      return;
    }
    const duracion = 900;
    const inicio = performance.now();
    const paso = (ahora) => {
      const avance = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - (1 - avance) ** 3;
      elemento.textContent = Math.round(destino * suave).toLocaleString('es-CO');
      if (avance < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function setIndicador(id, valor) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    const numero = Number(valor);
    if (valor === null || valor === undefined || Number.isNaN(numero)) {
      elemento.textContent = '—';
      return;
    }
    animarNumero(elemento, numero);
  }

  function renderizarIndicadores() {
    const contenedor = document.getElementById('hero-indicadores');
    if (!contenedor) return;
    contenedor.innerHTML = [
      statCard('indicador-afiliados', 'Total de afiliados', 1),
      statCard('indicador-eventos', 'Próximas actividades', 2),
      statCard('indicador-documentos', 'Documentos nuevos', 3),
    ].join('');
  }

  function pintarHero(perfil, nombre) {
    const avatar = document.getElementById('hero-avatar');
    if (avatar) {
      avatar.replaceChildren();
      if (perfil.foto_perfil_url) {
        const imagen = document.createElement('img');
        imagen.src = perfil.foto_perfil_url;
        imagen.alt = '';
        avatar.append(imagen);
      } else {
        avatar.textContent = nombre.split(' ').filter(Boolean).slice(0, 2)
          .map((parte) => parte[0]).join('').toLocaleUpperCase('es') || 'S';
      }
    }
    const roles = document.getElementById('hero-roles');
    if (roles) {
      roles.innerHTML = (perfil.roles || []).map((rol) => `<span class="badge">${escapeHTML(rol)}</span>`).join('');
    }
  }

  function enlazarNavegacion(contenedor) {
    contenedor.querySelectorAll('[data-vista]').forEach((boton) => {
      boton.addEventListener('click', () => mostrarVista(boton.dataset.vista));
    });
  }

  function pintarLista(id, items, vacio) {
    const lista = document.getElementById(id);
    if (!lista) return;
    lista.innerHTML = items.length ? items.join('') : `<li class="inicio-vacio">${escapeHTML(vacio)}</li>`;
    enlazarNavegacion(lista);
  }

  async function cargarActividadesYDocumentos() {
    const [eventos, documentos] = await Promise.allSettled([
      apiFetch('/api/calendario/eventos'),
      apiFetch('/api/biblioteca'),
    ]);

    const ahora = new Date();
    const proximos = eventos.status === 'fulfilled'
      ? eventos.value
        .filter((evento) => evento.estado === 'programado' && new Date(evento.fecha_inicio) >= ahora)
        .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
      : [];
    pintarLista(
      'lista-inicio-eventos',
      proximos.slice(0, 3).map(eventItem),
      'No hay actividades programadas para tu alcance.',
    );
    setIndicador('indicador-eventos', eventos.status === 'fulfilled' ? proximos.length : null);

    const recientes = documentos.status === 'fulfilled'
      ? [...documentos.value].sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion))
      : [];
    pintarLista(
      'lista-inicio-documentos',
      recientes.slice(0, 3).map(documentItem),
      'No hay documentos disponibles.',
    );
    const hace30Dias = ahora.getTime() - 30 * 24 * 3600 * 1000;
    setIndicador(
      'indicador-documentos',
      documentos.status === 'fulfilled'
        ? recientes.filter((documento) => new Date(documento.fecha_publicacion).getTime() >= hace30Dias).length
        : null,
    );
  }

  renderizarIndicadores();
  enlazarNavegacion(document.querySelector('.inicio-paneles'));
  return { ICONOS, featureCard, pintarHero, setIndicador, cargarActividadesYDocumentos, enlazarNavegacion };
})();
