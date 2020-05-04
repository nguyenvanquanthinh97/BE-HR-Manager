const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const userController = require('../controller/user');

router.post('/edit', authentication, userController.editInfo);

router.post('/assign-shift', authentication, userController.assignShift);

router.post('/checkin', authentication, userController.checkin);

//query ?page
router.get('/checkin', authentication, userController.getCheckins);

//query ?page
router.get('/checkin/:userId', authentication, userController.getUserCheckins);

router.post('/weekly-planning/edit', authentication, userController.updateWeeklyPlanning);

router.post('/weekly-planning/delete', authentication, userController.deleteWeeklyPlanning);

router.post('/weekly-planning', authentication, userController.createWeeklyPlanning);

router.post('/off-days', authentication, userController.createOffDayPermission);

//query ?page
router.get('/off-days', authentication, userController.getOffDayPermissionList);

router.post('/off-days/approval', authentication, userController.approveOffDayPermission);

//query ?isApproval ?page
router.get('/off-days/approval', authentication, userController.getApproveOffDayPermission);

router.post('/off-days/deny-approval', authentication, userController.approveOffDayPermissionDeny);

router.get('/off-days/:idOffDayPermission', authentication, userController.getOffDayPermissionDetail);

//query ?quarterObjectiveId & selectedUserId
router.get('/weekly-planning', authentication, userController.getWeeklyPlannings);

router.get('/:userId', authentication, userController.getInfo);
module.exports = router;