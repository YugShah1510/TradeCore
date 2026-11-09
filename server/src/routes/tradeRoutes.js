const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', tradeController.getUserTrades);

module.exports = router;

