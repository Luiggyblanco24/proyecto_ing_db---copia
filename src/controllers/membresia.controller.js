import { query } from '../config/db.js';
import { consultarAfiliados, validarFiltroSubdirectiva } from './afiliado.controller.js';

export async function obtenerAfiliadosVisibles(req) {
  if (req.user.roles.includes('Administrador SUTENS')) {
    return consultarAfiliados(req);
  }

  const { rows: asignaciones } = await query(
    `SELECT sa.id_subdirectiva, sd.es_principal, cs.nombre AS cargo
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND cs.nombre IN (
         'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General', 'Tesorero General',
         'Presidente', 'Vicepresidente', 'Secretario', 'Fiscal'
       )`,
    [req.user.id_afiliado]
  );

  if (asignaciones.length === 0) {
    return null;
  }

  const asignacion = asignaciones[0];
  if (asignacion.es_principal && asignacion.cargo.endsWith(' General')) {
    return consultarAfiliados(req);
  }

  return consultarAfiliados(req, asignacion.id_subdirectiva);
}

export async function listarAfiliadosVisibles(req, res) {
  if (!validarFiltroSubdirectiva(req, res)) return;
  const afiliados = await obtenerAfiliadosVisibles(req);
  if (!afiliados) {
    return res.status(403).json({ error: 'Tu rol no permite consultar el padrón de afiliados' });
  }
  return res.json(afiliados);
}