// Presentación del calendario: filtros por estado, alternador Lista/Mes y cuadrícula mensual.
const CalendarioUI = (() => {
  const hoy = new Date();
  const estado = {
    vista: 'lista',
    filtro: 'todos',
    dia: null,
    mes: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
  };

  const clave = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

  const porEstado = (eventos) =>
    estado.filtro === 'todos' ? eventos : eventos.filter((evento) => evento.estado === estado.filtro);

  function filtrar(eventos) {
    const lista = porEstado(eventos);
    if (estado.vista !== 'mes') return lista;
    return lista.filter((evento) => {
      const fecha = new Date(evento.fecha_inicio);
      if (estado.dia) return clave(fecha) === estado.dia;
      return fecha.getFullYear() === estado.mes.getFullYear() && fecha.getMonth() === estado.mes.getMonth();
    });
  }

  function resumir(eventos) {
    const ahora = new Date();
    UI.setResumen('vista-calendario', [
      { valor: eventos.filter((e) => e.estado === 'programado' && new Date(e.fecha_inicio) >= ahora).length, etiqueta: 'Próximas' },
      { valor: eventos.filter((e) => e.estado === 'programado').length, etiqueta: 'Programadas' },
      { valor: eventos.filter((e) => e.estado === 'realizado').length, etiqueta: 'Realizadas' },
    ]);
  }

  function pintarMes() {
    const panel = document.getElementById('calendario-mes');
    const eventos = porEstado(typeof eventosActuales === 'undefined' ? [] : eventosActuales);
    const porDia = new Map();
    eventos.forEach((evento) => {
      const llave = clave(new Date(evento.fecha_inicio));
      if (!porDia.has(llave)) porDia.set(llave, []);
      porDia.get(llave).push(evento);
    });

    const primero = estado.mes;
    const desfase = (primero.getDay() + 6) % 7;
    const dias = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate();
    const celdas = Math.ceil((desfase + dias) / 7) * 7;
    const titulo = primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    let html = '';
    for (let i = 0; i < celdas; i++) {
      const fecha = new Date(primero.getFullYear(), primero.getMonth(), i - desfase + 1);
      const llave = clave(fecha);
      const deEvento = porDia.get(llave) || [];
      const fuera = fecha.getMonth() !== primero.getMonth();
      const etiqueta = `${fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}${deEvento.length ? `, ${deEvento.length} actividad${deEvento.length === 1 ? '' : 'es'}` : ''}`;
      const puntos = deEvento.slice(0, 3).map((e) => `<i class="punto ${UI.esc(e.estado)}"></i>`).join('');
      html += `<button type="button" class="dia${fuera ? ' fuera' : ''}${clave(hoy) === llave ? ' hoy' : ''}${estado.dia === llave ? ' sel' : ''}" data-dia="${llave}" aria-label="${UI.esc(etiqueta)}" aria-pressed="${estado.dia === llave}"><span>${fecha.getDate()}</span><span class="puntos">${puntos}</span></button>`;
    }

    panel.innerHTML = `
      <div class="mes-cabecera">
        <button type="button" class="btn-icono" data-mes="-1" aria-label="Mes anterior" title="Mes anterior">${UI.svg(UI.iconos.izquierda, 18)}</button>
        <h3>${UI.esc(titulo)}</h3>
        <button type="button" class="btn-icono" data-mes="1" aria-label="Mes siguiente" title="Mes siguiente">${UI.svg(UI.iconos.derecha, 18)}</button>
      </div>
      <div class="mes-semana" aria-hidden="true"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="mes-rejilla">${html}</div>
      <div class="mes-leyenda"><span><i class="punto programado"></i>Programada</span><span><i class="punto realizado"></i>Realizada</span><span><i class="punto cancelado"></i>Cancelada</span></div>
      <button type="button" id="cal-limpiar-dia" class="btn btn-enlace btn-sm" ${estado.dia ? '' : 'hidden'}>Ver todo el mes</button>`;
  }

  function refrescar() {
    document.querySelectorAll('[data-estado-cal]').forEach((boton) =>
      boton.setAttribute('aria-pressed', String(boton.dataset.estadoCal === estado.filtro)));
    document.querySelectorAll('[data-vista-cal]').forEach((boton) =>
      boton.setAttribute('aria-pressed', String(boton.dataset.vistaCal === estado.vista)));
    const cuerpo = document.getElementById('calendario-cuerpo');
    cuerpo.classList.toggle('modo-mes', estado.vista === 'mes');
    document.getElementById('calendario-mes').hidden = estado.vista !== 'mes';
    if (estado.vista === 'mes') pintarMes();
    pintarEventos();
  }

  function mostrarTodo() {
    estado.filtro = 'todos';
    estado.vista = 'lista';
    estado.dia = null;
    refrescar();
  }

  function iniciar() {
    const vista = document.getElementById('vista-calendario');
    vista.addEventListener('click', (evento) => {
      const filtro = evento.target.closest('[data-estado-cal]');
      const modo = evento.target.closest('[data-vista-cal]');
      const dia = evento.target.closest('[data-dia]');
      const mes = evento.target.closest('[data-mes]');
      if (filtro) estado.filtro = filtro.dataset.estadoCal;
      else if (modo) estado.vista = modo.dataset.vistaCal;
      else if (dia) estado.dia = estado.dia === dia.dataset.dia ? null : dia.dataset.dia;
      else if (mes) {
        estado.mes = new Date(estado.mes.getFullYear(), estado.mes.getMonth() + Number(mes.dataset.mes), 1);
        estado.dia = null;
      } else if (evento.target.closest('#cal-limpiar-dia')) estado.dia = null;
      else return;
      refrescar();
    });
  }

  return { filtrar, resumir, mostrarTodo, iniciar };
})();

CalendarioUI.iniciar();
