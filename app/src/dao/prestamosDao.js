const pool = require('../db/pool');

const SELECT_FIELDS = `
  p.id,
  p.solicitud_id,
  p.usuario_id,
  p.fecha_entrega,
  p.fecha_devolucion_prevista,
  p.fecha_devolucion_real,
  p.estado,
  m.id   AS material_id,
  m.nombre AS material_nombre,
  m.icono  AS material_icono,
  m.codigo_modelo AS material_codigo,
  c.nombre AS categoria_nombre,
  u.codigo_inventario
`;

const prestamosDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM prestamos p
      JOIN unidades_material u ON p.unidad_material_id = u.id
      JOIN materiales m ON u.material_id = m.id
      JOIN categorias c ON m.categoria_id = c.id
      WHERE p.usuario_id = $1
      ORDER BY p.fecha_entrega DESC
    `, [usuarioId]);
    return result.rows;
  },

  countActivosByUsuario: async (usuarioId) => {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM prestamos
      WHERE usuario_id = $1 AND estado IN ('activo', 'retrasado')
    `, [usuarioId]);
    return result.rows[0].total;
  },

  countByEstadoByUsuario: async (usuarioId) => {
    const result = await pool.query(`
      SELECT estado::text AS estado, COUNT(*)::int AS total
      FROM prestamos
      WHERE usuario_id = $1
      GROUP BY estado
    `, [usuarioId]);
    return result.rows;
  },

  proximosVencimientos: async (usuarioId, limit = 5) => {
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM prestamos p
      JOIN unidades_material u ON p.unidad_material_id = u.id
      JOIN materiales m ON u.material_id = m.id
      JOIN categorias c ON m.categoria_id = c.id
      WHERE p.usuario_id = $1
        AND p.estado IN ('activo', 'retrasado')
      ORDER BY p.fecha_devolucion_prevista ASC
      LIMIT $2
    `, [usuarioId, limit]);
    return result.rows;
  },

  estadisticasMensuales: async (usuarioId) => {
    const result = await pool.query(`
      WITH
      meses AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '11 months',
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS mes
      ),
      prestamos_mes AS (
        SELECT date_trunc('month', fecha_entrega) AS mes, COUNT(*)::int AS total
        FROM prestamos
        WHERE usuario_id = $1
          AND fecha_entrega >= date_trunc('month', NOW()) - INTERVAL '11 months'
        GROUP BY 1
      ),
      devoluciones_mes AS (
        SELECT date_trunc('month', fecha_devolucion_real) AS mes, COUNT(*)::int AS total
        FROM prestamos
        WHERE usuario_id = $1
          AND fecha_devolucion_real IS NOT NULL
          AND fecha_devolucion_real >= date_trunc('month', NOW()) - INTERVAL '11 months'
        GROUP BY 1
      )
      SELECT
        m.mes,
        COALESCE(p.total, 0) AS prestamos,
        COALESCE(d.total, 0) AS devoluciones
      FROM meses m
      LEFT JOIN prestamos_mes    p ON p.mes = m.mes
      LEFT JOIN devoluciones_mes d ON d.mes = m.mes
      ORDER BY m.mes ASC
    `, [usuarioId]);
    return result.rows;
  }
};

module.exports = prestamosDao;
