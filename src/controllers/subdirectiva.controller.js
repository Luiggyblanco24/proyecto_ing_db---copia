import { pool, query } from '../config/db.js';

const idValido = (valor) => /^\d+$/.test(String(valor));

export async function listarSubdirectivas(req, res) {
  const { rows } = await query(
    `SELECT sd.id_subdirectiva, sd.nombre, sd.es_principal,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id_institucion', i.id_institucion,
                  'nombre', i.nombre,
                  'sedes', COALESCE((
                    SELECT json_agg(json_build_object('id_sede', s.id_sede, 'nombre', s.nombre) ORDER BY s.nombre)
                    FROM sede s
                    WHERE s.id_institucion = i.id_institucion
                  ), '[]'::json)
                ) ORDER BY i.nombre)
                FROM institucion i
                WHERE i.id_subdirectiva = sd.id_subdirectiva
              ),
              '[]'
            ) AS instituciones
     FROM subdirectiva sd
     ORDER BY sd.nombre`,
    []
  );

  return res.json(rows);
}

export async function listarCargosSindicales(req, res) {
  const { rows } = await query(
    'SELECT id_cargo_sindical, nombre, es_repetible FROM cargo_sindical ORDER BY nombre',
    []
  );

  return res.json(rows);
}

export async function listarRolesLaborales(req, res) {
  const { rows } = await query(
    'SELECT id_rol_laboral, nombre FROM rol_laboral ORDER BY nombre',
    []
  );

  return res.json(rows);
}

export async function crearSubdirectiva(req, res) {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'El nombre de la subdirectiva es obligatorio' });

  try {
    const { rows } = await query(
      'INSERT INTO subdirectiva (nombre) VALUES ($1) RETURNING id_subdirectiva, nombre',
      [nombre]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una subdirectiva con ese nombre' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error al crear la subdirectiva' });
  }
}

export async function renombrarSubdirectiva(req, res) {
  const { id } = req.params;
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!idValido(id) || !nombre || nombre.length > 100) {
    return res.status(400).json({ error: 'Indica un nombre de subdirectiva de máximo 100 caracteres' });
  }

  try {
    const { rows } = await query(
      `UPDATE subdirectiva SET nombre = $2
       WHERE id_subdirectiva = $1
       RETURNING id_subdirectiva, nombre, es_principal`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Subdirectiva no encontrada' });
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una subdirectiva con ese nombre' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar la subdirectiva' });
  }
}

export async function crearInstitucion(req, res) {
  const { id } = req.params;
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!idValido(id) || !nombre || nombre.length > 150) {
    return res.status(400).json({ error: 'Selecciona una subdirectiva e indica un nombre de institución de máximo 150 caracteres' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO institucion (id_subdirectiva, nombre)
       VALUES ($1, $2)
       RETURNING id_institucion, id_subdirectiva, nombre`,
      [id, nombre]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'Subdirectiva no encontrada' });
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa institución en la subdirectiva' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear la institución educativa' });
  }
}

export async function renombrarInstitucion(req, res) {
  const { id } = req.params;
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!idValido(id) || !nombre || nombre.length > 150) {
    return res.status(400).json({ error: 'Indica un nombre de institución de máximo 150 caracteres' });
  }

  try {
    const { rows } = await query(
      `UPDATE institucion SET nombre = $2
       WHERE id_institucion = $1
       RETURNING id_institucion, id_subdirectiva, nombre`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Institución educativa no encontrada' });
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa institución en la subdirectiva' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar la institución educativa' });
  }
}

export async function crearSede(req, res) {
  const { id } = req.params;
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!idValido(id) || !nombre || nombre.length > 100) {
    return res.status(400).json({ error: 'Selecciona una institución educativa e indica un nombre de sede de máximo 100 caracteres' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO sede (id_institucion, id_subdirectiva, nombre)
       SELECT i.id_institucion, i.id_subdirectiva, $2
       FROM institucion i
       WHERE i.id_institucion = $1
       RETURNING id_sede, id_institucion, id_subdirectiva, nombre`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Institución educativa no encontrada' });
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa sede en la institución educativa' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear la sede' });
  }
}

export async function renombrarSede(req, res) {
  const { id } = req.params;
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!idValido(id) || !nombre || nombre.length > 100) {
    return res.status(400).json({ error: 'Indica un nombre de sede de máximo 100 caracteres' });
  }

  try {
    const { rows } = await query(
      `UPDATE sede SET nombre = $2
       WHERE id_sede = $1
       RETURNING id_sede, id_institucion, id_subdirectiva, nombre`,
      [id, nombre]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa sede en la institución educativa' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar la sede' });
  }
}

