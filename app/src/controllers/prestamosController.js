const prestamosDao = require('../dao/prestamosDao');

const getPrestamos = async (req, res) => {
  try {
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const prestamos = await prestamosDao.findByUsuarioId(usuario_id);
    res.json(prestamos);
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    res.status(500).json({ message: 'Error al obtener préstamos' });
  }
};

const getProximos = async (req, res) => {
  try {
    const { usuario_id, limit } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const prestamos = await prestamosDao.proximosVencimientos(usuario_id, parseInt(limit) || 5);
    res.json(prestamos);
  } catch (error) {
    console.error('Error al obtener próximos vencimientos:', error);
    res.status(500).json({ message: 'Error al obtener próximos vencimientos' });
  }
};

module.exports = { getPrestamos, getProximos };
