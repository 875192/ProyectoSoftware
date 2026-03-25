const express = require('express');
const {
  createCheckoutSession, // Nombre actualizado
  getPublishableKey,
} = require('../controllers/pagosController');

const router = express.Router();

// Ruta actualizada para Checkout
router.post('/create-checkout-session', createCheckoutSession);
router.get('/config', getPublishableKey);

module.exports = router;