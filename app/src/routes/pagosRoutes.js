const express = require('express');
const {
  createCheckoutSession,
  verifyCheckoutSession,
  createPaymentIntent,
  getPublishableKey,
} = require('../controllers/pagosController');

const router = express.Router();

// Checkout
router.post('/create-checkout-session', createCheckoutSession);
router.get('/verify-session', verifyCheckoutSession);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/config', getPublishableKey);

module.exports = router;