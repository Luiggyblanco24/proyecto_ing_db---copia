/**
 * Información de contacto institucional confirmada de SUTENS.
 * 
 * Regla: Los datos marcados con [CONFIRMAR] (correo, teléfono fijo, horario,
 * otras redes) se omiten estrictamente hasta confirmación oficial.
 */

export const datosContacto = {
  sindicato: 'Sindicato Unitario de Trabajadores de la Educación de Norte de Santander',
  sigla: 'SUTENS',
  lema: 'Defensa de la Educación, Unidad de los Trabajadores',
  sede: {
    direccion: 'Calle 10 Nro. 13 - 37, Oficina 201, Centro',
    ciudad: 'Ocaña, Norte de Santander',
    direccionCompleta: 'Calle 10 Nro. 13 - 37, Oficina 201, Centro de Ocaña, Norte de Santander',
    googleMapsUrl: 'https://maps.google.com/?q=Calle+10+Nro+13-37+Oficina+201+Ocana+Norte+de+Santander',
  },
  canales: {
    whatsapp: {
      numero: '+57 318 521 8787',
      url: 'https://wa.me/573185218787?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20SUTENS',
      urlDirecta: 'https://wa.me/573185218787',
    },
    facebook: {
      nombre: 'SUTENS Oficial',
      url: 'https://www.facebook.com/p/Sutens-Oficial-100068447512371/',
    },
    // Datos en [CONFIRMAR] omitidos:
    telefonoFijo: null,
    correoOficial: null,
    horarioAtencion: null,
  },
  legal: {
    nit: '900.985.372-6',
    registroMinTrabajo: 'No. 001 del 29 de junio de 2016',
  },
};
