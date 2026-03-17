const express = require('express');
const {
  createPaymentIntent,
  getPublishableKey,
} = require('../controllers/pagosController');

const router = express.Router();

router.post('/create-payment-intent', createPaymentIntent);
router.get('/config', getPublishableKey);

module.exports = router;
