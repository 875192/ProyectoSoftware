const crypto = require('crypto');
const usuariosDao = require('../dao/usuariosDao');

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
    const { nombre_completo, telefono, direccion } = req.body;

    // At least one field should be provided
    const user = await usuariosDao.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Only update nombre_completo if provided (telefono/direccion not in schema yet)
    if (nombre_completo) {
      await usuariosDao.updateProfile(id, { nombre_completo });
    }

    res.json({ message: 'Perfil actualizado correctamente' });
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

    const currentValid = crypto.scryptSync(password_actual, passwordData.password_salt, 64).toString('hex');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(currentValid, 'hex'),
      Buffer.from(passwordData.password_hash, 'hex')
    );

    if (!isValid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
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

module.exports = { getProfile, updateProfile, updatePassword };
