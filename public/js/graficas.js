// Gráficas SVG accesibles y sin dependencias para el panel.
// Solo presentación: recibe los datos ya calculados por el backend.
const Graficas = (() => {
  let contador = 0;

  const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter]);

  const numero = (valor) => {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : 0;
  };

  const formatear = (valor) => numero(valor).toLocaleString('es-CO');

  const idUnico = (prefijo) => {
    contador += 1;
    return `${prefijo}-${contador}`;
  };

  const recortar = (texto, maximo) => {
    const limpio = String(texto ?? '').trim();
    return limpio.length > maximo ? `${limpio.slice(0, Math.max(1, maximo - 1))}…` : limpio;
  };

  const etiquetaCorta = (texto) => {
    const partes = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '';
    const mes = partes[0].slice(0, 3);
    const anio = partes[partes.length - 1];
    return /^\d{4}$/.test(anio) ? `${mes} ${anio.slice(-2)}` : mes;
  };

  const maximoBonito = (valor) => {
    const maximo = Math.max(1, numero(valor));
    if (maximo <= 4) return 4;
    const potencia = 10 ** Math.floor(Math.log10(maximo));
    const normalizado = maximo / potencia;
    const paso = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
    return paso * potencia;
  };

  function barrasHorizontales(datos, opciones = {}) {
    const filas = (Array.isArray(datos) ? datos : [])
      .map((dato) => ({
        etiqueta: String(dato?.etiqueta ?? '').trim(),
        valor: numero(dato?.valor),
      }))
      .filter((dato) => dato.etiqueta !== '');

    if (filas.length === 0) return '';

    const ancho = Math.max(420, numero(opciones.ancho) || 640);
    const altoFila = Math.max(28, numero(opciones.altoFila) || 34);
    const margenIzquierdo = Math.min(Math.max(120, numero(opciones.anchoEtiqueta) || 170), ancho * 0.42);
    const margenDerecho = 58;
    const margenVertical = 8;
    const alto = margenVertical * 2 + filas.length * altoFila;
    const anchoBarra = Math.max(40, ancho - margenIzquierdo - margenDerecho);
    const maximo = Math.max(1, ...filas.map((fila) => fila.valor));
    const id = idUnico('grafica-barras');
    const titulo = escapar(opciones.titulo || 'Afiliados por subdirectiva');
    const descripcion = escapar(
      opciones.descripcion
      || filas.map((fila) => `${fila.etiqueta}: ${formatear(fila.valor)}`).join('. '),
    );

    const contenido = filas.map((fila, indice) => {
      const y = margenVertical + indice * altoFila;
      const centro = y + altoFila / 2;
      const anchoValor = fila.valor > 0
        ? Math.max(4, (fila.valor / maximo) * anchoBarra)
        : 0;
      return `
        <g class="grafica-barra" tabindex="0" role="img" aria-label="${escapar(fila.etiqueta)}: ${formatear(fila.valor)} afiliados">
          <title>${escapar(fila.etiqueta)}: ${formatear(fila.valor)} afiliados</title>
          <text class="grafica__texto grafica__etiqueta" x="0" y="${centro}" dominant-baseline="middle">${escapar(recortar(fila.etiqueta, 27))}</text>
          <rect class="grafica-barra__fondo" x="${margenIzquierdo}" y="${centro - (altoFila - 14) / 2}" width="${anchoBarra}" height="${altoFila - 14}" rx="6"></rect>
          <rect class="grafica-barra__rect" x="${margenIzquierdo}" y="${centro - (altoFila - 14) / 2}" width="${anchoValor}" height="${altoFila - 14}" rx="6"></rect>
          <text class="grafica__valor" x="${ancho - margenDerecho + 8}" y="${centro}" dominant-baseline="middle">${formatear(fila.valor)}</text>
        </g>`;
    }).join('');

    return `<svg class="grafica grafica--barras" viewBox="0 0 ${ancho} ${alto}" role="group" aria-labelledby="${id}-titulo" aria-describedby="${id}-desc" preserveAspectRatio="xMinYMin meet">
      <title id="${id}-titulo">${titulo}</title>
      <desc id="${id}-desc">${descripcion}</desc>
      ${contenido}
    </svg>`;
  }

  function lineaCrecimiento(datos, opciones = {}) {
    const puntos = (Array.isArray(datos) ? datos : [])
      .map((dato) => ({
        etiqueta: String(dato?.etiqueta ?? '').trim(),
        valor: numero(dato?.valor ?? dato?.nuevas_altas),
      }));

    if (puntos.length === 0) return '';

    const ancho = Math.max(420, numero(opciones.ancho) || 640);
    const alto = Math.max(200, numero(opciones.alto) || 240);
    const margen = { arriba: 18, derecha: 18, abajo: 34, izquierda: 44 };
    const anchoUtil = Math.max(40, ancho - margen.izquierda - margen.derecha);
    const altoUtil = Math.max(40, alto - margen.arriba - margen.abajo);
    const maximo = maximoBonito(Math.max(...puntos.map((punto) => punto.valor)));
    const pasoX = puntos.length > 1 ? anchoUtil / (puntos.length - 1) : 0;
    const id = idUnico('grafica-linea');
    const titulo = escapar(opciones.titulo || 'Crecimiento de los últimos 6 meses');
    const descripcion = escapar(
      opciones.descripcion
      || puntos.map((punto) => `${punto.etiqueta}: ${formatear(punto.valor)} altas`).join('. '),
    );

    const coordenadas = puntos.map((punto, indice) => ({
      ...punto,
      x: margen.izquierda + (puntos.length > 1 ? indice * pasoX : anchoUtil / 2),
      y: margen.arriba + altoUtil - (punto.valor / maximo) * altoUtil,
    }));

    const trazo = coordenadas
      .map((punto, indice) => `${indice === 0 ? 'M' : 'L'}${punto.x.toFixed(1)} ${punto.y.toFixed(1)}`)
      .join(' ');

    const area = `${trazo} L${coordenadas[coordenadas.length - 1].x.toFixed(1)} ${(margen.arriba + altoUtil).toFixed(1)} L${coordenadas[0].x.toFixed(1)} ${(margen.arriba + altoUtil).toFixed(1)} Z`;

    const divisiones = 4;
    const rejilla = Array.from({ length: divisiones + 1 }, (_, indice) => {
      const valor = (maximo / divisiones) * indice;
      const y = margen.arriba + altoUtil - (valor / maximo) * altoUtil;
      return `
        <line class="grafica__rejilla" x1="${margen.izquierda}" y1="${y.toFixed(1)}" x2="${ancho - margen.derecha}" y2="${y.toFixed(1)}"></line>
        <text class="grafica__texto" x="${margen.izquierda - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatear(Math.round(valor))}</text>`;
    }).join('');

    const etiquetas = coordenadas.map((punto, indice) => {
      const visible = puntos.length <= 6
        || indice === 0
        || indice === puntos.length - 1
        || indice === Math.floor((puntos.length - 1) / 2);
      if (!visible) return '';
      return `<text class="grafica__texto" x="${punto.x.toFixed(1)}" y="${alto - 10}" text-anchor="middle">${escapar(etiquetaCorta(punto.etiqueta))}</text>`;
    }).join('');

    const nodos = coordenadas.map((punto) => `
      <g class="grafica-punto" tabindex="0" role="img" aria-label="${escapar(punto.etiqueta)}: ${formatear(punto.valor)} altas">
        <title>${escapar(punto.etiqueta)}: ${formatear(punto.valor)} altas</title>
        <circle class="grafica__punto" cx="${punto.x.toFixed(1)}" cy="${punto.y.toFixed(1)}" r="4"></circle>
      </g>`).join('');

    return `<svg class="grafica grafica--linea" viewBox="0 0 ${ancho} ${alto}" role="group" aria-labelledby="${id}-titulo" aria-describedby="${id}-desc" preserveAspectRatio="xMinYMin meet">
      <title id="${id}-titulo">${titulo}</title>
      <desc id="${id}-desc">${descripcion}</desc>
      ${rejilla}
      <path class="grafica__area" d="${area}"></path>
      <path class="grafica__linea" d="${trazo}"></path>
      ${nodos}
      <line class="grafica__eje" x1="${margen.izquierda}" y1="${margen.arriba + altoUtil}" x2="${ancho - margen.derecha}" y2="${margen.arriba + altoUtil}"></line>
      ${etiquetas}
    </svg>`;
  }

  return {
    barrasHorizontales,
    lineaCrecimiento,
    formatear,
  };
})();
