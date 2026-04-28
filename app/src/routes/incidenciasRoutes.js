const express = require('express');
const { crearIncidencia, listarIncidencias } = require('../controllers/incidenciasController');

const router = express.Router();

router.get('/', listarIncidencias);
router.post('/', crearIncidencia);

module.exports = router;
