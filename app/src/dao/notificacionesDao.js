const pool = require('../db/pool');

const notificacionesDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT id, usuario_id, tipo, asunto, mensaje, leida,
             entidad_tipo, entidad_id, created_at
      FROM notificaciones
      WHERE usuario_id = $1
      ORDER BY created_at DESC
    `, [usuarioId]);
    return result.rows;
  },

  markAsRead: async (id, usuarioId) => {
    const result = await pool.query(`
      UPDATE notificaciones
      SET leida = TRUE
      WHERE id = $1 AND usuario_id = $2
      RETURNING *
    `, [id, usuarioId]);
    return result.rows[0] || null;
  },

  markAllAsRead: async (usuarioId) => {
    const result = await pool.query(`
      UPDATE notificaciones
      SET leida = TRUE
      WHERE usuario_id = $1 AND leida = FALSE
      RETURNING *
    `, [usuarioId]);
    return result.rows;
  }
};

module.exports = notificacionesDao;
