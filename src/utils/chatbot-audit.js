import { createHmac } from 'node:crypto';

export function referenciaAuditoriaChatbot(req) {
  const idUsuario = req.user?.id_usuario;
  const secreto = process.env.JWT_SECRET;
  if (idUsuario === undefined || idUsuario === null || !secreto) return undefined;

  return createHmac('sha256', secreto)
    .update(String(idUsuario))
    .digest('hex')
    .slice(0, 16);
}
