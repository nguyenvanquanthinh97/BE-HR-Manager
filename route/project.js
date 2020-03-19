const express = require('express');
const router = express.Router();

const authentication = require('../middleware/authentication');
const projectController = require('../controller/project');

router.get('/', authentication, projectController.getProjectList);
router.get('/:projectId', authentication, projectController.getProject);
router.post('/', authentication, projectController.createProject);
router.post('/add-status', authentication, projectController.addStatus);
router.post('/add-task', authentication, projectController.addTask);
router.post('/add-member', authentication, projectController.addMembers);
router.post('/assign-task', authentication, projectController.assignTask);
router.post('/edit-task-status', authentication, projectController.editTaskStatus);
router.post('/add-task-comment', authentication, projectController.addCommentTask);

module.exports = router;