const express = require('express');
const { getPrestamos, getProximos, getEstadisticasMensuales } = require('../controllers/prestamosController');

const router = express.Router();

router.get('/estadisticas/mensual', getEstadisticasMensuales);
router.get('/', getPrestamos);
router.get('/proximos', getProximos);

module.exports = router;
