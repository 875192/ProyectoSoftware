const sancionesDao = require('../dao/sancionesDao');

const getSanciones = async (req, res) => {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }
    const sanciones = await sancionesDao.findByUsuarioId(usuario_id);
    res.json(sanciones);
  } catch (error) {
    console.error('Error al obtener sanciones:', error);
    res.status(500).json({ message: 'Error al obtener sanciones' });
  }
};

const getSancionById = async (req, res) => {
  try {
    const { id } = req.params;
    const sancion = await sancionesDao.findById(id);
    if (!sancion) {
      return res.status(404).json({ message: 'Sanción no encontrada' });
    }
    res.json(sancion);
  } catch (error) {
    console.error('Error al obtener sanción:', error);
    res.status(500).json({ message: 'Error al obtener sanción' });
  }
};

module.exports = { getSanciones, getSancionById };
