/**
 * Configuración de cifras e indicadores de impacto institucional para SUTENS.
 * 
 * Regla: Solo se muestran indicadores con datos reales verificados.
 * Aquellos con valor null o [CONFIRMAR] permanecen estrictamente ocultos en producción.
 */

export const cifrasEstaticas = [
  {
    id: 'afiliados',
    etiqueta: 'Afiliados activos',
    descripcion: 'Docentes y trabajadores en Norte de Santander',
    icono: 'users',
    valor: null, // [CONFIRMAR] - Oculto hasta confirmar cifra real
    visible: false,
  },
  {
    id: 'fundacion',
    etiqueta: 'Años de trayectoria',
    descripcion: 'En defensa de la educación pública',
    icono: 'award',
    valor: null, // [CONFIRMAR] - Oculto hasta confirmar cifra oficial
    visible: false,
  },
];

export const cifrasDinamicasConfig = {
  subdirectivas: {
    etiqueta: 'Subdirectivas',
    descripcion: 'Presencia territorial en Norte de Santander',
    icono: 'map-pin',
    colorFondo: 'bg-white',
    colorIcono: 'text-brand-700',
  },
  cargos: {
    etiqueta: 'Cargos directivos',
    descripcion: 'Directiva y subdirectivas activas',
    icono: 'users',
    colorFondo: 'bg-[#fef3c7]',
    colorIcono: 'text-[#b45309]',
  },
  documentos: {
    etiqueta: 'Documentos públicos',
    descripcion: 'Resoluciones, circulares y actas en consulta abierta',
    icono: 'file',
    colorFondo: 'bg-brand-900',
    colorIcono: 'text-white',
  },
};
