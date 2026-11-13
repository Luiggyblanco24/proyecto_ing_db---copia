import { createHash } from 'node:crypto';

const ventanas = new Map();
const politicas = Object.freeze({
  login: { limite: 20, duracionMs: 15 * 60 * 1000 },
  registro: { limite: 5, duracionMs: 60 * 60 * 1000 },
});
const maximoClaves = 20000;

const limpieza = setInterval(() => {
  const ahora = Date.now();
  for (const [llave, ventana] of ventanas) {
    if (ahora >= ventana.vence) ventanas.delete(llave);
  }
}, 60000);
limpieza.unref();

export function limitarAutenticacion(tipo) {
  const politica = politicas[tipo];
  if (!politica) throw new Error(`Política de autenticación desconocida: ${tipo}`);

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'desconocida';
    const llave = `${tipo}:${createHash('sha256').update(ip).digest('hex')}`;
    const ahora = Date.now();
    let ventana = ventanas.get(llave);

    if (!ventana || ahora >= ventana.vence) {
      if (ventanas.size >= maximoClaves) {
        for (const [clave, valor] of ventanas) {
          if (ahora >= valor.vence) ventanas.delete(clave);
        }
      }
      if (ventanas.size >= maximoClaves) {
        return res.status(503).json({ error: 'El servicio está ocupado. Inténtalo más tarde.' });
      }
      ventana = { intentos: 0, vence: ahora + politica.duracionMs };
      ventanas.set(llave, ventana);
    }

    if (ventana.intentos >= politica.limite) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((ventana.vence - ahora) / 1000))));
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo más tarde.' });
    }

    ventana.intentos += 1;
    return next();
  };
}
