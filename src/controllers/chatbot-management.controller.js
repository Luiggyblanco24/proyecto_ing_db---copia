import { query } from '../config/db.js';
import { referenciaAuditoriaChatbot } from '../utils/chatbot-audit.js';

function normalizarCedula(valor) {
  return typeof valor === 'string' ? valor.replace(/[.\s-]/g, '') : '';
}

export async function previsualizarGestionAfiliados(req, res) {
  const cedulasEntrada = req.body?.cedulas;
  if (!Array.isArray(cedulasEntrada) || cedulasEntrada.length < 1 || cedulasEntrada.length > 50 ||
      cedulasEntrada.some((cedula) => typeof cedula !== 'string' || !/^\d{5,20}$/.test(normalizarCedula(cedula)))) {
    return res.status(400).json({ error: 'Pega entre 1 y 50 cédulas numéricas válidas.' });
  }

  const cedulas = cedulasEntrada.map(normalizarCedula);
  if (new Set(cedulas).size !== cedulas.length) {
    return res.status(400).json({ error: 'La lista contiene cédulas repetidas. Revísala y vuelve a intentarlo.' });
  }

  try {
    const { rows } = await query(
      `WITH solicitadas AS (
         SELECT cedula, orden
         FROM unnest($1::text[]) WITH ORDINALITY AS entrada(cedula, orden)
       )
       SELECT solicitadas.cedula AS cedula_consultada,
              a.id_afiliado, a.estado, a.estado_sindical,
              concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) AS nombre,
              asignacion.id_subdirectiva, asignacion.subdirectiva,
              asignacion.id_sede, asignacion.sede,
              asignacion.id_cargo_sindical, asignacion.cargo_sindical,
              asignacion.id_rol_laboral, asignacion.rol_laboral
       FROM solicitadas
       LEFT JOIN persona p ON regexp_replace(p.cedula, '[^0-9]', '', 'g') = solicitadas.cedula
       LEFT JOIN afiliado a ON a.id_persona = p.id_persona
       LEFT JOIN LATERAL (
         SELECT sa.id_subdirectiva, sd.nombre AS subdirectiva, sa.id_sede, s.nombre AS sede,
                sa.id_cargo_sindical, cs.nombre AS cargo_sindical,
                afs.id_rol_laboral, rl.nombre AS rol_laboral
         FROM subdirectiva_afiliado sa
         JOIN subdirectiva sd ON sd.id_subdirectiva = sa.id_subdirectiva
         LEFT JOIN sede s ON s.id_sede = sa.id_sede
         LEFT JOIN cargo_sindical cs ON cs.id_cargo_sindical = sa.id_cargo_sindical
         LEFT JOIN afiliado_sede afs ON afs.id_afiliado = sa.id_afiliado AND afs.id_sede = sa.id_sede
         LEFT JOIN rol_laboral rl ON rl.id_rol_laboral = afs.id_rol_laboral
         WHERE sa.id_afiliado = a.id_afiliado
         ORDER BY sd.es_principal, sa.id_subdirectiva
         LIMIT 1
       ) asignacion ON TRUE
       ORDER BY solicitadas.orden`,
      [cedulas]
    );
    const afiliados = rows.map((afiliado) => ({
      ...afiliado,
      cedula_mascarada: afiliado.cedula_consultada.length > 4
        ? `••••${afiliado.cedula_consultada.slice(-4)}`
        : '••••',
      cedula_consultada: undefined,
    }));
    console.info(JSON.stringify({
      evento: 'chatbot_gestion_previsualizacion',
      ocurrido_at: new Date().toISOString(),
      resultado: '200',
      cantidad_solicitada: afiliados.length,
      encontrados: afiliados.filter((afiliado) => afiliado.id_afiliado).length,
      actor_ref: referenciaAuditoriaChatbot(req),
    }));
    return res.json({ afiliados });
  } catch (error) {
    console.error('No se pudo preparar la vista previa de gestión del chatbot.');
    return res.status(500).json({ error: 'No se pudo consultar la lista. Inténtalo de nuevo.' });
  }
}
