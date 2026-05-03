const solicitudesDao = require('../dao/solicitudesDao');
const notificacionesDao = require('../dao/notificacionesDao');

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
    const { usuario_id, material_id, material_nombre, fecha_inicio, fecha_fin, motivo, prioridad, stripe_payment_intent_id } = req.body;

    if (!usuario_id || !material_nombre || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        message: 'usuario_id, material_nombre, fecha_inicio y fecha_fin son obligatorios'
      });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha fin debe ser posterior a la fecha inicio' });
    }

    const solicitud = await solicitudesDao.create({
      usuario_id, material_id, material_nombre, fecha_inicio, fecha_fin, motivo, prioridad, stripe_payment_intent_id
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

const getSolicitudesStaff = async (req, res) => {
  try {
    const { estado } = req.query;
    const estadosValidos = ['pendiente','aprobada','rechazada','cancelada','en_espera','expirada'];
    const filtro = estadosValidos.includes(estado) ? estado : null;
    const solicitudes = await solicitudesDao.findAllStaff(filtro);
    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes (staff):', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
};

const aprobarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_user_id } = req.body;

    if (!staff_user_id) {
      return res.status(400).json({ message: 'staff_user_id es obligatorio' });
    }

    const solicitud = await solicitudesDao.aprobar(id, staff_user_id);
    res.json(solicitud);

    notificacionesDao.create({
      usuarioId: solicitud.usuario_id,
      tipo: 'solicitud_aprobada',
      titulo: '¡Solicitud aprobada!',
      texto: `Tu solicitud de "${solicitud.material_nombre}" ha sido aprobada. Pasa a recoger el material.`,
      entidadTipo: 'solicitud',
      entidadId: solicitud.id,
    }).catch(() => {});
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ message: 'Error al aprobar solicitud' });
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_user_id, motivo_rechazo } = req.body;

    if (!staff_user_id || !motivo_rechazo || !motivo_rechazo.trim()) {
      return res.status(400).json({ message: 'staff_user_id y motivo_rechazo son obligatorios' });
    }

    const solicitud = await solicitudesDao.rechazar(id, staff_user_id, motivo_rechazo.trim());
    res.json(solicitud);

    notificacionesDao.create({
      usuarioId: solicitud.usuario_id,
      tipo: 'solicitud_rechazada',
      titulo: 'Solicitud rechazada',
      texto: `Tu solicitud de "${solicitud.material_nombre}" ha sido rechazada. Motivo: ${motivo_rechazo.trim()}`,
      entidadTipo: 'solicitud',
      entidadId: solicitud.id,
    }).catch(() => {});
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ message: 'Error al rechazar solicitud' });
  }
};

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  cancelSolicitud,
  getSolicitudesStaff,
  aprobarSolicitud,
  rechazarSolicitud,
};
