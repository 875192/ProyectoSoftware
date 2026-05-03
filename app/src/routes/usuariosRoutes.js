const express = require('express');
const {
  getProfile,
  updateProfile,
  updatePassword,
  getDashboard,
  getUsuarios,
} = require('../controllers/usuariosController');

const router = express.Router();

router.get('/', getUsuarios);
router.get('/:id', getProfile);
router.get('/:id/dashboard', getDashboard);
router.put('/:id', updateProfile);
router.put('/:id/password', updatePassword);

module.exports = router;
