const pool = require('../db/pool');

const getMateriales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.codigo_inventario,
        m.nombre,
        m.descripcion,
        m.estado,
        m.categoria_id,
        c.nombre AS categoria_nombre
      FROM materiales m
      JOIN categorias c ON m.categoria_id = c.id
      ORDER BY m.id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener materiales:', error);
    res.status(500).json({ message: 'Error al obtener materiales' });
  }
};

const getCatalogo = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        MIN(m.id) AS id,
        m.nombre,
        MIN(m.descripcion) AS descripcion,
        c.nombre AS categoria_nombre,
        COUNT(*) FILTER (WHERE m.estado = 'disponible') AS stock,
        COUNT(*) AS total
      FROM materiales m
      JOIN categorias c ON m.categoria_id = c.id
      WHERE m.activo = TRUE
      GROUP BY m.nombre, c.nombre
      ORDER BY m.nombre ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener catálogo:', error);
    res.status(500).json({ message: 'Error al obtener catálogo' });
  }
};

const createMaterial = async (req, res) => {
  try {
    const { codigo_inventario, nombre, descripcion, categoria_id } = req.body;

    if (!codigo_inventario || !nombre || !categoria_id) {
      return res.status(400).json({
        message: 'codigo_inventario, nombre y categoria_id son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO materiales (codigo_inventario, nombre, descripcion, categoria_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [codigo_inventario, nombre, descripcion || null, categoria_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear material:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Ya existe un material con ese código de inventario',
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        message: 'La categoría indicada no existe',
      });
    }

    res.status(500).json({ message: 'Error al crear material' });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_inventario, nombre, descripcion, categoria_id, estado } = req.body;

    if (!codigo_inventario || !nombre || !categoria_id || !estado) {
      return res.status(400).json({
        message: 'codigo_inventario, nombre, categoria_id y estado son obligatorios',
      });
    }

    const result = await pool.query(
      `UPDATE materiales
       SET codigo_inventario = $1,
           nombre = $2,
           descripcion = $3,
           categoria_id = $4,
           estado = $5
       WHERE id = $6
       RETURNING *`,
      [codigo_inventario, nombre, descripcion || null, categoria_id, estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar material:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Ya existe un material con ese código de inventario',
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        message: 'La categoría indicada no existe',
      });
    }

    res.status(500).json({ message: 'Error al actualizar material' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM materiales WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    res.json({ message: 'Material eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    res.status(500).json({ message: 'Error al eliminar material' });
  }
};

module.exports = {
  getMateriales,
  getCatalogo,
  createMaterial,
  updateMaterial,
  deleteMaterial,
};