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

    const { equipment, pickupDate, reason } = req.body;

    // Creamos la sesión de Checkout
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'], // Puedes añadir 'bizum' si lo tienes activo en Stripe
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Fianza de Préstamo: ${equipment}`,
              description: `Recogida programada: ${pickupDate}`,
            },
            unit_amount: 1000, // 1000 céntimos = 10,00 €
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // URLs a las que Stripe enviará al usuario tras el proceso
      // Asegúrate de tener FRONTEND_URL en tu .env (ej: http://localhost:5500)
      success_url: `${process.env.FRONTEND_URL}/api/src/pages/student/requests_estudiante.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/api/src/pages/student/requests_estudiante.html?status=cancelled`,
      
      // Guardamos la info de la solicitud en los metadatos de Stripe para consultarlos luego
      metadata: {
        equipo: equipment,
        fecha_recogida: pickupDate,
        motivo: reason
      },
    });

    // Devolvemos el ID y la URL de redirección
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error al crear Checkout Session:', error);
    res.status(500).json({ message: 'No se pudo crear la sesión de pago' });
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
  createPaymentIntent,
  getPublishableKey,
};