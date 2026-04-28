const pool = require('../db/pool');

const SELECT_FIELDS = `
  s.id,
  s.usuario_id,
  s.material_id,
  TO_CHAR(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
  TO_CHAR(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
  s.motivo,
  s.fecha_solicitud,
  s.prioridad,
  s.motivo_rechazo,
  s.posicion_espera,
  m.nombre AS material_nombre,
  m.icono  AS material_icono,
  m.codigo_modelo AS material_codigo,
  c.nombre AS categoria_nombre,
  CASE
    WHEN p.estado IN ('activo','retrasado') THEN 'en_prestamo'
    WHEN p.estado = 'finalizado' THEN 'finalizada'
    ELSE s.estado::text
  END AS estado
`;

const solicitudesDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN prestamos p ON p.solicitud_id = s.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_solicitud DESC
    `, [usuarioId]);
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN prestamos p ON p.solicitud_id = s.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  countByUsuarioByEstado: async (usuarioId) => {
    const result = await pool.query(`
      SELECT estado::text AS estado, COUNT(*)::int AS total
      FROM solicitudes
      WHERE usuario_id = $1
      GROUP BY estado
    `, [usuarioId]);
    return result.rows;
  },

  create: async ({ usuario_id, material_nombre, material_id, fecha_inicio, fecha_fin, motivo, prioridad, stripe_payment_intent_id }) => {
    let actualMaterialId = material_id;

    if (!actualMaterialId) {
      const found = await pool.query(`
        SELECT m.id
        FROM materiales m
        JOIN unidades_material u ON u.material_id = m.id
        WHERE m.nombre = $1 AND m.activo = TRUE AND u.estado = 'disponible'
        GROUP BY m.id
        ORDER BY m.id ASC
        LIMIT 1
      `, [material_nombre]);

      if (found.rows.length === 0) {
        throw { status: 400, message: 'No hay unidades disponibles de este material' };
      }
      actualMaterialId = found.rows[0].id;
    }

    const result = await pool.query(`
      INSERT INTO solicitudes
        (usuario_id, material_id, fecha_inicio, fecha_fin, motivo, prioridad, stripe_payment_intent_id)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'normal'), $7)
      RETURNING id
    `, [
      usuario_id,
      actualMaterialId,
      fecha_inicio,
      fecha_fin,
      motivo || null,
      prioridad || null,
      stripe_payment_intent_id || null
    ]);

    return solicitudesDao.findById(result.rows[0].id);
  },

  cancelar: async (id, usuarioId) => {
    const result = await pool.query(`
      UPDATE solicitudes
      SET estado = 'cancelada'
      WHERE id = $1 AND usuario_id = $2 AND estado IN ('pendiente','en_espera','aprobada')
      RETURNING id
    `, [id, usuarioId]);

    if (result.rows.length === 0) {
      throw { status: 400, message: 'No se puede cancelar esta solicitud' };
    }

    return solicitudesDao.findById(id);
  }
};

module.exports = solicitudesDao;
