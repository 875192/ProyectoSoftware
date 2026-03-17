const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (req, res) => {
  try {
    const { amount, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'El importe debe ser mayor que 0' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),     // en céntimos (1000 = 10,00 €)
      currency: 'eur',
      description: description || 'Fianza UniGear',
      metadata: metadata || {},
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error al crear PaymentIntent:', error);
    res.status(500).json({ message: 'Error al procesar el pago' });
  }
};

const getPublishableKey = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};

module.exports = {
  createPaymentIntent,
  getPublishableKey,
};
