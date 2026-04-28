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

module.exports = { getPrestamos, getProximos, getEstadisticasMensuales };
