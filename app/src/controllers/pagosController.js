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

const createCheckoutSession = async (req, res) => {
  try {
    const stripeClient = ensureStripeConfigured(res);
    if (!stripeClient) return;

    const { usuario_id, material_nombre, fecha_inicio, fecha_fin, motivo } = req.body;

    if (!usuario_id || !material_nombre) {
      return res.status(400).json({ message: 'usuario_id y material_nombre son obligatorios' });
    }

    // Creamos la sesión de Checkout
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
            unit_amount: 1000, // 1000 céntimos = 10,00 €
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // URLs a las que Stripe enviará al usuario tras el proceso
      success_url: `${process.env.FRONTEND_URL}/src/solicitudes-prestamo/mis-solicitudes/mis_solicitudes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/src/solicitudes-prestamo/mis-solicitudes/mis_solicitudes.html?status=cancelled`,

      // Guardamos la info de la solicitud en los metadatos de Stripe para consultarlos luego
      metadata: {
        usuario_id: String(usuario_id),
        material_nombre,
        fecha_inicio: fecha_inicio || '',
        fecha_fin: fecha_fin || '',
        motivo: motivo || ''
      },
    });

    // Devolvemos el ID y la URL de redirección
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

    // Devolvemos los metadatos guardados + el payment_intent para vincular a la solicitud
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
  createCheckoutSession,
  verifyCheckoutSession,
  createPaymentIntent,
  getPublishableKey,
};