const pool = require('../db/pool');

const notificacionesDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT id, usuario_id, tipo, titulo, texto, leida,
             entidad_tipo, entidad_id, created_at
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY created_at DESC
    `, [usuarioId]);
    return result.rows;
  },

  countNoLeidas: async (usuarioId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notificaciones
       WHERE usuario_id = $1 AND leida = FALSE`,
      [usuarioId]
    );
    return result.rows[0].total;
  },

  markAsRead: async (id, usuarioId) => {
    const result = await pool.query(`
      UPDATE notificaciones
      SET leida = TRUE, leida_at = NOW()
      WHERE id = $1 AND usuario_id = $2
      RETURNING *
    `, [id, usuarioId]);
    return result.rows[0] || null;
  },

  markAllAsRead: async (usuarioId) => {
    const result = await pool.query(`
      UPDATE notificaciones
      SET leida = TRUE, leida_at = NOW()
      WHERE usuario_id = $1 AND leida = FALSE
      RETURNING *
    `, [usuarioId]);
    return result.rows;
  },

  delete: async (id, usuarioId) => {
    const result = await pool.query(
      `DELETE FROM notificaciones
       WHERE id = $1 AND usuario_id = $2
       RETURNING id`,
      [id, usuarioId]
    );
    return result.rows[0] || null;
  }
};

module.exports = notificacionesDao;
