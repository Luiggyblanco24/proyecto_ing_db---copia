/**
 * Información y proceso de afiliación institucional para SUTENS.
 * Contiene pasos, requisitos documentales y canales de atención.
 */

export const pasosAfiliacion = [
  {
    numero: 1,
    titulo: 'Descarga el formulario',
    descripcion: 'Obtén el formato oficial de afiliación en formato PDF listo para imprimir.',
    icono: 'download',
    enlace: {
      texto: 'Descargar formulario PDF',
      url: '/Formatodeafiliacionsutens.pdf',
      download: true,
    },
  },
  {
    numero: 2,
    titulo: 'Diligencia y firma',
    descripcion: 'Completa tus datos personales, información laboral y firma la autorización de descuento por nómina.',
    icono: 'file-text',
  },
  {
    numero: 3,
    titulo: 'Entrega o solicita asesoría',
    descripcion: 'Entrégalo en la oficina de Ocaña (Calle 10 Nro. 13 - 37, Of. 201), con el delegado de tu subdirectiva o contáctanos por WhatsApp.',
    icono: 'check-circle',
    enlace: {
      texto: 'Escríbenos por WhatsApp',
      url: 'https://wa.me/573185218787',
      external: true,
    },
  },
];

export const documentosRequeridos = [
  {
    id: 'formato',
    nombre: 'Formato de afiliación firmado',
    detalle: 'Completado con datos personales y de contacto actualizados.',
  },
  {
    id: 'autorizacion',
    nombre: 'Autorización de descuento por nómina',
    detalle: 'Firmada para el trámite correspondiente ante la secretaría de educación.',
  },
  {
    id: 'cedula',
    nombre: 'Fotocopia de la cédula de ciudadanía',
    detalle: 'Copia legible del documento de identidad.',
  },
  {
    id: 'nombramiento',
    nombre: 'Acta de posesión o resolución de nombramiento',
    detalle: 'Copia del documento que certifica tu vinculación educativa.',
  },
];

export const informacionAfiliacion = {
  registroEnLineaUrl: '/register.html',
  formularioPdfUrl: '/Formatodeafiliacionsutens.pdf',
  whatsappUrl: 'https://wa.me/573185218787',
  whatsappTelefono: '+57 318 521 8787',
  sedeFisica: 'Calle 10 Nro. 13 - 37, Oficina 201, Centro de Ocaña, Norte de Santander',
  // Cuota sindical en [CONFIRMAR]: permanece desactivada y no se muestra en la interfaz
  cuotaSindical: {
    valor: null, // [CONFIRMAR]
    visible: false,
  },
};
