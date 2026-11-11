import { politicaDescargas } from '../middleware/chatbot-download-policy.js';

const INFORMES = Object.freeze({
  afiliados_por_estado: {
    titulo: 'Afiliados por estado',
    filtros: ['estado_sindical'],
    agrupaciones: ['estado'],
  },
  afiliados_por_subdirectiva: {
    titulo: 'Afiliados por subdirectiva',
    filtros: ['estado', 'estado_sindical', 'id_subdirectiva'],
    agrupaciones: ['subdirectiva'],
  },
  afiliados_por_institucion_sede: {
    titulo: 'Afiliados por institución o sede',
    filtros: ['estado', 'estado_sindical', 'id_subdirectiva', 'id_institucion', 'id_sede'],
    agrupaciones: ['institucion', 'sede'],
  },
  aprobaciones_por_mes: {
    titulo: 'Aprobaciones por mes',
    filtros: ['desde', 'hasta'],
    agrupaciones: ['mes'],
  },
});

const ESTADOS_AFILIACION = new Set(['pendiente', 'aprobado', 'rechazado', 'retirado']);
const ESTADOS_SINDICALES = new Set(['activo', 'inactivo']);
const MAX_INTERVALO_DIAS = 366 * 5;

function enteroConfigurado(nombre, predeterminado, minimo, maximo) {
  const valor = process.env[nombre] === undefined ? predeterminado : Number(process.env[nombre]);
  if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new Error(`${nombre} debe ser un entero entre ${minimo} y ${maximo}`);
  }
  return valor;
}

export const configuracionInformes = Object.freeze({
  umbralPrivacidad: enteroConfigurado('CHATBOT_REPORT_MIN_GROUP_SIZE', 5, 2, 100),
  maxFilas: enteroConfigurado('CHATBOT_REPORT_MAX_ROWS', 200, 1, 1000),
  timeoutMs: enteroConfigurado('CHATBOT_REPORT_TIMEOUT_MS', 5000, 100, 30000),
  maxCorreos: politicaDescargas.maxRegistros,
});

export function validarSolicitudInforme(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'La solicitud del informe no es válida' };
  }
  if (Object.keys(body).some((key) => !['informe', 'filtros', 'agrupacion'].includes(key))) {
    return { error: 'La solicitud contiene campos no permitidos' };
  }
  if (typeof body.informe !== 'string' || !Object.hasOwn(INFORMES, body.informe)) {
    return { error: 'El informe seleccionado no es válido' };
  }
  if (body.filtros !== undefined &&
      (typeof body.filtros !== 'object' || body.filtros === null || Array.isArray(body.filtros))) {
    return { error: 'Los filtros del informe no son válidos' };
  }

  const definicion = INFORMES[body.informe];
  const filtros = body.filtros || {};
  if (Object.keys(filtros).some((key) => !definicion.filtros.includes(key))) {
    return { error: 'El informe contiene filtros no permitidos' };
  }

  const normalizados = {};
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === null || valor === '') continue;
    if (clave === 'estado' && typeof valor === 'string' && ESTADOS_AFILIACION.has(valor)) {
      normalizados.estado = valor;
    } else if (clave === 'estado_sindical' && typeof valor === 'string' && ESTADOS_SINDICALES.has(valor)) {
      normalizados.estado_sindical = valor;
    } else if (['id_subdirectiva', 'id_institucion', 'id_sede'].includes(clave) &&
      typeof valor === 'string' && /^[1-9]\d{0,17}$/.test(valor)) {
      normalizados[clave] = valor;
    } else if (clave === 'desde' || clave === 'hasta') {
      if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return { error: 'El periodo del informe no es válido' };
      }
      const fecha = new Date(`${valor}T00:00:00.000Z`);
      if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
        return { error: 'El periodo del informe no es válido' };
      }
      normalizados[clave] = valor;
    } else {
      return { error: `El filtro ${clave} no es válido` };
    }
  }

  if (body.informe === 'afiliados_por_institucion_sede' &&
      normalizados.id_sede && !normalizados.id_institucion) {
    return { error: 'Selecciona la institución para filtrar por sede' };
  }
  if (body.agrupacion !== undefined &&
      (typeof body.agrupacion !== 'string' || !definicion.agrupaciones.includes(body.agrupacion))) {
    return { error: 'La agrupación seleccionada no es válida' };
  }
  if (body.agrupacion !== undefined && body.informe !== 'afiliados_por_institucion_sede') {
    return { error: 'Este informe no admite una agrupación seleccionable' };
  }

  if (body.informe === 'aprobaciones_por_mes') {
    if (Boolean(normalizados.desde) !== Boolean(normalizados.hasta)) {
      return { error: 'Indica las fechas inicial y final del periodo' };
    }
    if (normalizados.desde && normalizados.hasta) {
      const desde = Date.parse(`${normalizados.desde}T00:00:00.000Z`);
      const hasta = Date.parse(`${normalizados.hasta}T00:00:00.000Z`);
      const dias = (hasta - desde) / 86400000;
      if (dias < 0 || dias > MAX_INTERVALO_DIAS) {
        return { error: 'El periodo debe ser válido y no superar cinco años' };
      }
    }
  }

  return {
    informe: body.informe,
    filtros: normalizados,
    agrupacion: body.agrupacion,
  };
}

