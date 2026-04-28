const express = require('express');
const {
  getNotificaciones,
  markAsRead,
  markAllAsRead,
  deleteNotificacion,
} = require('../controllers/notificacionesController');

const router = express.Router();

router.get('/', getNotificaciones);
router.put('/leer-todas', markAllAsRead);
router.put('/:id/leer', markAsRead);
router.delete('/:id', deleteNotificacion);

module.exports = router;
