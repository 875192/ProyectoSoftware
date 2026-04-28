const pool = require('../db/pool');

const incidenciasDao = {
  // Crea una incidencia. Resuelve la unidad_material_id desde el préstamo si no se pasa.
  insert: async (data) => {
    const {
      prestamo_id,
      usuario_id,
      registrada_por,
      tipo,
      descripcion,
    } = data;

    // Resolver unidad_material_id a partir del préstamo
    const unidadResult = await pool.query(
      'SELECT unidad_material_id FROM prestamos WHERE id = $1',
      [prestamo_id]
    );
    if (!unidadResult.rows.length) {
      throw new Error('Préstamo no encontrado');
    }
    const unidad_material_id = unidadResult.rows[0].unidad_material_id;

    const result = await pool.query(`
      INSERT INTO incidencias (
        unidad_material_id, prestamo_id, usuario_id,
        registrada_por, tipo, descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, unidad_material_id, prestamo_id, usuario_id,
                tipo, descripcion, fecha_incidencia, resuelta, created_at
    `, [unidad_material_id, prestamo_id, usuario_id, registrada_por, tipo, descripcion]);

    return result.rows[0];
  },

  insertArchivo: async (incidenciaId, archivo) => {
    const { url, nombre_original, mime_type, tamano_bytes } = archivo;
    const result = await pool.query(`
      INSERT INTO incidencia_archivos (
        incidencia_id, url, nombre_original, mime_type, tamano_bytes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, incidencia_id, url, mime_type, tamano_bytes
    `, [incidenciaId, url, nombre_original || null, mime_type, tamano_bytes]);
    return result.rows[0];
  },

  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT
        i.id,
        i.tipo,
        i.descripcion,
        i.fecha_incidencia,
        i.resuelta,
        i.fecha_resolucion,
        i.prestamo_id,
        m.nombre AS material_nombre
      FROM incidencias i
      LEFT JOIN unidades_material u ON i.unidad_material_id = u.id
      LEFT JOIN materiales m ON u.material_id = m.id
      WHERE i.usuario_id = $1
      ORDER BY i.fecha_incidencia DESC
    `, [usuarioId]);
    return result.rows;
  },
};

module.exports = incidenciasDao;