async function validarFiltrosEstructura(client, filtros) {
  if (!filtros.id_sede && !filtros.id_institucion && !filtros.id_subdirectiva) return true;
  const { rows } = await client.query(
    `SELECT 1
     FROM subdirectiva sd
     LEFT JOIN institucion i ON i.id_subdirectiva = sd.id_subdirectiva
     LEFT JOIN sede s
       ON s.id_institucion = i.id_institucion
      AND s.id_subdirectiva = i.id_subdirectiva
     WHERE sd.es_principal = FALSE
       AND ($1::bigint IS NULL OR sd.id_subdirectiva = $1::bigint)
       AND ($2::bigint IS NULL OR i.id_institucion = $2::bigint)
       AND ($3::bigint IS NULL OR s.id_sede = $3::bigint)
     LIMIT 1`,
    [filtros.id_subdirectiva || null, filtros.id_institucion || null, filtros.id_sede || null]
  );
  return rows.length > 0;
}

function construirConsulta(informe, filtros) {
  const valores = [];
  const condiciones = [];
  const agregarCondicion = (sql, valor) => {
    valores.push(valor);
    condiciones.push(sql.replace('?', `$${valores.length}`));
  };

  if (filtros.estado) agregarCondicion('a.estado = ?', filtros.estado);
  if (filtros.estado_sindical) agregarCondicion('a.estado_sindical = ?', filtros.estado_sindical);
  if (filtros.id_subdirectiva) agregarCondicion('sa.id_subdirectiva = ?', filtros.id_subdirectiva);
  if (filtros.id_institucion) agregarCondicion('s.id_institucion = ?', filtros.id_institucion);
  if (filtros.id_sede) agregarCondicion('s.id_sede = ?', filtros.id_sede);

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  let sql;
  if (informe === 'afiliados_por_estado') {
    sql = `SELECT a.estado AS grupo, a.estado AS grupo_id, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
           FROM afiliado a ${where}
           GROUP BY a.estado ORDER BY a.estado`;
  } else if (informe === 'afiliados_por_subdirectiva') {
    sql = `SELECT sd.nombre AS grupo, sd.id_subdirectiva::text AS grupo_id, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
           FROM afiliado a
           JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
           JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
           WHERE sd.es_principal = FALSE${condiciones.length ? ` AND ${condiciones.join(' AND ')}` : ''}
           GROUP BY sd.id_subdirectiva, sd.nombre
           ORDER BY sd.nombre`;
  } else if (informe === 'afiliados_por_institucion_sede') {
    const agruparPorSede = filtros.agrupacion === 'sede';
    const campoGrupo = agruparPorSede ? 's.nombre' : 'i.nombre';
    const idGrupo = agruparPorSede ? 's.id_sede' : 'i.id_institucion';
    const columnasGrupo = agruparPorSede ? 's.id_sede, s.nombre' : 'i.id_institucion, i.nombre';
    sql = `SELECT ${campoGrupo} AS grupo, ${idGrupo}::text AS grupo_id, COUNT(DISTINCT a.id_afiliado)::int AS cantidad
           FROM afiliado a
           JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
           JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
           JOIN sede s
             ON s.id_sede = sa.id_sede
            AND s.id_subdirectiva = sa.id_subdirectiva
           JOIN institucion i
             ON i.id_institucion = s.id_institucion
            AND i.id_subdirectiva = s.id_subdirectiva
           ${where}
           GROUP BY ${columnasGrupo}
           ORDER BY grupo`;
  } else if (informe === 'aprobaciones_por_mes') {
    const parametrosFecha = [];
    if (filtros.desde) {
      valores.push(filtros.desde);
      parametrosFecha.push(`a.fecha_aprobacion >= $${valores.length}::date`);
      valores.push(filtros.hasta);
      parametrosFecha.push(`a.fecha_aprobacion < ($${valores.length}::date + INTERVAL '1 day')`);
    } else {
      parametrosFecha.push("a.fecha_aprobacion >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'");
    }
    sql = `SELECT to_char(date_trunc('month', a.fecha_aprobacion), 'YYYY-MM') AS grupo,
                  to_char(date_trunc('month', a.fecha_aprobacion), 'YYYY-MM') AS grupo_id,
                  COUNT(*)::int AS cantidad
           FROM afiliado a
           WHERE a.estado = 'aprobado'
             AND a.fecha_aprobacion IS NOT NULL
             AND ${parametrosFecha.join(' AND ')}
           GROUP BY date_trunc('month', a.fecha_aprobacion)
           ORDER BY grupo`;
  } else {
    throw new Error('Código de informe sin consulta');
  }

  valores.push(configuracionInformes.maxFilas + 1);
  return { sql: `${sql} LIMIT $${valores.length}`, valores };
}

