const crypto = require('crypto');
const usuariosDao = require('../dao/usuariosDao');
const { sendPasswordResetEmail } = require('../config/mailer');

function verifyPassword(password, hash, salt) {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const user = await usuariosDao.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (!user.activo) {
      return res.status(403).json({ message: 'Cuenta desactivada' });
    }

    if (user.bloqueado_manual) {
      return res.status(403).json({ message: 'Cuenta bloqueada. Contacta con administración.' });
    }

    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(403).json({ message: 'Cuenta temporalmente bloqueada. Inténtalo más tarde.' });
    }

    const valid = verifyPassword(password, user.password_hash, user.password_salt);

    if (!valid) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    await usuariosDao.updateLastLogin(user.id);

    res.json({
      id: user.id,
      nombre_completo: user.nombre_completo,
      email_institucional: user.email_institucional,
      rol: user.rol_nombre
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const ROLES_VALIDOS = ['estudiante', 'profesor', 'personal_gestion', 'mantenimiento'];

const register = async (req, res) => {
  try {
    const { nombre_completo, email, password, rol } = req.body;

    if (!nombre_completo || !email || !password || !rol) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ message: 'Rol no válido' });
    }

    const existing = await usuariosDao.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Este correo ya está registrado' });
    }

    const { hash, salt } = hashPassword(password);
    const user = await usuariosDao.create({
      nombre_completo,
      email_institucional: email,
      password_hash: hash,
      password_salt: salt,
      rol_nombre: rol
    });

    res.status(201).json({
      id: user.id,
      nombre_completo: user.nombre_completo,
      email_institucional: user.email_institucional,
      rol: user.rol
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'El correo es obligatorio' });
    }

    const user = await usuariosDao.findByEmail(email);

    // Siempre respondemos igual para evitar enumeración de correos
    if (!user) {
      return res.json({ message: 'Si el correo existe, recibirás un enlace de recuperación' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await usuariosDao.saveResetToken(user.id, token, expiry);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const resetUrl = `${frontendUrl}/api/src/pages/public/reset_password.html?token=${token}`;
    await sendPasswordResetEmail(user.email_institucional, resetUrl);

    res.json({ message: 'Si el correo existe, recibirás un enlace de recuperación' });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token y contraseña son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const user = await usuariosDao.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'El enlace es inválido o ha expirado' });
    }

    const { hash, salt } = hashPassword(password);
    await usuariosDao.updatePassword(user.id, hash, salt);
    await usuariosDao.clearResetToken(user.id);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login, register, forgotPassword, resetPassword };
