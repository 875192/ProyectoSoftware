const express = require('express');
const { getSanciones, getSancionById, createSancion } = require('../controllers/sancionesController');

const router = express.Router();

router.get('/', getSanciones);
router.post('/', createSancion);
router.get('/:id', getSancionById);

module.exports = router;
