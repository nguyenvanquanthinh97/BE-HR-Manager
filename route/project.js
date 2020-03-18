const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const projectController = require('../controller/project');

router.get('/', authentication, projectController.getProjectList);
router.get('/:projectId', authentication, projectController.getProject);
router.post('/', authentication, projectController.createProject);
router.post('/add-status', authentication, projectController.addStatus);
router.post('/add-task', authentication, projectController.addTask);

module.exports = router;