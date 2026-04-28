const express = require('express');
const { getPrestamos, getProximos } = require('../controllers/prestamosController');

const router = express.Router();

router.get('/', getPrestamos);
router.get('/proximos', getProximos);

module.exports = router;
