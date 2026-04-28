const express = require('express');
const { getSanciones, getSancionById } = require('../controllers/sancionesController');

const router = express.Router();

router.get('/', getSanciones);
router.get('/:id', getSancionById);

module.exports = router;
