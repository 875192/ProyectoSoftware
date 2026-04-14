const express = require('express');
const {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  cancelSolicitud,
} = require('../controllers/solicitudesController');

const router = express.Router();

router.get('/', getSolicitudes);
router.get('/:id', getSolicitudById);
router.post('/', createSolicitud);
router.put('/:id/cancelar', cancelSolicitud);

module.exports = router;
