export function manejarAsync(controlador) {
  return (req, res, next) => Promise.resolve(controlador(req, res, next)).catch(next);
}

export function responderError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number(error.status ?? error.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({ error: 'La solicitud no es válida.' });
  }
  console.error('Error al atender la API', { metodo: req.method, codigo: error.code || error.name });
  return res.status(500).json({ error: 'No se pudo completar la solicitud.' });
}
