const express = require('express');
const {
  getPrestamos,
  getProximos,
  getEstadisticasMensuales,
  getPrestamosStaff,
  registrarEntrega,
  registrarDevolucion,
} = require('../controllers/prestamosController');

const router = express.Router();

router.get('/estadisticas/mensual', getEstadisticasMensuales);
router.get('/staff', getPrestamosStaff);
router.get('/proximos', getProximos);
router.get('/', getPrestamos);
router.post('/', registrarEntrega);
router.put('/:id/devolver', registrarDevolucion);

module.exports = router;