export async function ejecutarInformeAgregado(client, solicitud, { incluirGruposInternos = false } = {}) {
  const definicion = INFORMES[solicitud.informe];
  if (!definicion) return { error: 'El informe seleccionado no es válido', status: 400 };
  if (solicitud.informe === 'afiliados_por_institucion_sede' &&
      solicitud.agrupacion !== undefined &&
      !definicion.agrupaciones.includes(solicitud.agrupacion)) {
    return { error: 'La agrupación seleccionada no es válida', status: 400 };
  }

  if (solicitud.informe === 'afiliados_por_institucion_sede' &&
      !solicitud.agrupacion) {
    solicitud = { ...solicitud, agrupacion: 'institucion' };
  }

  if (['afiliados_por_institucion_sede', 'afiliados_por_subdirectiva'].includes(solicitud.informe) &&
      !await validarFiltrosEstructura(client, solicitud.filtros)) {
    return { error: 'Uno o más filtros organizacionales no son válidos', status: 400 };
  }

  const { sql, valores } = construirConsulta(solicitud.informe, {
    ...solicitud.filtros,
    agrupacion: solicitud.agrupacion,
  });
  const { rows } = await client.query(sql, valores);
  if (rows.length > configuracionInformes.maxFilas) {
    return { error: 'El informe tiene demasiados grupos. Agrega filtros para reducir los resultados.', status: 422 };
  }

  const gruposPequenos = rows.filter(
    (fila) => Number(fila.cantidad) < configuracionInformes.umbralPrivacidad
  );
  const gruposSuprimidos = new Set(gruposPequenos);
  if (gruposPequenos.length === 1) {
    const grupoComplementario = rows
      .filter((fila) => !gruposSuprimidos.has(fila))
      .sort((a, b) => Number(a.cantidad) - Number(b.cantidad))[0];
    if (grupoComplementario) gruposSuprimidos.add(grupoComplementario);
  }
  const filasVisibles = rows.filter((fila) => !gruposSuprimidos.has(fila));
  const filas = filasVisibles.map(({ grupo, cantidad }) => ({ grupo, cantidad }));
  const filtrosAplicados = { ...solicitud.filtros };
  const avisos = [];
  if (gruposSuprimidos.size) {
    avisos.push(
      `Se omiten grupos menores de ${configuracionInformes.umbralPrivacidad} y se pueden omitir grupos adicionales para evitar inferencias por resta.`
    );
  }
  if (solicitud.informe === 'afiliados_por_subdirectiva' && filasVisibles.length > 1) {
    const valoresSolapamiento = [filasVisibles.map((fila) => fila.grupo_id)];
    const condiciones = [];
    for (const [clave, columna] of [['estado', 'estado'], ['estado_sindical', 'estado_sindical']]) {
      if (solicitud.filtros[clave]) {
        valoresSolapamiento.push(solicitud.filtros[clave]);
        condiciones.push(`AND a.${columna} = $${valoresSolapamiento.length}`);
      }
    }
    const { rows: solapamiento } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM subdirectiva_afiliado sa
         JOIN subdirectiva_afiliado otra ON otra.id_afiliado = sa.id_afiliado
           AND otra.id_subdirectiva > sa.id_subdirectiva
         JOIN afiliado a ON a.id_afiliado = sa.id_afiliado
         WHERE sa.id_subdirectiva::text = ANY($1::text[])
           AND otra.id_subdirectiva::text = ANY($1::text[])
           ${condiciones.join(' ')}
       ) AS existe`,
      valoresSolapamiento
    );
    if (solapamiento[0].existe) {
      avisos.push(
        'Una persona asignada a varias subdirectivas se cuenta en cada grupo; estos conteos pueden solaparse y no deben sumarse como un total único.'
      );
    }
  }
  if (solicitud.informe === 'aprobaciones_por_mes' && !filtrosAplicados.desde) {
    filtrosAplicados.periodo = 'últimos 12 meses';
  }
  if (solicitud.informe === 'aprobaciones_por_mes') {
    const { rows: fechasFaltantes } = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM afiliado
         WHERE estado = 'aprobado'
           AND fecha_aprobacion IS NULL
       ) AS hay_aprobados_sin_fecha`
    );
    if (fechasFaltantes[0].hay_aprobados_sin_fecha) {
      avisos.push(
        'Hay afiliaciones aprobadas sin fecha de aprobación; se excluyen del informe mensual.'
      );
    }
  }
  return {
    informe: solicitud.informe,
    titulo: definicion.titulo,
    agrupacion: solicitud.agrupacion || definicion.agrupaciones[0],
    filtros: filtrosAplicados,
    alcance: 'global',
    filas,
    avisos,
    privacidad: {
      umbral_minimo: configuracionInformes.umbralPrivacidad,
      hubo_supresion: gruposSuprimidos.size > 0,
    },
    ...(incluirGruposInternos ? { gruposInternos: filasVisibles.map((fila) => fila.grupo_id) } : {}),
  };
}

