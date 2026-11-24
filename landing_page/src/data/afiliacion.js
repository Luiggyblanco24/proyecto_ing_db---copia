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

export { documentosRequeridos, informacionAfiliacion } from '../../../public/js/datos-afiliacion.js';
