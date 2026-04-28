const pool = require('../db/pool');

const getCatalogo = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.codigo_modelo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.plazo_max_dias,
        m.popularidad,
        m.requiere_pago,
        m.precio_caucion_centimos,
        c.id   AS categoria_id,
        c.nombre AS categoria_nombre,
        COUNT(u.id) FILTER (WHERE u.estado = 'disponible') AS stock,
        COUNT(u.id) AS total
      FROM materiales m
      JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN unidades_material u ON u.material_id = m.id
      WHERE m.activo = TRUE
      GROUP BY m.id, c.id, c.nombre
      ORDER BY m.popularidad DESC, m.nombre ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener catálogo:', error);
    res.status(500).json({ message: 'Error al obtener catálogo' });
  }
};

const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        m.id,
        m.codigo_modelo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.plazo_max_dias,
        m.popularidad,
        m.requiere_pago,
        m.precio_caucion_centimos,
        c.id   AS categoria_id,
        c.nombre AS categoria_nombre,
        COUNT(u.id) FILTER (WHERE u.estado = 'disponible') AS stock,
        COUNT(u.id) AS total,
        COUNT(u.id) FILTER (WHERE u.estado IN ('averiada','mantenimiento')) AS incidencias_recientes,
        COALESCE(
          (
            SELECT JSONB_AGG(co.texto ORDER BY co.orden)
            FROM material_condiciones_uso co
            WHERE co.material_id = m.id
          ),
          '[]'::jsonb
        ) AS condiciones,
        CASE
          WHEN COUNT(u.id) FILTER (WHERE u.estado = 'disponible') > 0 THEN 'disponible'
          WHEN COUNT(u.id) FILTER (WHERE u.estado = 'mantenimiento') = COUNT(u.id) THEN 'mantenimiento'
          WHEN COUNT(u.id) FILTER (WHERE u.estado = 'averiada') > 0 THEN 'averiado'
          WHEN COUNT(u.id) = 0 THEN 'fuera_servicio'
          ELSE 'prestado'
        END AS estado
      FROM materiales m
      JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN unidades_material u ON u.material_id = m.id
      WHERE m.id = $1 AND m.activo = TRUE
      GROUP BY m.id, c.id, c.nombre
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener material:', error);
    res.status(500).json({ message: 'Error al obtener material' });
  }
};

const getTopMaterial = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.codigo_modelo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.plazo_max_dias,
        m.popularidad,
        c.nombre AS categoria_nombre,
        COUNT(u.id) FILTER (WHERE u.estado = 'disponible') AS stock,
        COUNT(u.id) AS total
      FROM materiales m
      JOIN categorias c ON m.categoria_id = c.id
      LEFT JOIN unidades_material u ON u.material_id = m.id
      WHERE m.activo = TRUE
      GROUP BY m.id, c.id, c.nombre
      ORDER BY m.popularidad DESC, m.nombre ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No hay materiales en el catálogo' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener top material:', error);
    res.status(500).json({ message: 'Error al obtener material destacado' });
  }
};

const createMaterial = async (req, res) => {
  try {
    const { codigo_modelo, nombre, descripcion, categoria_id, icono, plazo_max_dias } = req.body;

    if (!codigo_modelo || !nombre || !categoria_id || !descripcion) {
      return res.status(400).json({
        message: 'codigo_modelo, nombre, descripcion y categoria_id son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO materiales (codigo_modelo, nombre, descripcion, categoria_id, icono, plazo_max_dias)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'box'), COALESCE($6, 7))
       RETURNING *`,
      [codigo_modelo, nombre, descripcion, categoria_id, icono, plazo_max_dias]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear material:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un material con ese código' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'La categoría indicada no existe' });
    }
    res.status(500).json({ message: 'Error al crear material' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE materiales SET activo = FALSE WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }
    res.json({ message: 'Material desactivado correctamente' });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    res.status(500).json({ message: 'Error al eliminar material' });
  }
};

module.exports = {
  getCatalogo,
  getMaterialById,
  getTopMaterial,
  createMaterial,
  deleteMaterial,
};
