const express = require('express');
const {
  getPagos,
  pagarSancion,
  createSancionCheckoutSession,
  createCheckoutSession,
  verifyCheckoutSession,
  createPaymentIntent,
  getPublishableKey,
} = require('../controllers/pagosController');

const router = express.Router();

// Listado / historial
router.get('/', getPagos);

// Pago de sanción
router.post('/sancion', pagarSancion);
router.post('/sancion-checkout', createSancionCheckoutSession);

// Stripe
router.post('/create-checkout-session', createCheckoutSession);
router.get('/verify-session', verifyCheckoutSession);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/config', getPublishableKey);

module.exports = router;
