import { calcularCuotaConsultada, guiaTramiteAfiliacion, informacionAfiliacion, solicitaGuiaAfiliacion } from '../../../public/js/datos-afiliacion.js';
import { beneficios } from './beneficios.js';
import { datosContacto } from './contacto.js';
import { buscarConsultaPublica } from './consultas-publicas.js';

const registro = { texto: 'Iniciar solicitud', url: informacionAfiliacion.registroEnLineaUrl };
const formulario = { texto: 'Ver formulario oficial', url: informacionAfiliacion.formularioPdfUrl };
const whatsapp = { texto: 'Consultar por WhatsApp', url: datosContacto.canales.whatsapp.url };
const porcentaje = informacionAfiliacion.cuotaSindical.porcentajeSalarioBasico;

function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,:;]/g, ' ').trim().replace(/\s+/g, ' ');
}

const cuota = 'El formulario oficial establece una cuota mensual del ' + porcentaje +
  ' % del salario básico, descontada por nómina. Por ejemplo, sobre $3.000.000 COP serían $' +
  (3000000 * porcentaje / 100).toLocaleString('es-CO') + ' COP al mes.';

// Solo interceptamos preguntas completas. Las dudas más específicas pasan al diálogo con contexto.
/** @param {string} texto @param {{role: string, content: string}[]} historial */
export function responderVisitante(texto, historial = []) {
  const q = normalizar(texto);
  if (/^(hola|buenas|buen[oa]s (dias|tardes|noches)|buen dia|saludos)( asistente| sutens)?$/.test(q)) {
    return { texto: '¡Hola! ¿Qué te gustaría saber sobre SUTENS?', enlaces: [] };
  }
  if (/^(en que me (puedes |pueden )?ayuda[rsn]?|que (puedo preguntar|puedes hacer)|ayuda)$/.test(q)) {
    return { texto: 'Puedes preguntarme cómo afiliarte, cuánto aportarías al mes o cómo te acompaña el sindicato. ¿Qué te interesa?', enlaces: [] };
  }
  if (/^(muchas )?gracias( por (la|tu) ayuda)?$/.test(q)) {
    return { texto: '¡Con gusto! Si te surge otra pregunta sobre SUTENS, aquí estoy.', enlaces: [] };
  }
  const preguntaCuota = / y cuanto (cuesta|vale|valdria)( la afiliacion)?$/;
  const tramite = q.replace(/^(si )?soy docente y /, '').replace(preguntaCuota, '')
    .replace(/ (al sindicato|a sutens)$/, '');
  const consultaAfiliacion = /^(quiero afiliarme|me quiero afiliar)( que necesito)?$/.test(tramite) ||
    /^que (documentos |requisitos )?necesito para afiliarme$/.test(tramite) ||
    /^(como me inscribo|como me afilio|como puedo afiliarme|requisitos( de afiliacion)?|que (documentos|requisitos) necesito)$/.test(tramite);
  if (consultaAfiliacion || solicitaGuiaAfiliacion(tramite)) {
    const textoGuia = guiaTramiteAfiliacion + '\nTambién puedes compartir el enlace para iniciar la solicitud en línea.';
    return { texto: preguntaCuota.test(q) ? textoGuia + '\n\n' + cuota : textoGuia, enlaces: [registro, formulario] };
  }
  const anterior = historial.at(-1);
  if (/\b(cuota|descontarian|descuento|aportaria)\b/.test(q) ||
      (anterior?.role === 'assistant' && /cuota mensual|salario básico|afiliación/i.test(anterior.content))) {
    const calculo = calcularCuotaConsultada(texto);
    if (calculo) return { texto: calculo + (q.includes('horas extras') ? ' La base indicada en el formulario es el salario básico.' : ''), enlaces: [formulario] };
  }
  if (/^(cuanto (cuesta|vale|valdria|pago)( (afiliarme|la afiliacion|la cuota))?|cual es la cuota( mensual)?|cuota( sindical)?)$/.test(q)) {
    return { texto: cuota, enlaces: [formulario] };
  }
  if (/^(donde (queda(n)?|esta(n)?) (la sede|la oficina|sutens)|donde (entrego|radico) (el formulario|mi solicitud)|contacto|whatsapp)$/.test(q)) {
    return { texto: 'La sede está en ' + datosContacto.sede.direccionCompleta +
      '. También puedes entregar la solicitud al delegado de tu subdirectiva municipal.', enlaces: [whatsapp] };
  }
  if (/^(que (es|hace|ofrece) (sutens|el sindicato)|que beneficios (tengo|ofrecen)|beneficios|funciones)$/.test(q)) {
    return { texto: datosContacto.sindicato + '. Sus funciones y beneficios incluyen:\n' +
      beneficios.map((item) => '• ' + item.title).join('\n'), enlaces: [{ texto: 'Conocer SUTENS', url: '/Nosotros/' }] };
  }
  const nombreBeneficio = q.replace(/^(que es|que significa|en que consiste) (la |el )?/, '');
  const beneficio = beneficios.find((item) => normalizar(item.title) === nombreBeneficio);
  if (beneficio) return { texto: beneficio.description, enlaces: [] };
  const tema = buscarConsultaPublica(texto);
  if (!tema) return null;
  // Una mención al precio o a Ocaña también puede referirse a un servicio ajeno.
  if (tema.tipo === 'cuota' &&
      !/\b(afiliar\w*|afiliacion|mensual\w*|meses|nomina|salario|cuota|inscripcion|matricula|pago unico|horas extras)\b/.test(q)) return null;
  return { texto: tema.texto, enlaces: tema.enlaces };
}
