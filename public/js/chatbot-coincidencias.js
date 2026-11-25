import { normalizarPregunta } from './chatbot-help-search.js';

const comunes = new Set('a al algo algun alguna ante aqui asi como con cual cuales cuando de del el ella ello en es esa ese esta este esto hay la las le lo los me mi mis muy o para pero por puedo puede puedes que quien se si sin sobre soy su sus tengo un una unas uno unos y ya'.split(' '));
const equivalencias = new Map();
for (const grupo of [
  'docente docentes profesor profesores profesora profe profes maestro maestra', 'colega compañero compañera amigo amiga',
  'documento documentos papeles archivo archivos', 'formulario formato planilla',
  'cuota aporte mensualidad', 'costo cuesta vale precio costaria valdria',
  'celular telefono movil', 'correo email', 'contrasena clave password', 'cambiar cambio cambiarlo modificar actualizar actualiza actualizan corregir editar editarlos',
  'estatutos estatuto reglamento', 'afiliar afiliarme afiliarse afilio afiliarlo inscribirme vincularme',
  'solicitud solicitudes peticion', 'sueldo salario', 'sede oficina', 'biblioteca bibliotecas',
  'actividad actividades evento eventos', 'constancia certificado certificacion', 'rol roles permisos',
  'reportes reporte informe informes', 'horario horarios', 'colegio institucion plantel',
  'ver consultar revisar', 'compartir compartes compartirle pasarle pasar compartirlo enviar', 'ayuda ayudar orientar orientacion',
  'beneficio beneficios ventajas', 'educativa educativo pedagogico pedagogica', 'siguiente proximo proxima',
  'descargar bajar descarga', 'guia guias material materiales recursos', 'sindicato sutens',
  'laboral laborales', 'presentar presenta entregar radicar', 'firma firmo firme firmar firmarlo',
  'compromiso comprometo compromete', 'unico unica sola', 'mensual meses mensualmente',
  'pertenece pertenezco pertenencia', 'ingresar entrar ingreso admiten admitir',
  'rectora rector rectores', 'imprimir impresora imprimirlo', 'sabado sabados',
  'abre abren atienden abierto', 'incompleta incompleto faltante falto falta',
]) {
  const palabras = normalizarPregunta(grupo).split(' ');
  for (const palabra of palabras) equivalencias.set(palabra, palabras[0]);
}

function palabras(texto) {
  return new Set(texto.split(' ').filter((p) => p.length > 1 && !comunes.has(p))
    .map((p) => equivalencias.get(p) || p));
}

// Índice invertido en memoria. Solo se puntúan ejemplos con vocabulario compartido.
export function crearBuscadorTemas(temas) {
  const exactos = new Map();
  const indice = new Map();
  let cantidad = 0;
  for (const tema of temas) {
    for (const frase of tema.ejemplos) {
      const normalizada = normalizarPregunta(frase);
      exactos.set(normalizada, tema);
      const tokens = palabras(normalizada);
      const ejemplo = { tema, tokens, peso: 0 };
      cantidad++;
      for (const token of tokens) {
        if (!indice.has(token)) indice.set(token, []);
        indice.get(token).push(ejemplo);
      }
    }
  }
  const pesos = new Map();
  for (const [token, ejemplos] of indice) {
    const peso = 1 + Math.log((cantidad + 1) / (ejemplos.length + 1));
    pesos.set(token, peso);
    for (const ejemplo of ejemplos) ejemplo.peso += peso;
  }
  function ordenar(texto, similitudMinima, coberturaMinima) {
    const consulta = normalizarPregunta(texto);
    if (exactos.has(consulta)) return [[exactos.get(consulta), 1]];
    const candidatos = new Map();
    let total = 0;
    for (const token of palabras(consulta)) {
      const peso = pesos.get(token) || 3;
      total += peso;
      for (const ejemplo of indice.get(token) || []) {
        candidatos.set(ejemplo, (candidatos.get(ejemplo) || 0) + peso);
      }
    }
    const puntajes = new Map();
    for (const [ejemplo, suma] of candidatos) {
      const similitud = 2 * suma / (total + ejemplo.peso);
      if (similitud >= similitudMinima && suma / total >= coberturaMinima) {
        puntajes.set(ejemplo.tema, Math.max(puntajes.get(ejemplo.tema) || 0, similitud));
      }
    }
    return [...puntajes].sort((a, b) => b[1] - a[1]);
  }
  return {
    buscar(texto) {
      const [primero, segundo] = ordenar(texto, 0.56, 0.43);
      return primero && (!segundo || primero[1] - segundo[1] >= 0.06) ? primero[0] : null;
    },
    relacionados(texto) {
      return ordenar(texto, 0.32, 0.25).slice(0, 3).map(([tema]) => tema);
    },
  };
}
