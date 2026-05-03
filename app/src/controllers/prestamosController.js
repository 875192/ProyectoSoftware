const prestamosDao = require('../dao/prestamosDao');
const notificacionesDao = require('../dao/notificacionesDao');

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

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const getEstadisticasMensuales = async (req, res) => {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) return res.status(400).json({ message: 'usuario_id es obligatorio' });

    const rows = await prestamosDao.estadisticasMensuales(usuario_id);
    res.json({
      labels:       rows.map(r => MESES_ES[new Date(r.mes).getUTCMonth()]),
      prestamos:    rows.map(r => r.prestamos),
      devoluciones: rows.map(r => r.devoluciones),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas mensuales:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas mensuales' });
  }
};

const getPrestamosStaff = async (req, res) => {
  try {
    const { estado } = req.query;
    const estadosValidos = ['pendiente','activo','retrasado','finalizado','cancelado'];
    const filtro = estadosValidos.includes(estado) ? estado : null;
    const prestamos = await prestamosDao.findAllStaff(filtro);
    res.json(prestamos);
  } catch (error) {
    console.error('Error al obtener préstamos (staff):', error);
    res.status(500).json({ message: 'Error al obtener préstamos' });
  }
};

const registrarEntrega = async (req, res) => {
  try {
    const { solicitud_id, usuario_id, unidad_material_id, fecha_devolucion_prevista, staff_user_id } = req.body;

    if (!solicitud_id || !usuario_id || !unidad_material_id || !fecha_devolucion_prevista) {
      return res.status(400).json({
        message: 'solicitud_id, usuario_id, unidad_material_id y fecha_devolucion_prevista son obligatorios'
      });
    }

    const prestamo = await prestamosDao.registrarEntrega({
      solicitudId: solicitud_id,
      usuarioId: usuario_id,
      unidadMaterialId: unidad_material_id,
      fechaDevolucionPrevista: fecha_devolucion_prevista,
      staffUserId: staff_user_id || null,
    });

    res.status(201).json(prestamo);

    notificacionesDao.create({
      usuarioId: prestamo.usuario_id,
      tipo: 'general',
      titulo: 'Material entregado',
      texto: `Has recibido "${prestamo.material_nombre}". Recuerda devolverlo antes del ${new Date(prestamo.fecha_devolucion_prevista).toLocaleDateString('es-ES')}.`,
      entidadTipo: 'prestamo',
      entidadId: prestamo.id,
    }).catch(() => {});
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Esta unidad ya tiene un préstamo activo' });
    }
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Error al registrar entrega:', error);
    res.status(500).json({ message: 'Error al registrar la entrega' });
  }
};

const registrarDevolucion = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_user_id } = req.body;

    const prestamo = await prestamosDao.registrarDevolucion(id, staff_user_id || null);
    res.json(prestamo);

    if (prestamo) {
      notificacionesDao.create({
        usuarioId: prestamo.usuario_id,
        tipo: 'general',
        titulo: 'Devolución registrada',
        texto: `La devolución de "${prestamo.material_nombre}" ha sido registrada correctamente. ¡Gracias!`,
        entidadTipo: 'prestamo',
        entidadId: prestamo.id,
      }).catch(() => {});
    }
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Error al registrar devolución:', error);
    res.status(500).json({ message: 'Error al registrar la devolución' });
  }
};

module.exports = { getPrestamos, getProximos, getEstadisticasMensuales, getPrestamosStaff, registrarEntrega, registrarDevolucion };
