const express = require('express');
const router = express.Router();
const orderBookController = require('../controllers/orderBookController');

// Public route to view order book for any stock
router.get('/:symbol', orderBookController.getOrderBookBySymbol);

module.exports = router;

