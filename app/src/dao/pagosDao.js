const pool = require('../db/pool');

const SELECT_FIELDS = `
  p.id,
  p.usuario_id,
  p.solicitud_id,
  p.sancion_id,
  p.concepto,
  p.concepto_sub,
  p.metodo,
  p.metodo_detalle,
  p.importe_centimos,
  p.moneda,
  p.estado,
  p.stripe_payment_intent_id,
  p.recibo_url,
  p.fecha_pago,
  p.fecha_reembolso,
  p.created_at
`;

const pagosDao = {
  findByUsuarioId: async (usuarioId) => {
    const result = await pool.query(`
      SELECT ${SELECT_FIELDS}
      FROM pagos p
      WHERE p.usuario_id = $1
      ORDER BY COALESCE(p.fecha_pago, p.created_at) DESC
    `, [usuarioId]);
    return result.rows;
  },

  totalPagadoByUsuario: async (usuarioId) => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(importe_centimos), 0)::int AS total
      FROM pagos
      WHERE usuario_id = $1 AND estado = 'pagado'
    `, [usuarioId]);
    return result.rows[0].total;
  },

  insert: async (data) => {
    const {
      usuario_id, solicitud_id = null, sancion_id = null,
      concepto, concepto_sub = null,
      metodo = 'tarjeta', metodo_detalle = null,
      importe_centimos, estado = 'pagado',
      stripe_payment_intent_id = null, recibo_url = null,
    } = data;

    const result = await pool.query(`
      INSERT INTO pagos (
        usuario_id, solicitud_id, sancion_id,
        concepto, concepto_sub,
        metodo, metodo_detalle,
        importe_centimos, estado,
        stripe_payment_intent_id, recibo_url,
        fecha_pago
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        CASE WHEN $9 = 'pagado' THEN NOW() ELSE NULL END
      )
      RETURNING ${SELECT_FIELDS}
    `, [
      usuario_id, solicitud_id, sancion_id,
      concepto, concepto_sub,
      metodo, metodo_detalle,
      importe_centimos, estado,
      stripe_payment_intent_id, recibo_url,
    ]);
    return result.rows[0];
  },
};

module.exports = pagosDao;
