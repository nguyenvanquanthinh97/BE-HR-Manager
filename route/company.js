const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const companyController = require('../controller/company');

router.get('/get-one', authentication, companyController.getCompany);

router.get('/get-staffs', authentication, companyController.getStaffs);

router.get('/', authentication, companyController.getStatistics);

module.exports = router;