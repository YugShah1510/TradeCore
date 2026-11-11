const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.patch('/me/password', userController.updatePassword);

module.exports = router;

