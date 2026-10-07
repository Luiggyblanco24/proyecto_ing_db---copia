export function normalizarNombre(valor) {
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separador, letra) =>
      `${separador}${letra.toLocaleUpperCase('es')}`
    );
}