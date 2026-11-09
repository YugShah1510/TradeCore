const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', portfolioController.getPortfolioSummary);
router.get('/holdings', portfolioController.getPortfolioHoldings);

module.exports = router;

