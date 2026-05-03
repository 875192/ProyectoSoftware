const sancionesDao = require('../dao/sancionesDao');
const notificacionesDao = require('../dao/notificacionesDao');

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

const createSancion = async (req, res) => {
  try {
    const { usuario_id, tipo, motivo, importe_centimos, fecha_inicio, fecha_fin, prestamo_id, creada_por } = req.body;
    if (!usuario_id || !tipo || !motivo || !importe_centimos || !fecha_inicio || !creada_por) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const sancion = await sancionesDao.create({
      usuarioId: usuario_id,
      tipo,
      motivo,
      importeCentimos: parseInt(importe_centimos),
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin || null,
      prestamoId: prestamo_id || null,
      creadaPor: creada_por,
    });
    res.status(201).json(sancion);

    const importeEuros = (parseInt(importe_centimos) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 });
    notificacionesDao.create({
      usuarioId: usuario_id,
      tipo: 'sancion',
      titulo: 'Nueva sanción aplicada',
      texto: `Se te ha aplicado una sanción de ${importeEuros} €. Motivo: ${motivo}`,
      entidadTipo: 'sancion',
      entidadId: sancion.id,
    }).catch(() => {});
  } catch (error) {
    console.error('Error al crear sanción:', error);
    res.status(500).json({ message: 'Error al crear sanción' });
  }
};

module.exports = { getSanciones, getSancionById, createSancion };
