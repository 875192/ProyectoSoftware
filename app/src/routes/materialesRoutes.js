const express = require('express');
const {
  getMateriales,
  getCatalogo,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} = require('../controllers/materialesController');

const router = express.Router();

router.get('/', getMateriales);
router.get('/catalogo', getCatalogo);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

module.exports = router;