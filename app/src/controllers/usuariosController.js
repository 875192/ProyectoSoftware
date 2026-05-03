const crypto = require('crypto');
const usuariosDao = require('../dao/usuariosDao');
const prestamosDao = require('../dao/prestamosDao');
const sancionesDao = require('../dao/sancionesDao');
const solicitudesDao = require('../dao/solicitudesDao');
const notificacionesDao = require('../dao/notificacionesDao');
const pool = require('../db/pool');

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usuariosDao.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.id,
      nombre_completo: user.nombre_completo,
      email_institucional: user.email_institucional,
      telefono: user.telefono,
      bio: user.bio,
      avatar_url: user.avatar_url,
      ultimo_login_at: user.ultimo_login_at,
      created_at: user.created_at,
      rol: user.rol_nombre
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, telefono, bio, avatar_url } = req.body;
    
    const user = await usuariosDao.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updated = await usuariosDao.updateProfile(id, { nombre_completo, telefono, bio, avatar_url });
    res.json(updated || { message: 'Sin cambios' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ message: 'Contraseña actual y nueva son obligatorias' });
    }

    if (password_nueva.length < 4) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 4 caracteres' });
    }

    const passwordData = await usuariosDao.getPasswordData(id);
    if (!passwordData) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.scryptSync(password_nueva, newSalt, 64).toString('hex');

    await usuariosDao.updatePassword(id, newHash, newSalt);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    res.status(500).json({ message: 'Error al actualizar contraseña' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usuariosDao.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const [prestamosByEstado, solicitudesByEstado, deudaCentimos, noLeidas, materialesDisponibles] = await Promise.all([
      prestamosDao.countByEstadoByUsuario(id),
      solicitudesDao.countByUsuarioByEstado(id),
      sancionesDao.totalDeudaPendienteCentimos(id),
      notificacionesDao.countNoLeidas(id),
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM unidades_material
        WHERE estado = 'disponible'`)
    ]);

    const sumByEstados = (rows, estados) =>
      rows.filter(r => estados.includes(r.estado)).reduce((s, r) => s + r.total, 0);

    res.json({
      prestamos: {
        activos: sumByEstados(prestamosByEstado, ['activo', 'retrasado']),
        finalizados: sumByEstados(prestamosByEstado, ['finalizado']),
        pendientes: sumByEstados(prestamosByEstado, ['pendiente']),
        retrasados: sumByEstados(prestamosByEstado, ['retrasado']),
        total: prestamosByEstado.reduce((s, r) => s + r.total, 0)
      },
      solicitudes: {
        pendientes: sumByEstados(solicitudesByEstado, ['pendiente']),
        en_espera: sumByEstados(solicitudesByEstado, ['en_espera']),
        aprobadas: sumByEstados(solicitudesByEstado, ['aprobada']),
        total: solicitudesByEstado.reduce((s, r) => s + r.total, 0)
      },
      deuda_centimos: deudaCentimos,
      notificaciones_sin_leer: noLeidas,
      materiales_disponibles: materialesDisponibles.rows[0].total
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ message: 'Error al obtener dashboard' });
  }
};

const getUsuarios = async (req, res) => {
  try {
    const usuarios = await usuariosDao.getAll();
    res.json(usuarios.map(u => ({
      id: u.id,
      nombre_completo: u.nombre_completo,
      email_institucional: u.email_institucional,
      rol: u.rol_nombre,
    })));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

module.exports = { getProfile, updateProfile, updatePassword, getDashboard, getUsuarios };