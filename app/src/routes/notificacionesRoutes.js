const express = require('express');
const {
  getNotificaciones,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificacionesController');

const router = express.Router();

router.get('/', getNotificaciones);
router.put('/leer-todas', markAllAsRead);
router.put('/:id/leer', markAsRead);

module.exports = router;
