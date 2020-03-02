const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const officeController = require('../controller/office');

router.get('/', authentication, officeController.getOffices);
router.get('/members-departures/:officeId', authentication, officeController.getUserDepartureOffice);
router.post('/create', authentication, officeController.createOffice);
router.post('/create/:officeId', authentication, officeController.addShift);

module.exports = router;