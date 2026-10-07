import { query } from '../config/db.js';

const cargosDirectivaDepartamental = [
  'Presidente General',
  'Vicepresidente General',
  'Secretario General',
  'Fiscal General',
  'Tesorero General',
];

async function esDirectivaDepartamental(req) {
  if (req.user.roles.includes('Administrador SUTENS')) return true;

  const { rows } = await query(
    `SELECT 1
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = TRUE
     JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
       AND a.estado_sindical = 'activo'
       AND cs.nombre = ANY($2::text[])
     LIMIT 1`,
    [req.user.id_afiliado, cargosDirectivaDepartamental]
  );

  return rows.length > 0;
}

async function obtenerEstadisticasDepartamentales() {
  const [total, subdirectivas, crecimiento] = await Promise.all([
    query("SELECT COUNT(*)::int AS total FROM afiliado WHERE estado = 'aprobado'", []),
    query(
      `SELECT sd.id_subdirectiva, sd.nombre, COUNT(DISTINCT a.id_afiliado)::int AS total_afiliados
       FROM subdirectiva sd
       LEFT JOIN subdirectiva_afiliado sa ON sa.id_subdirectiva = sd.id_subdirectiva
       LEFT JOIN afiliado a ON a.id_afiliado = sa.id_afiliado AND a.estado = 'aprobado'
       WHERE sd.es_principal = FALSE
       GROUP BY sd.id_subdirectiva, sd.nombre
       ORDER BY sd.nombre`,
      []
    ),
    query(
      `WITH meses AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE) - INTERVAL '6 months',
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS inicio
       ),
       altas AS (
         SELECT date_trunc('month', COALESCE(fecha_aprobacion, fecha_solicitud)) AS inicio,
                COUNT(*)::int AS total
         FROM afiliado
         WHERE estado = 'aprobado'
           AND COALESCE(fecha_aprobacion, fecha_solicitud) >= date_trunc('month', CURRENT_DATE) - INTERVAL '6 months'
           AND COALESCE(fecha_aprobacion, fecha_solicitud) < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
         GROUP BY date_trunc('month', COALESCE(fecha_aprobacion, fecha_solicitud))
       )
       SELECT to_char(meses.inicio, 'YYYY-MM') AS mes,
              to_char(meses.inicio, 'TMMonth YYYY') AS etiqueta,
              COALESCE(altas.total, 0)::int AS nuevas_altas
       FROM meses
       LEFT JOIN altas USING (inicio)
       ORDER BY meses.inicio`,
      []
    ),
  ]);

  const altasMes = crecimiento.rows.map((mes, index, meses) => {
    const anteriores = meses[index - 1]?.nuevas_altas ?? null;
    const diferencia = anteriores === null ? null : mes.nuevas_altas - anteriores;
    const porcentaje = anteriores === null || anteriores === 0
      ? null
      : Math.round((diferencia / anteriores) * 1000) / 10;
    return { ...mes, diferencia, porcentaje };
  }).slice(1);

  return {
    alcance: 'departamental',
    total_afiliados: total.rows[0].total,
    subdirectivas: subdirectivas.rows,
    crecimiento: altasMes,
  };
}

async function obtenerEstadisticasSubdirectiva(req, res) {
  const { rows: asignaciones } = await query(
    `SELECT sd.id_subdirectiva, sd.nombre
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
     WHERE a.id_afiliado = $1
       AND a.estado = 'aprobado'
     ORDER BY sd.nombre
     LIMIT 1`,
    [req.user.id_afiliado]
  );

  if (asignaciones.length === 0) {
    return res.status(403).json({ error: 'No tienes una subdirectiva asignada para consultar sus afiliados' });
  }

  const subdirectiva = asignaciones[0];
  const { rows } = await query(
    `SELECT COUNT(DISTINCT a.id_afiliado)::int AS total
     FROM subdirectiva_afiliado sa
     JOIN afiliado a ON a.id_afiliado = sa.id_afiliado
     WHERE sa.id_subdirectiva = $1
       AND a.estado = 'aprobado'`,
    [subdirectiva.id_subdirectiva]
  );

  return res.json({
    alcance: 'subdirectiva',
    nombre_subdirectiva: subdirectiva.nombre,
    total_afiliados: rows[0].total,
  });
}

export async function obtenerEstadisticasAfiliacion(req, res) {
  try {
    if (await esDirectivaDepartamental(req)) {
      return res.json(await obtenerEstadisticasDepartamentales());
    }

    return await obtenerEstadisticasSubdirectiva(req, res);
  } catch (error) {
    console.error('No se pudieron consultar las estadísticas de afiliación:', error);
    return res.status(500).json({ error: 'No se pudieron consultar las estadísticas de afiliación' });
  }
}
