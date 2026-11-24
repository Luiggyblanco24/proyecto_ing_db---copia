import { documentosRequeridos, informacionAfiliacion } from './afiliacion.js';
import { beneficios } from './beneficios.js';
import { datosContacto } from './contacto.js';

const registro = { texto: 'Iniciar solicitud', url: informacionAfiliacion.registroEnLineaUrl };
const formulario = { texto: 'Ver formulario oficial', url: informacionAfiliacion.formularioPdfUrl };
const whatsapp = { texto: 'Consultar por WhatsApp', url: datosContacto.canales.whatsapp.url };

export function responderVisitante(texto) {
  const q = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parrafos = [];
  const enlaces = new Set();
  const afiliacion = /\b(afiliar\w*|afilio|afiliacion|inscrib\w*|registro|registrar\w*|requisitos?|documentos?|formulario|que necesito)\b/.test(q);
  const costo = /\b(cuest[ae]|cost[oa]s?|precio|vale|valor|valdria|cuotas?|pago|pagar|porcentaje|descuent\w*|descont\w*|nomina|gratis|gratuit\w*)\b/.test(q) ||
    /^(?:[¿\s]*y\s+)?[¿\s]*cuanto(?: seria)?[?\s]*$/.test(q);
  const entrega = /\b(entreg\w*|radic\w*|sede|direccion|ubicacion|oficina|contact\w*|whatsapp|telefono)\b/.test(q);
  if (afiliacion && (!costo || /\b(necesito|requisitos?|documentos?|quiero|como)\b/.test(q))) {
    parrafos.push('Puedes iniciar tu solicitud en línea o diligenciar el formulario en papel. Para el trámite documental, prepara:\n' +
      documentosRequeridos.map((doc) => '• ' + doc.nombre).join('\n'));
    enlaces.add(registro).add(formulario);
  }
  if (costo) {
    const cuota = informacionAfiliacion.cuotaSindical;
    parrafos.push('Según la autorización del formulario oficial, la cuota mensual es el ' + cuota.porcentajeSalarioBasico +
      ' % del salario básico y se descuenta por nómina. Por ejemplo, con un salario básico de $3.000.000 COP, la cuota sería de $' +
      (3000000 * cuota.porcentajeSalarioBasico / 100).toLocaleString('es-CO') + ' COP al mes.');
    enlaces.add(formulario);
  }
  if (entrega) {
    parrafos.push('Puedes entregar el formulario en ' + datosContacto.sede.direccionCompleta +
      ' o al delegado de tu subdirectiva municipal. Para orientación, el WhatsApp institucional es ' + datosContacto.canales.whatsapp.numero + '.');
    enlaces.add(whatsapp);
  }
  const beneficio = beneficios.find((item) => q.includes(item.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  if (beneficio) {
    parrafos.push(beneficio.title + '. ' + beneficio.description);
  } else if (/\b(beneficios?|funciones?|servicios?|hace|ofrece|defiende|que es sutens|que es el sindicato|ayudan)\b/.test(q)) {
    parrafos.push(datosContacto.sindicato + '. Sus funciones y beneficios incluyen:\n' +
      beneficios.map((item) => '• ' + item.title).join('\n'));
    enlaces.add({ texto: 'Conocer SUTENS', url: '/Nosotros/' });
  }
  if (!parrafos.length) {
    parrafos.push('Puedo orientarte sobre requisitos, cuota mensual, beneficios y dónde entregar tu solicitud. Para otra consulta, puedes hablar con SUTENS por WhatsApp.');
    enlaces.add(whatsapp);
  }
  return { texto: parrafos.join('\n\n'), enlaces: [...enlaces] };
}
