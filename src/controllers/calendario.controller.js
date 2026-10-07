import { query } from '../config/db.js';

const tiposEvento = ['Reunión', 'Asamblea', 'Capacitación', 'Actividad', 'Otro'];
const cargosLocales = ['Presidente', 'Vicepresidente', 'Secretario', 'Fiscal', 'Tesorero'];
const cargosGenerales = [
  'Presidente General',
  'Vicepresidente General',
  'Secretario General',
  'Fiscal General',
  'Tesorero General',
];

async function obtenerCargos(req) {
  if (req.user.roles.includes('Administrador SUTENS')) return [];
  const { rows } = await query(
    `SELECT DISTINCT sa.id_subdirectiva, sd.es_principal, cs.nombre AS cargo
     FROM afiliado a
     JOIN subdirectiva_afiliado sa ON sa.id_afiliado = a.id_afiliado
     JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
     LEFT JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
     WHERE a.id_afiliado = $1 AND a.estado = 'aprobado'`,
    [req.user.id_afiliado]
  );
  return rows;
}

function puedeCrearEventos(req, asignaciones) {
  if (req.user.roles.includes('Administrador SUTENS')) return true;
  return asignaciones.some(({ es_principal, cargo }) =>
    es_principal ? cargosGenerales.includes(cargo) : cargosLocales.includes(cargo)
  );
}

export async function listarEventos(req, res) {
  const asignaciones = await obtenerCargos(req);
  const esAdministrador = req.user.roles.includes('Administrador SUTENS');
  const esDirectivaPrincipal = asignaciones.some(({ es_principal, cargo }) =>
    es_principal && cargosGenerales.includes(cargo)
  );
  const subdirectivasVisibles = [...new Set(asignaciones
    .filter((asignacion) => !asignacion.es_principal)
    .map((asignacion) => String(asignacion.id_subdirectiva)))];

  const { rows } = await query(
            `SELECT e.id_evento, e.titulo, e.tipo, e.estado, e.completado_at,
              e.cancelado_at, e.motivo_cancelacion,
              e.descripcion, e.fecha_inicio, e.fecha_fin, e.lugar,
          sd.id_subdirectiva, sd.nombre AS subdirectiva, sd.es_principal,
          (SELECT COUNT(*)::int FROM evento_asistencia ea
           WHERE ea.id_evento = e.id_evento AND ea.confirmada = TRUE) AS asistentes_confirmados,
          COALESCE((
            SELECT json_agg(
              json_build_object(
                'nombre', concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2),
                'confirmada_at', ea.actualizado_at
              ) ORDER BY p.apellido1, p.nombre1
            )
            FROM evento_asistencia ea
            JOIN afiliado a ON a.id_afiliado = ea.id_afiliado
            JOIN persona p ON p.id_persona = a.id_persona
            WHERE ea.id_evento = e.id_evento AND ea.confirmada = TRUE
          ), '[]'::json) AS asistentes,
          COALESCE((SELECT ea.confirmada FROM evento_asistencia ea
              WHERE ea.id_evento = e.id_evento AND ea.id_afiliado = $3), FALSE) AS mi_asistencia
     FROM evento e
     LEFT JOIN subdirectiva sd ON sd.id_subdirectiva = e.id_subdirectiva
     WHERE e.fecha_inicio >= now() - interval '30 days'
       AND (
         $1::boolean = TRUE
         OR e.id_subdirectiva IS NULL
         OR sd.es_principal = TRUE
         OR e.id_subdirectiva = ANY($2::bigint[])
       )
     ORDER BY
       CASE WHEN e.estado = 'programado' AND e.fecha_inicio >= now() THEN e.fecha_inicio END ASC NULLS LAST,
       CASE WHEN e.estado <> 'programado' OR e.fecha_inicio < now() THEN e.fecha_inicio END DESC`,
    [esAdministrador || esDirectivaPrincipal, subdirectivasVisibles, req.user.id_afiliado]
  );

  return res.json(rows);
}

