const pool = require('../db/pool');

const sancionesDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT
        s.id,
        s.tipo,
        s.motivo,
        s.importe_centimos,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.pagada,
        s.prestamo_id,
        m.nombre AS material_nombre
      FROM sanciones s
      LEFT JOIN prestamos p ON s.prestamo_id = p.id
      LEFT JOIN unidades_material u ON p.unidad_material_id = u.id
      LEFT JOIN materiales m ON u.material_id = m.id
      WHERE s.usuario_id = $1
      ORDER BY s.fecha_inicio DESC
    `, [usuarioId]);
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(`
      SELECT
        s.id,
        s.usuario_id,
        s.tipo,
        s.motivo,
        s.importe_centimos,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.pagada,
        s.prestamo_id,
        s.pago_id,
        m.nombre AS material_nombre
      FROM sanciones s
      LEFT JOIN prestamos p ON s.prestamo_id = p.id
      LEFT JOIN unidades_material u ON p.unidad_material_id = u.id
      LEFT JOIN materiales m ON u.material_id = m.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  marcarPagada: async (id, pagoId) => {
    const result = await pool.query(`
      UPDATE sanciones
      SET pagada = TRUE,
          activa = FALSE,
          pago_id = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, pagada, activa, pago_id
    `, [id, pagoId]);
    return result.rows[0] || null;
  },

  totalDeudaPendienteCentimos: async (usuarioId) => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(importe_centimos), 0)::int AS total
      FROM sanciones
      WHERE usuario_id = $1 AND activa = TRUE AND pagada = FALSE
    `, [usuarioId]);
    return result.rows[0].total;
  },

  countActivas: async (usuarioId) => {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM sanciones
      WHERE usuario_id = $1 AND activa = TRUE AND pagada = FALSE
    `, [usuarioId]);
    return result.rows[0].total;
  },

  create: async ({ usuarioId, tipo, motivo, importeCentimos, fechaInicio, fechaFin, prestamoId, creadaPor }) => {
    const result = await pool.query(`
      INSERT INTO sanciones
        (usuario_id, tipo, motivo, importe_centimos, fecha_inicio, fecha_fin, prestamo_id, creada_por, activa, pagada)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE)
      RETURNING id, usuario_id, tipo, motivo, importe_centimos, fecha_inicio, fecha_fin, activa, pagada, prestamo_id, creada_por
    `, [usuarioId, tipo, motivo, importeCentimos, fechaInicio, fechaFin || null, prestamoId || null, creadaPor]);
    return result.rows[0];
  },
};

module.exports = sancionesDao;