export async function consultarDatosGruposVisibles(client, solicitud, grupos, tipo = 'correos') {
  if (!grupos.length) return [];
  if (grupos.some((grupo) => typeof grupo !== 'string' || !grupo)) {
    throw new Error('El informe no contiene identificadores internos de grupo válidos');
  }
  const filtros = solicitud.filtros;
  const valores = [grupos];
  const condiciones = [];
  const agregar = (expresion, valor) => {
    valores.push(valor);
    condiciones.push(expresion.replace('?', `$${valores.length}`));
  };
  if (filtros.estado) agregar('a.estado = ?', filtros.estado);
  if (filtros.estado_sindical) agregar('a.estado_sindical = ?', filtros.estado_sindical);
  if (filtros.id_subdirectiva) agregar('sa.id_subdirectiva = ?', filtros.id_subdirectiva);
  if (filtros.id_institucion) agregar('s.id_institucion = ?', filtros.id_institucion);
  if (filtros.id_sede) agregar('s.id_sede = ?', filtros.id_sede);

  let joins = '';
  if (solicitud.informe === 'afiliados_por_estado') {
    condiciones.push('a.estado = ANY($1::text[])');
  } else if (solicitud.informe === 'afiliados_por_subdirectiva') {
    joins = `JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
             JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva`;
    condiciones.push('sd.es_principal = FALSE', 'sd.id_subdirectiva::text = ANY($1::text[])');
  } else if (solicitud.informe === 'afiliados_por_institucion_sede') {
    joins = `JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
             JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva AND sd.es_principal = FALSE
             JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
             JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva`;
    condiciones.push(solicitud.agrupacion === 'sede'
      ? 's.id_sede::text = ANY($1::text[])'
      : 'i.id_institucion::text = ANY($1::text[])');
  } else if (solicitud.informe === 'aprobaciones_por_mes') {
    condiciones.push(
      "a.estado = 'aprobado'",
      'a.fecha_aprobacion IS NOT NULL',
      "to_char(date_trunc('month', a.fecha_aprobacion), 'YYYY-MM') = ANY($1::text[])"
    );
    if (filtros.desde) {
      agregar('a.fecha_aprobacion >= ?::date', filtros.desde);
      agregar("a.fecha_aprobacion < (?::date + INTERVAL '1 day')", filtros.hasta);
    } else {
      condiciones.push("a.fecha_aprobacion >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'");
    }
  } else {
    throw new Error('Código de informe sin consulta de correos');
  }
  if (!['correos', 'afiliados'].includes(tipo)) throw new Error('Tipo de exportación desconocido');
  valores.push(configuracionInformes.maxCorreos + 1);
  const campos = tipo === 'correos' ? 'p.correo' : `p.nombre1, p.nombre2, p.apellido1, p.apellido2,
    p.cedula, p.correo, a.estado, a.estado_sindical, a.id_afiliado`;
  const { rows } = await client.query(
    `SELECT DISTINCT ${campos}
     FROM afiliado a
     JOIN persona p ON p.id_persona = a.id_persona
     ${joins}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY p.correo
     LIMIT $${valores.length}`,
    valores
  );
  if (rows.length > configuracionInformes.maxCorreos) {
    return { error: 'Hay demasiados registros para descargar. Agrega filtros para reducir los resultados.', status: 422 };
  }
  if (tipo === 'correos') return rows.map(({ correo }) => correo);
  const { rows: asignaciones } = await client.query(
    `SELECT DISTINCT ON (sa.id_afiliado) sa.id_afiliado, sd.nombre AS subdirectiva,
            i.nombre AS institucion, s.nombre AS sede, cs.nombre AS cargo_sindical,
            rl.nombre AS rol_laboral
     FROM subdirectiva_afiliado sa
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     LEFT JOIN sede s ON s.id_sede = sa.id_sede AND s.id_subdirectiva = sa.id_subdirectiva
     LEFT JOIN institucion i ON i.id_institucion = s.id_institucion AND i.id_subdirectiva = s.id_subdirectiva
     LEFT JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     LEFT JOIN afiliado_sede afs ON afs.id_afiliado = sa.id_afiliado AND afs.id_sede = sa.id_sede
     LEFT JOIN rol_laboral rl ON rl.id_rol_laboral = afs.id_rol_laboral
     WHERE sa.id_afiliado = ANY($1::bigint[])
       AND ($2::text = ANY(ARRAY['afiliados_por_estado', 'aprobaciones_por_mes'])
         OR (NOT sd.es_principal
           AND ($2 <> 'afiliados_por_subdirectiva' OR sd.id_subdirectiva::text = ANY($3::text[]))
           AND ($2 <> 'afiliados_por_institucion_sede'
             OR CASE WHEN $4 = 'sede' THEN s.id_sede::text = ANY($3::text[])
                     ELSE i.id_institucion::text = ANY($3::text[]) END)
           AND ($5::bigint IS NULL OR sd.id_subdirectiva = $5::bigint)
           AND ($6::bigint IS NULL OR i.id_institucion = $6::bigint)
           AND ($7::bigint IS NULL OR s.id_sede = $7::bigint)))
     ORDER BY sa.id_afiliado, sd.es_principal, sa.id_subdirectiva`,
    [
      rows.map((row) => row.id_afiliado), solicitud.informe, grupos, solicitud.agrupacion || 'institucion',
      filtros.id_subdirectiva || null, filtros.id_institucion || null, filtros.id_sede || null,
    ]
  );
  const porAfiliado = new Map(asignaciones.map((row) => [row.id_afiliado, row]));
  return rows.map((row) => ({ ...row, ...porAfiliado.get(row.id_afiliado) }));
}

export function consultarCorreosGruposVisibles(client, solicitud, grupos) {
  return consultarDatosGruposVisibles(client, solicitud, grupos, 'correos');
}

export function listarInformesDisponibles() {
  return Object.entries(INFORMES).map(([id, informe]) => ({
    id,
    titulo: informe.titulo,
    filtros: informe.filtros,
    agrupaciones: informe.agrupaciones,
  }));
}
