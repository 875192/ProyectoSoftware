const incidenciasDao = require('../dao/incidenciasDao');

const TIPOS_VALIDOS = new Set(['danio', 'averia', 'mantenimiento', 'revision', 'otro']);

// Mapeo desde la nomenclatura del frontend a los enum de la BD
const TIPO_FRONT_A_DB = {
  averia: 'averia',
  desperfecto: 'danio',
  perdida: 'otro',
  otro: 'otro',
};

const crearIncidencia = async (req, res) => {
  try {
    const { prestamo_id, usuario_id, tipo, descripcion } = req.body;

    if (!prestamo_id || !usuario_id || !tipo || !descripcion) {
      return res.status(400).json({
        message: 'prestamo_id, usuario_id, tipo y descripcion son obligatorios',
      });
    }

    if (typeof descripcion !== 'string' || descripcion.trim().length < 10) {
      return res.status(400).json({ message: 'La descripción debe tener al menos 10 caracteres' });
    }

    const tipoDb = TIPO_FRONT_A_DB[tipo] || tipo;
    if (!TIPOS_VALIDOS.has(tipoDb)) {
      return res.status(400).json({ message: `Tipo de incidencia no válido: ${tipo}` });
    }

    const incidencia = await incidenciasDao.insert({
      prestamo_id: parseInt(prestamo_id, 10),
      usuario_id: parseInt(usuario_id, 10),
      registrada_por: parseInt(usuario_id, 10),
      tipo: tipoDb,
      descripcion: descripcion.trim(),
    });

    res.status(201).json(incidencia);
  } catch (error) {
    console.error('Error al crear incidencia:', error);
    if (error.message === 'Préstamo no encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al crear incidencia' });
  }
};

const listarIncidencias = async (req, res) => {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }
    const incidencias = await incidenciasDao.findByUsuarioId(usuario_id);
    res.json(incidencias);
  } catch (error) {
    console.error('Error al listar incidencias:', error);
    res.status(500).json({ message: 'Error al listar incidencias' });
  }
};

module.exports = { crearIncidencia, listarIncidencias };
