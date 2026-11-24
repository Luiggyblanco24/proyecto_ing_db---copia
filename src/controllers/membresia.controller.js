import { query } from '../config/db.js';
import { consultarAfiliados, validarFiltroSubdirectiva } from './afiliado.controller.js';

export async function obtenerAfiliadosVisibles(req, idsAfiliados = null) {
  const consultaReq = idsAfiliados ? { ...req, query: {} } : req;
  if (req.user.roles.includes('Administrador SUTENS')) {
    return consultarAfiliados(consultaReq, null, idsAfiliados);
  }

  const { rows: asignaciones } = await query(
    `SELECT sa.id_subdirectiva, sd.es_principal, cs.nombre AS cargo
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND cs.nombre IN (
         'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General', 'Tesorero General',
         'Presidente', 'Vicepresidente', 'Secretario', 'Fiscal'
       )`,
    [req.user.id_afiliado]
  );

  if (asignaciones.length === 0) {
    return null;
  }

  if (asignaciones.some(({ es_principal, cargo }) => es_principal && cargo.endsWith(' General'))) {
    return consultarAfiliados(consultaReq, null, idsAfiliados);
  }

  const locales = asignaciones.filter(({ es_principal, cargo }) => !es_principal && !cargo.endsWith(' General'));
  if (!locales.length) return null;
  return consultarAfiliados(consultaReq, locales.map(({ id_subdirectiva }) => id_subdirectiva), idsAfiliados);
}

export async function listarAfiliadosVisibles(req, res) {
  if (!validarFiltroSubdirectiva(req, res)) return;
  const afiliados = await obtenerAfiliadosVisibles(req);
  if (!afiliados) {
    return res.status(403).json({ error: 'Tu rol no permite consultar el padrón de afiliados' });
  }
  return res.json(afiliados);
}
