const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const companyController = require('../controller/company');

router.get('/get-one', authentication, companyController.getCompany);

router.get('/get-staffs', authentication, companyController.getStaffs);

router.get('/statistics', authentication, companyController.getStatistics);

router.post('/quarter-objective', authentication, companyController.createQuarterObjective);

router.post('/quarter-objective/edit', authentication, companyController.editQuarterObjective);

router.get('/quarter-objective/list', authentication, companyController.getQuarterObjectiveList);

router.get('/quarter-objective/:quarterId', authentication, companyController.getAllOKRSByQuarterId);

router.post('/okr', authentication, companyController.createOKR);

router.get('/okr/companyInfo', authentication, companyController.getCompanyInfo);

router.get('/okr/:okrId', authentication, companyController.getOKRs);

router.post('/okr/edit', authentication, companyController.editOKR);

router.post('/okr/delete', authentication, companyController.deleteOKR);

module.exports = router;