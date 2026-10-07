import { query } from '../config/db.js';

// Middleware RBAC: exige que el usuario tenga al menos uno de los roles indicados.
// Uso: router.get('/ruta', autenticar, autorizar('Administrador SUTENS'), handler)
export function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];

    const permitido = rolesPermitidos.some((rol) => roles.includes(rol));
    if (!permitido) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

function autorizarCargoPrincipal(cargosPermitidos) {
  return async (req, res, next) => {
    if (req.user?.roles?.includes('Administrador SUTENS')) return next();

    try {
      const { rows } = await query(
        `SELECT cs.nombre
         FROM afiliado a
         JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
         JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
         JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
         WHERE a.id_afiliado = $1
           AND a.estado = 'aprobado'
           AND a.estado_sindical = 'activo'
           AND sd.es_principal = TRUE
           AND cs.nombre = ANY($2::text[])
         LIMIT 1`,
        [req.user.id_afiliado, cargosPermitidos]
      );

      if (rows.length === 0) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }

      req.cargoDirectivaPrincipal = rows[0].nombre;
      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'No se pudieron verificar tus permisos' });
    }
  };
}

export function autorizarDirectivaPrincipal() {
  return autorizarCargoPrincipal([
    'Presidente General',
    'Vicepresidente General',
    'Secretario General',
    'Fiscal General',
    'Tesorero General',
  ]);
}

export function autorizarSecretarioGeneral() {
  return autorizarCargoPrincipal(['Secretario General']);
}
