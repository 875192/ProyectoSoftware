const express = require('express');
const {
  getCatalogo,
  getMaterialById,
  getTopMaterial,
  getTopAlquilados,
  getInventario,
  createMaterial,
  deleteMaterial,
} = require('../controllers/materialesController');

const router = express.Router();

router.get('/catalogo', getCatalogo);
router.get('/top', getTopMaterial);
router.get('/top-alquilados', getTopAlquilados);
router.get('/inventario', getInventario);
router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.delete('/:id', deleteMaterial);

module.exports = router;
