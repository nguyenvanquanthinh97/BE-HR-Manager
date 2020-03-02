const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication')
const userController = require('../controller/auth');

router.post('/signup', userController.signup);

router.get('/verify-email/:userId', userController.verifyEmail);

router.post('/login', userController.login);

router.get('/logout', authentication, userController.logout);

router.post('/staff/signup', authentication, userController.addStaff);

router.post('/reset-password', userController.resetPassword);

module.exports = router;