export async function crearEvento(req, res) {
  const {
    titulo, tipo, descripcion, fecha_inicio: fechaInicio,
    fecha_fin: fechaFin, lugar, id_subdirectiva: idSubdirectivaSolicitada,
  } = req.body || {};
  const nombreEvento = typeof titulo === 'string' ? titulo.trim() : '';
  const tipoEvento = tiposEvento.includes(tipo) ? tipo : '';
  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : null;

  if (!nombreEvento || nombreEvento.length > 200 || !tipoEvento || !Number.isFinite(inicio.getTime())) {
    return res.status(400).json({ error: 'Indica título, tipo y fecha de inicio válidos' });
  }
  if (fechaFin && (!Number.isFinite(fin.getTime()) || fin < inicio)) {
    return res.status(400).json({ error: 'La fecha de finalización debe ser posterior al inicio' });
  }

  const asignaciones = await obtenerCargos(req);
  if (!puedeCrearEventos(req, asignaciones)) {
    return res.status(403).json({ error: 'Solo un administrador o dirigente puede crear actividades' });
  }

  let idSubdirectiva = null;
  if (req.user.roles.includes('Administrador SUTENS')) {
    if (idSubdirectivaSolicitada) {
      idSubdirectiva = String(idSubdirectivaSolicitada);
    } else {
      const { rows: principal } = await query(
        'SELECT id_subdirectiva FROM subdirectiva WHERE es_principal = TRUE',
        []
      );
      idSubdirectiva = principal[0]?.id_subdirectiva || null;
    }
  } else {
    const asignacionPermitida = asignaciones.find(({ es_principal, cargo }) =>
      es_principal ? cargosGenerales.includes(cargo) : cargosLocales.includes(cargo)
    );
    idSubdirectiva = asignacionPermitida.id_subdirectiva;
  }

  if (idSubdirectiva) {
    const { rows: directivas } = await query(
      'SELECT id_subdirectiva FROM subdirectiva WHERE id_subdirectiva = $1',
      [idSubdirectiva]
    );
    if (directivas.length === 0) return res.status(400).json({ error: 'La subdirectiva no existe' });
  }

  const { rows } = await query(
    `INSERT INTO evento (titulo, tipo, descripcion, fecha_inicio, fecha_fin, lugar, id_subdirectiva, id_usuario)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_evento, titulo, tipo, descripcion, fecha_inicio, fecha_fin, lugar, id_subdirectiva`,
    [
      nombreEvento,
      tipoEvento,
      typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null,
      inicio,
      fin,
      typeof lugar === 'string' && lugar.trim() ? lugar.trim() : null,
      idSubdirectiva,
      req.user.id_usuario,
    ]
  );

  return res.status(201).json({ mensaje: 'Actividad agregada al calendario', evento: rows[0] });
}

async function buscarEventoVisible(req, idEvento) {
  if (!/^\d+$/.test(String(idEvento))) return null;
  const asignaciones = await obtenerCargos(req);
  const esAdministrador = req.user.roles.includes('Administrador SUTENS');
  const esDirectivaPrincipal = asignaciones.some(({ es_principal, cargo }) =>
    es_principal && cargosGenerales.includes(cargo)
  );
  const subdirectivasVisibles = [...new Set(asignaciones
    .filter((asignacion) => !asignacion.es_principal)
    .map((asignacion) => String(asignacion.id_subdirectiva)))];
  const { rows } = await query(
    `SELECT e.id_evento, e.id_subdirectiva, e.fecha_inicio, e.estado,
            sd.es_principal
     FROM evento e
     LEFT JOIN subdirectiva sd ON sd.id_subdirectiva = e.id_subdirectiva
     WHERE e.id_evento = $1
       AND (
         $2::boolean = TRUE
         OR e.id_subdirectiva IS NULL
         OR sd.es_principal = TRUE
         OR e.id_subdirectiva = ANY($3::bigint[])
       )`,
    [idEvento, esAdministrador || esDirectivaPrincipal, subdirectivasVisibles]
  );
  return rows[0] ? { evento: rows[0], asignaciones, esAdministrador, esDirectivaPrincipal } : null;
}

