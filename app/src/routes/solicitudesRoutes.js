const express = require('express');
const {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  cancelSolicitud,
  getSolicitudesStaff,
  aprobarSolicitud,
  rechazarSolicitud,
} = require('../controllers/solicitudesController');

const router = express.Router();

router.get('/staff', getSolicitudesStaff);
router.get('/', getSolicitudes);
router.get('/:id', getSolicitudById);
router.post('/', createSolicitud);
router.put('/:id/cancelar', cancelSolicitud);
router.put('/:id/aprobar', aprobarSolicitud);
router.put('/:id/rechazar', rechazarSolicitud);

module.exports = router;
