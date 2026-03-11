const solicitudesDao = require('../dao/solicitudesDao');

const getSolicitudes = async (req, res) => {
  try {
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const solicitudes = await solicitudesDao.findByUsuarioId(usuario_id);
    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
};

const getSolicitudById = async (req, res) => {
  try {
    const { id } = req.params;
    const solicitud = await solicitudesDao.findById(id);

    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ message: 'Error al obtener solicitud' });
  }
};

const createSolicitud = async (req, res) => {
  try {
    const { usuario_id, material_nombre, fecha_inicio, fecha_fin, motivo } = req.body;

    if (!usuario_id || !material_nombre || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        message: 'usuario_id, material_nombre, fecha_inicio y fecha_fin son obligatorios'
      });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha fin debe ser posterior a la fecha inicio' });
    }

    const solicitud = await solicitudesDao.create({
      usuario_id, material_nombre, fecha_inicio, fecha_fin, motivo
    });

    res.status(201).json(solicitud);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ message: 'Error al crear solicitud' });
  }
};

const cancelSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const solicitud = await solicitudesDao.cancelar(id, usuario_id);
    res.json(solicitud);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ message: 'Error al cancelar solicitud' });
  }
};

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  cancelSolicitud,
};
