const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const userController = require('../controller/user');

router.post('/assign-shift', authentication, userController.assignShift);

router.get('/:userId', authentication, userController.getInfo);

router.post('/checkin', authentication, userController.checkin);

module.exports = router;