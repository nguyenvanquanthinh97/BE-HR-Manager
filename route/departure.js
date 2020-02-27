const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const departureController = require('../controller/departure');

router.get('/get-all/:officeId', authentication, departureController.getDepartures);
router.post('/create', authentication, departureController.createDeparture);

module.exports = router;