function puedeGestionarEvento(req, acceso, evento) {
  if (acceso.esAdministrador || acceso.esDirectivaPrincipal) return true;
  return acceso.asignaciones.some((asignacion) =>
    !asignacion.es_principal &&
    String(asignacion.id_subdirectiva) === String(evento.id_subdirectiva) &&
    cargosLocales.includes(asignacion.cargo)
  );
}

export async function actualizarAsistencia(req, res) {
  const { id } = req.params;
  const { confirmada } = req.body || {};
  if (typeof confirmada !== 'boolean') {
    return res.status(400).json({ error: 'Indica si confirmas la asistencia' });
  }

  const acceso = await buscarEventoVisible(req, id);
  if (!acceso) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (acceso.evento.estado !== 'programado' || new Date(acceso.evento.fecha_inicio) <= new Date()) {
    return res.status(409).json({ error: 'Ya no se puede cambiar la asistencia después del inicio' });
  }

  const { rows } = await query(
    `INSERT INTO evento_asistencia (id_evento, id_afiliado, confirmada, actualizado_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (id_evento, id_afiliado)
     DO UPDATE SET confirmada = EXCLUDED.confirmada, actualizado_at = now()
     RETURNING confirmada`,
    [id, req.user.id_afiliado, confirmada]
  );
  return res.json({ mensaje: confirmada ? 'Asistencia confirmada' : 'Confirmación cancelada', confirmada: rows[0].confirmada });
}

export async function marcarEventoRealizado(req, res) {
  const { id } = req.params;
  const acceso = await buscarEventoVisible(req, id);
  if (!acceso) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (!puedeGestionarEvento(req, acceso, acceso.evento)) {
    return res.status(403).json({ error: 'No tienes permisos para cerrar esta actividad' });
  }
  if (acceso.evento.estado === 'cancelado') {
    return res.status(409).json({ error: 'Una actividad cancelada no se puede marcar como realizada' });
  }
  if (new Date(acceso.evento.fecha_inicio) > new Date()) {
    return res.status(409).json({ error: 'La actividad solo se puede marcar realizada después de su hora de inicio' });
  }
  if (acceso.evento.estado === 'realizado') {
    return res.json({ mensaje: 'La actividad ya estaba marcada como realizada' });
  }

  const { rows } = await query(
    `UPDATE evento SET estado = 'realizado', completado_at = now()
     WHERE id_evento = $1
     RETURNING id_evento, estado, completado_at`,
    [id]
  );
  return res.json({ mensaje: 'Actividad marcada como realizada', evento: rows[0] });
}

export async function cancelarEvento(req, res) {
  const { id } = req.params;
  const acceso = await buscarEventoVisible(req, id);
  if (!acceso) return res.status(404).json({ error: 'Actividad no encontrada' });
  if (!puedeGestionarEvento(req, acceso, acceso.evento)) {
    return res.status(403).json({ error: 'No tienes permisos para cancelar esta actividad' });
  }
  if (acceso.evento.estado !== 'programado') {
    return res.status(409).json({ error: 'Solo se pueden cancelar actividades programadas' });
  }
  if (new Date(acceso.evento.fecha_inicio) <= new Date()) {
    return res.status(409).json({ error: 'La actividad no se puede cancelar después de su hora de inicio' });
  }

  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim().slice(0, 500) : null;
  const { rows } = await query(
    `UPDATE evento
     SET estado = 'cancelado', cancelado_at = now(), motivo_cancelacion = $2
     WHERE id_evento = $1 AND estado = 'programado' AND fecha_inicio > now()
     RETURNING id_evento, estado, cancelado_at`,
    [id, motivo || null]
  );
  if (rows.length === 0) {
    return res.status(409).json({ error: 'La actividad ya no se puede cancelar' });
  }

  return res.json({ mensaje: 'Actividad cancelada', evento: rows[0] });
}