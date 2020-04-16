const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const officeController = require('../controller/office');

router.get('/', authentication, officeController.getOffices);
router.get('/members-departures/:officeId', authentication, officeController.getUserDepartureOffice);
router.post('/create', authentication, officeController.createOffice);
router.post('/create-shift/:officeId', authentication, officeController.addShift);
router.post('/edit/:officeId', authentication, officeController.editOffice);
router.delete('/:officeId', authentication, officeController.deleteOffice);
router.get('/:officeId', authentication, officeController.getOfficeDetail);
router.post('/checkins/:officeId', authentication, officeController.getCheckins);
router.post('/checkins-approval', authentication, officeController.approveCheckins);
router.post('/checkins-approval-cancel', authentication, officeController.cancelCheckinApprovals);

module.exports = router;