const pool = require('../db/pool');

const usuariosDao = {
  findByEmail: async (email) => {
    const result = await pool.query(`
      SELECT u.id, u.nombre_completo, u.email_institucional,
             u.password_hash, u.password_salt, u.activo, u.bloqueado_manual,
             u.intentos_fallidos, u.bloqueado_hasta,
             r.nombre AS rol_nombre
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
            WHERE LOWER(u.email_institucional) = LOWER($1)
    `, [email]);
    return result.rows[0] || null;
  },

  findById: async (id) => {
    const result = await pool.query(`
      SELECT u.id, u.nombre_completo, u.email_institucional,
             r.nombre AS rol_nombre
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  updateProfile: async (id, { nombre_completo }) => {
    const result = await pool.query(`
      UPDATE usuarios
      SET nombre_completo = $1
      WHERE id = $2
      RETURNING id, nombre_completo, email_institucional
    `, [nombre_completo, id]);
    return result.rows[0] || null;
  },

  updatePassword: async (id, passwordHash, passwordSalt) => {
    const result = await pool.query(`
      UPDATE usuarios
      SET password_hash = $1, password_salt = $2
      WHERE id = $3
      RETURNING id
    `, [passwordHash, passwordSalt, id]);
    return result.rows[0] || null;
  },

  getPasswordData: async (id) => {
    const result = await pool.query(`
      SELECT password_hash, password_salt
      FROM usuarios WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  updateLastLogin: async (id) => {
    await pool.query(`
      UPDATE usuarios SET ultimo_login_at = NOW(), intentos_fallidos = 0
      WHERE id = $1
    `, [id]);
  },

  create: async ({ nombre_completo, email_institucional, password_hash, password_salt, rol_nombre }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query(`
        INSERT INTO usuarios (nombre_completo, email_institucional, password_hash, password_salt)
        VALUES ($1, $2, $3, $4)
        RETURNING id, nombre_completo, email_institucional
      `, [nombre_completo, email_institucional, password_hash, password_salt]);
      const user = userResult.rows[0];

      const rolResult = await client.query(`SELECT id FROM roles WHERE nombre = $1`, [rol_nombre]);
      if (!rolResult.rows[0]) throw new Error(`Rol no encontrado: ${rol_nombre}`);
      const rol_id = rolResult.rows[0].id;

      await client.query(`
        INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)
      `, [user.id, rol_id]);

      await client.query('COMMIT');
      return { ...user, rol: rol_nombre };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  saveResetToken: async (userId, token, expiry) => {
    await pool.query(`
      UPDATE usuarios SET reset_token = $1, reset_token_expiry = $2
      WHERE id = $3
    `, [token, expiry, userId]);
  },

  findByResetToken: async (token) => {
    const result = await pool.query(`
      SELECT id, email_institucional
      FROM usuarios
      WHERE reset_token = $1 AND reset_token_expiry > NOW()
    `, [token]);
    return result.rows[0] || null;
  },

  clearResetToken: async (userId) => {
    await pool.query(`
      UPDATE usuarios SET reset_token = NULL, reset_token_expiry = NULL
      WHERE id = $1
    `, [userId]);
  },
};

module.exports = usuariosDao;
