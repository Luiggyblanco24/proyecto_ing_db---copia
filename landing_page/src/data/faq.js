/**
 * Banco de Preguntas Frecuentes (FAQ) de SUTENS.
 * 
 * Regla: Solo las preguntas con `confirmada: true` se publican.
 * Las marcadas con `[CONFIRMAR]` permanecen inactivas.
 * Si hay menos de 3 preguntas confirmadas en total, la sección se oculta automáticamente.
 */

export const preguntasFrecuentes = [
  {
    id: 1,
    pregunta: '¿Quién puede afiliarse a SUTENS?',
    respuesta: 'Pueden afiliarse docentes, directivos docentes y trabajadores administrativos vinculados al sector educativo oficial de Norte de Santander.',
    confirmada: false, // [CONFIRMAR]
  },
  {
    id: 2,
    pregunta: '¿Qué documentos necesito para afiliarme?',
    respuesta: 'Se requiere el formato oficial de afiliación diligenciado y firmado, la autorización de descuento por nómina, fotocopia legible de la cédula de ciudadanía y copia del acta de posesión o resolución de nombramiento.',
    confirmada: false, // [CONFIRMAR]
  },
  {
    id: 3,
    pregunta: '¿Cuánto cuesta la cuota sindical y cómo se descuenta?',
    respuesta: 'El valor de la cuota estatutaria y el mecanismo de descuento por nómina se detallan en la autorización firmada por el afiliado.',
    confirmada: false, // [CONFIRMAR]
  },
  {
    id: 4,
    pregunta: '¿Dónde puedo entregar el formulario de afiliación?',
    respuesta: 'Puedes radicarlo físicamente en nuestra sede principal de Ocaña (Calle 10 Nro. 13 - 37, Oficina 201, Centro), entregarlo con el delegado sindical de tu subdirectiva municipal o recibir orientación directa a través de nuestra línea oficial de WhatsApp (+57 318 521 8787).',
    confirmada: true, // Confirmada con datos de sede y canales oficiales
  },
  {
    id: 5,
    pregunta: '¿Qué pasa con mi afiliación si me traslado de municipio?',
    respuesta: 'La afiliación sindical se traslada a la subdirectiva correspondiente a tu nueva institución en Norte de Santander para mantener tu acompañamiento activo.',
    confirmada: false, // [CONFIRMAR]
  },
  {
    id: 6,
    pregunta: '¿Cómo puedo solicitar el retiro si decido desafiliarme?',
    respuesta: 'El afiliado puede manifestar su voluntad de desvinculación mediante comunicación escrita radicada ante la Directiva Departamental conforme a los estatutos sindicales.',
    confirmada: false, // [CONFIRMAR]
  },
  {
    id: 7,
    pregunta: '¿Qué tipo de asesoría legal reciben los afiliados?',
    respuesta: 'SUTENS brinda orientación jurídica y acompañamiento en temas laborales, defensa de derechos del magisterio y trámites ante las autoridades educativas competentes.',
    confirmada: false, // [CONFIRMAR]
  },
];
