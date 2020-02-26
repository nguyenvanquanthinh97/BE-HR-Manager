const express = require('express');
const router = express.Router();

const userController = require('../controller/auth');

router.post('/signup', userController.signup);

router.get('/verify-email/:userId', userController.verifyEmail);

module.exports = router;