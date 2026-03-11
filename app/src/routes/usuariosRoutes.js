const express = require('express');
const {
  getProfile,
  updateProfile,
  updatePassword,
} = require('../controllers/usuariosController');

const router = express.Router();

router.get('/:id', getProfile);
router.put('/:id', updateProfile);
router.put('/:id/password', updatePassword);

module.exports = router;
