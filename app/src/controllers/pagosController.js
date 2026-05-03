const pagosDao = require('../dao/pagosDao');
const sancionesDao = require('../dao/sancionesDao');

let stripe = null;

const getStripeClient = () => {
  if (stripe) return stripe;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  stripe = require('stripe')(secretKey);
  return stripe;
};

const ensureStripeConfigured = (res) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    res.status(503).json({
      message: 'Pagos no disponibles: falta STRIPE_SECRET_KEY en la configuración del servidor',
    });
    return null;
  }
  return stripeClient;
};

// =======================================================
// Listado / historial
// =======================================================
const getPagos = async (req, res) => {
  try {
    const { usuario_id } = req.query;
    if (!usuario_id) {
      return res.status(400).json({ message: 'usuario_id es obligatorio' });
    }
    const pagos = await pagosDao.findByUsuarioId(usuario_id);
    res.json(pagos);
  } catch (error) {
    console.error('Error al listar pagos:', error);
    res.status(500).json({ message: 'Error al listar pagos' });
  }
};

// =======================================================
// Pago de sanción (registra el pago + marca la sanción)
// =======================================================
const pagarSancion = async (req, res) => {
  try {
    const { sancion_id, metodo_detalle, stripe_payment_intent_id } = req.body;
    if (!sancion_id) {
      return res.status(400).json({ message: 'sancion_id es obligatorio' });
    }

    const sancion = await sancionesDao.findById(sancion_id);
    if (!sancion) {
      return res.status(404).json({ message: 'Sanción no encontrada' });
    }
    if (sancion.pagada) {
      return res.status(409).json({ message: 'Esta sanción ya está pagada' });
    }

    const pago = await pagosDao.insert({
      usuario_id: sancion.usuario_id,
      sancion_id: sancion.id,
      concepto: sancion.motivo,
      concepto_sub: sancion.material_nombre
        ? `${sancion.material_nombre}${sancion.prestamo_id ? ` · Préstamo #${sancion.prestamo_id}` : ''}`
        : null,
      metodo: 'tarjeta',
      metodo_detalle: metodo_detalle || null,
      importe_centimos: sancion.importe_centimos,
      estado: 'pagado',
      stripe_payment_intent_id: stripe_payment_intent_id || null,
    });

    await sancionesDao.marcarPagada(sancion.id, pago.id);

    res.status(201).json({ pago, sancion_id: sancion.id });
  } catch (error) {
    console.error('Error al pagar sanción:', error.message, error.detail || '');
    res.status(500).json({ message: error.message || 'Error al procesar el pago' });
  }
};

// =======================================================
// Stripe (mantener compatibilidad existente)
// =======================================================
const createSancionCheckoutSession = async (req, res) => {
  try {
    const stripeClient = ensureStripeConfigured(res);
    if (!stripeClient) return;

    const { sancion_id } = req.body;
    if (!sancion_id) {
      return res.status(400).json({ message: 'sancion_id es obligatorio' });
    }

    const sancion = await sancionesDao.findById(sancion_id);
    if (!sancion) return res.status(404).json({ message: 'Sanción no encontrada' });
    if (sancion.pagada) return res.status(409).json({ message: 'Esta sanción ya está pagada' });

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Sanción UniGear`,
              description: sancion.motivo,
            },
            unit_amount: sancion.importe_centimos,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/Frontend/src/pagos/checkout/checkout.html?session_id={CHECKOUT_SESSION_ID}&sancion_id=${sancion_id}`,
      cancel_url: `${process.env.FRONTEND_URL}/Frontend/src/sanciones/mis-sanciones/mis_sanciones.html?status=cancelled`,
      metadata: {
        sancion_id: String(sancion_id),
        usuario_id: String(sancion.usuario_id),
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear sesión de checkout para sanción:', error);
    res.status(500).json({ message: 'No se pudo crear la sesión de pago' });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const stripeClient = ensureStripeConfigured(res);
    if (!stripeClient) return;

    const { usuario_id, material_id, material_nombre, fecha_inicio, fecha_fin, motivo, prioridad } = req.body;
    if (!usuario_id || !material_nombre) {
      return res.status(400).json({ message: 'usuario_id y material_nombre son obligatorios' });
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Fianza de Préstamo: ${material_nombre}`,
              description: `Período: ${fecha_inicio} a ${fecha_fin}`,
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/Frontend/src/solicitudes-prestamo/crear-solicitud/crear_solicitud.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/Frontend/src/catalogo/detalle-material/detalle_material.html?id=${material_id || ''}&status=cancelled`,
      metadata: {
        usuario_id: String(usuario_id),
        material_id: String(material_id || ''),
        material_nombre,
        fecha_inicio: fecha_inicio || '',
        fecha_fin: fecha_fin || '',
        motivo: motivo || '',
        prioridad: prioridad || 'normal',
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error al crear Checkout Session:', error);
    res.status(500).json({ message: 'No se pudo crear la sesión de pago' });
  }
};

const verifyCheckoutSession = async (req, res) => {
  try {
    const stripeClient = ensureStripeConfigured(res);
    if (!stripeClient) return;

    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ message: 'session_id es obligatorio' });
    }

    const session = await stripeClient.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        message: 'El pago no se ha completado',
        payment_status: session.payment_status,
      });
    }

    res.json({
      paid: true,
      payment_intent_id: session.payment_intent,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Error al verificar Checkout Session:', error);
    res.status(500).json({ message: 'No se pudo verificar la sesión de pago' });
  }
};

const createPaymentIntent = async (req, res) => {
  try {
    const stripeClient = ensureStripeConfigured(res);
    if (!stripeClient) return;

    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'El importe debe ser un número positivo en céntimos' });
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error al crear PaymentIntent:', error);
    res.status(500).json({ message: 'No se pudo crear el intento de pago' });
  }
};

const getPublishableKey = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};

module.exports = {
  getPagos,
  pagarSancion,
  createSancionCheckoutSession,
  createCheckoutSession,
  verifyCheckoutSession,
  createPaymentIntent,
  getPublishableKey,
};
