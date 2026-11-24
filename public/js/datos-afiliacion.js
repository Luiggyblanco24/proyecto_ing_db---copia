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
  // Autorización de descuento en Formatodeafiliacionsutens.pdf, página 1.
  cuotaSindical: {
    porcentajeSalarioBasico: 1,
  },
  // Nota al pie del formulario oficial, página 1.
  compromisoEstatutario: 'Al firmar el formulario, el docente se compromete a cumplir y respetar los estatutos de SUTENS.',
};

export function calcularCuotaConsultada(texto) {
  const porcentaje = informacionAfiliacion.cuotaSindical.porcentajeSalarioBasico;
  const salario = texto.trim().match(/^[¿\s]*(?:y )?si (?:mi salario b[áa]sico es(?: de)?|gano)\s+\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?(?:\s+(mill[oó]n|millones))?(?:\s+(?:de pesos|pesos|cop))?\s*[?!.]*$/i);
  if (salario) {
    const cantidad = Number(salario[1].replaceAll('.', '') + '.' + (salario[2] || '0')) * (salario[3] ? 1000000 : 1);
    if (Number.isSafeInteger(cantidad) && cantidad > 0) {
      return 'Con un salario básico de $' + cantidad.toLocaleString('es-CO') + ' COP, el ' + porcentaje +
        ' % equivale a $' + (cantidad * porcentaje / 100).toLocaleString('es-CO') + ' COP al mes.';
    }
  }
  return null;
}
