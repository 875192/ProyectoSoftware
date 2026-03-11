const pool = require('../db/pool');

const solicitudesDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.material_id,
        TO_CHAR(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        s.motivo,
        s.fecha_solicitud,
        m.nombre AS material_nombre,
        CASE
          WHEN p.estado = 'activo' OR p.estado = 'retrasado' THEN 'en_prestamo'
          WHEN p.estado = 'finalizado' THEN 'finalizada'
          ELSE s.estado::text
        END AS estado
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      LEFT JOIN prestamos p ON p.solicitud_id = s.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_solicitud DESC
    `, [usuarioId]);
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.material_id,
        TO_CHAR(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        s.motivo,
        s.estado,
        m.nombre AS material_nombre
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  create: async ({ usuario_id, material_nombre, fecha_inicio, fecha_fin, motivo }) => {
    const available = await pool.query(`
      SELECT id FROM materiales
      WHERE nombre = $1 AND estado = 'disponible' AND activo = TRUE
      ORDER BY id ASC LIMIT 1
    `, [material_nombre]);

    if (available.rows.length === 0) {
      throw { status: 400, message: 'No hay unidades disponibles de este material' };
    }

    const actualMaterialId = available.rows[0].id;

    const result = await pool.query(`
      INSERT INTO solicitudes (usuario_id, material_id, fecha_inicio, fecha_fin, motivo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [usuario_id, actualMaterialId, fecha_inicio, fecha_fin, motivo || null]);

    // Return with material name
    const full = await pool.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.material_id,
        TO_CHAR(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        s.motivo,
        s.estado::text,
        m.nombre AS material_nombre
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      WHERE s.id = $1
    `, [result.rows[0].id]);

    return full.rows[0];
  },

  cancelar: async (id, usuarioId) => {
    const result = await pool.query(`
      UPDATE solicitudes
      SET estado = 'cancelada'
      WHERE id = $1 AND usuario_id = $2 AND estado = 'pendiente'
      RETURNING *
    `, [id, usuarioId]);

    if (result.rows.length === 0) {
      throw { status: 400, message: 'No se puede cancelar esta solicitud' };
    }

    const full = await pool.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.material_id,
        TO_CHAR(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
        s.motivo,
        s.estado::text,
        m.nombre AS material_nombre
      FROM solicitudes s
      JOIN materiales m ON s.material_id = m.id
      WHERE s.id = $1
    `, [id]);

    return full.rows[0];
  }
};

module.exports = solicitudesDao;
