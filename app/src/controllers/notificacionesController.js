const notificacionesDao = require('../dao/notificacionesDao');

const getNotificaciones = async (req, res) => {
  try {
    const { usuario_id } = req.query;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const notificaciones = await notificacionesDao.findByUsuarioId(usuario_id);
    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    const notificacion = await notificacionesDao.markAsRead(id, usuario_id);

    if (!notificacion) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.json(notificacion);
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ message: 'Error al marcar notificación' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }

    await notificacionesDao.markAllAsRead(usuario_id);
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ message: 'Error al marcar notificaciones' });
  }
};

module.exports = { getNotificaciones, markAsRead, markAllAsRead };
