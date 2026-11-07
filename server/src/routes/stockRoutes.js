const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/', stockController.getAllStocks);
router.get('/:symbol', stockController.getStockBySymbol);
router.get('/:symbol/history', stockController.getStockHistory);

module.exports = router;

