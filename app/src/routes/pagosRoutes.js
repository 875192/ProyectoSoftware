const express = require('express');
const {
  createCheckoutSession,
  createPaymentIntent,
  getPublishableKey,
} = require('../controllers/pagosController');

const router = express.Router();

// Ruta actualizada para Checkout
router.post('/create-checkout-session', createCheckoutSession);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/config', getPublishableKey);

module.exports = router;