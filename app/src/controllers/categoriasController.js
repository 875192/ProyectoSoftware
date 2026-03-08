const pool = require('../db/pool');

const getCategorias = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, descripcion FROM categorias ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const result = await pool.query(
      `INSERT INTO categorias (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id, nombre, descripcion`,
      [nombre, descripcion || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear categoría:', error);

    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    res.status(500).json({ message: 'Error al crear categoría' });
  }
};

module.exports = {
  getCategorias,
  createCategoria,
};