export async function asignarAfiliado(req, res) {
  const { id } = req.params;
  const { id_subdirectiva, id_sede, id_cargo_sindical, id_rol_laboral } = req.body || {};
  if (!idValido(id) || !idValido(id_subdirectiva) ||
      (id_sede && !idValido(id_sede)) ||
      (id_cargo_sindical && !idValido(id_cargo_sindical)) ||
      (id_rol_laboral && !idValido(id_rol_laboral)) ||
      Boolean(id_sede) !== Boolean(id_rol_laboral)) {
    return res.status(400).json({ error: 'Selecciona una subdirectiva; la sede y el rol laboral deben seleccionarse juntos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(781205)');

    const { rows: afiliados } = await client.query(
      `SELECT id_afiliado FROM afiliado
       WHERE id_afiliado = $1 AND estado = 'aprobado'
       FOR UPDATE`,
      [id]
    );
    if (afiliados.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró un afiliado con solicitud aprobada' });
    }

    const { rows: subdirectivas } = await client.query(
      'SELECT id_subdirectiva, es_principal FROM subdirectiva WHERE id_subdirectiva = $1',
      [id_subdirectiva]
    );
    if (subdirectivas.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subdirectiva no encontrada' });
    }

    let sedes = [];
    if (id_sede) {
      const resultadoSedes = await client.query(
      `SELECT s.id_sede, sd.es_principal
       FROM sede s
       JOIN institucion i ON i.id_institucion = s.id_institucion
       JOIN subdirectiva sd ON sd.id_subdirectiva = i.id_subdirectiva
       WHERE s.id_sede = $1 AND s.id_subdirectiva = $2`,
        [id_sede, id_subdirectiva]
      );
      sedes = resultadoSedes.rows;
      if (sedes.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La sede no pertenece a la subdirectiva seleccionada' });
      }
    }

    let cargos = [];
    if (id_cargo_sindical) {
      const resultadoCargos = await client.query(
      'SELECT id_cargo_sindical, nombre, es_repetible FROM cargo_sindical WHERE id_cargo_sindical = $1',
        [id_cargo_sindical]
      );
      cargos = resultadoCargos.rows;
    }
    if (cargos.length === 0) {
      if (id_cargo_sindical) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El cargo sindical seleccionado no existe' });
      }
      if (subdirectivas[0].es_principal) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La Directiva Departamental debe conservar un cargo sindical' });
      }
    }

    if (id_rol_laboral) {
      const { rows: rolesLaborales } = await client.query(
        'SELECT id_rol_laboral FROM rol_laboral WHERE id_rol_laboral = $1',
        [id_rol_laboral]
      );
      if (rolesLaborales.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El rol laboral seleccionado no existe' });
      }
    }

    const cargo = cargos[0];
    const cargoGeneral = cargo && [
      'Presidente General', 'Vicepresidente General', 'Secretario General', 'Fiscal General', 'Tesorero General',
    ].includes(cargo.nombre);
    if ((cargoGeneral && !subdirectivas[0].es_principal) ||
        (cargo && !cargoGeneral && cargo.nombre !== 'Afiliado' && subdirectivas[0].es_principal)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cargo seleccionado no corresponde al tipo de directiva' });
    }

    if (cargo && !cargo.es_repetible) {
      const { rows: ocupantes } = await client.query(
        `SELECT id_afiliado
         FROM subdirectiva_afiliado
         WHERE id_subdirectiva = $1
           AND id_cargo_sindical = $2
           AND id_afiliado <> $3`,
        [id_subdirectiva, id_cargo_sindical, id]
      );
      if (ocupantes.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `El cargo ${cargo.nombre} ya está asignado en esa subdirectiva` });
      }
    }

    if (subdirectivas[0].es_principal) {
      await client.query(
        'DELETE FROM subdirectiva_afiliado WHERE id_afiliado = $1 AND id_subdirectiva = $2',
        [id, id_subdirectiva]
      );
    } else {
      await client.query(
        `DELETE FROM subdirectiva_afiliado sa
         USING subdirectiva sd
         WHERE sa.id_subdirectiva = sd.id_subdirectiva
           AND sa.id_afiliado = $1
           AND sd.es_principal = FALSE`,
        [id]
      );
    }
    await client.query(
      `INSERT INTO subdirectiva_afiliado
         (id_afiliado, id_subdirectiva, id_cargo_sindical, id_sede, es_repetible)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, id_subdirectiva, id_cargo_sindical || null, id_sede || null, cargo?.es_repetible || false]
    );
    if (!subdirectivas[0].es_principal) {
      await client.query('DELETE FROM afiliado_sede WHERE id_afiliado = $1', [id]);
      if (id_sede) {
        await client.query(
          `INSERT INTO afiliado_sede (id_afiliado, id_sede, id_rol_laboral)
           VALUES ($1, $2, $3)`,
          [id, id_sede, id_rol_laboral]
        );
      }
    }
    await client.query(
      `UPDATE afiliado
       SET estado_sindical = 'activo'
       WHERE id_afiliado = $1 AND estado = 'aprobado'`,
      [id]
    );

    await client.query('COMMIT');
    return res.json({ mensaje: 'Afiliación y asignaciones locales actualizadas' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese cargo ya está ocupado en la subdirectiva' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error al asignar el afiliado' });
  } finally {
    client.release();
  }
}

export async function cambiarEstadoSindical(req, res) {
  const { id } = req.params;
  const { estado_sindical } = req.body || {};
  if (!idValido(id) || !['activo', 'inactivo'].includes(estado_sindical)) {
    return res.status(400).json({ error: 'El estado sindical debe ser activo o inactivo' });
  }

  if (estado_sindical === 'activo') {
    const { rows: asignaciones } = await query(
      `SELECT 1 FROM subdirectiva_afiliado WHERE id_afiliado = $1 LIMIT 1`,
      [id]
    );
    if (asignaciones.length === 0) {
      return res.status(409).json({ error: 'Asigna al afiliado a una subdirectiva antes de activarlo' });
    }
  }

  const { rows } = await query(
    `UPDATE afiliado SET estado_sindical = $1
    WHERE id_afiliado = $2 AND estado = 'aprobado'
     RETURNING id_afiliado, estado_sindical`,
    [estado_sindical, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Afiliado aprobado no encontrado' });

  return res.json({ mensaje: 'Estado sindical actualizado', afiliado: rows[0] });
}