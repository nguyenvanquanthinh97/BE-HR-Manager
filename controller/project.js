const { get, set, omit } = require('lodash');
const Joi = require('@hapi/joi');
const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { ROLE } = require('../constant');
const Project = require('../model/project');
const User = require('../model/user');

module.exports.getProjectList = async (req, res, next) => {
  const companyId = req.companyId;

  try {
    let projects = await Project.getProjectList(companyId);
    res.status(200).json({ message: 'Get Projects Success', projects });
  } catch (error) {
    next(error);
  }
};

module.exports.getProject = async (req, res, next) => {
  const projectId = get(req.params, 'projectId');
  const userId = req.userId;

  try {
    const project = await Project.findById(projectId);
    const projectManagerId = get(project, 'projectManagerId', '');
    const members = get(project, 'members');
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    const memberIdx = members.findIndex(member => member.memberId.toString() === userId.toString());
    if (memberIdx === -1 && projectManagerId.toString() !== userId.toString()) {
      const error = new Error("Not enough authority to create a task");
      error.statusCode = 401;
      throw error;
    }
    res.status(200).json({ message: 'Get Project Success', project });
  } catch (error) {
    next(error);
  }
};

module.exports.createProject = async (req, res, next) => {
  const companyId = req.companyId;
  const name = get(req.body, 'name');
  const prefixedCode = get(req.body, 'prefixedCode');
  const description = get(req.body, 'description');
  const projectManagerId = get(req.body, 'projectManagerId');
  const projectManagerUsername = get(req.body, 'projectManagerUsername');

  const schema = Joi.object().keys({
    name: Joi.string().trim().required(),
    prefixedCode: Joi.string().trim().required(),
    description: Joi.string().trim().optional().allow(null, ''),
    projectManagerId: Joi.string().trim(),
    projectManagerUsername: Joi.string().required()
  });

  const { error, value } = schema.validate({ name, prefixedCode, description, projectManagerId, projectManagerUsername });

  if (error) {
    const err = new Error(error);
    err.statusCode = 422;
    return next(err);
  }

  try {
    const projectManager = await User.findById(projectManagerId);
    if (!projectManager || projectManager.companyId.toString() !== companyId.toString()) {
      const error = new Error("Can't find your ProjectManagerID");
      error.statusCode = 404;
      throw error;
    }
    const project = new Project(null, companyId, name, prefixedCode, description, null, null, null, projectManagerId, projectManagerUsername);
    const projectInserted = await project.save();
    set(project, get(projectInserted, 'insertedId'));
    res.status(201).json({ message: "Success in creating project", project });
  } catch (error) {
    next(error);
  }
};

module.exports.addStatus = async (req, res, next) => {
  const projectId = get(req.body, 'projectId');
  const status = get(req.body, 'status', '');
  const userId = req.userId;

  if (status === '') {
    const error = new Error('status is empty');
    error.statusCode = 422;
    return next(error);
  }

  try {
    let project = await Project.findById(projectId);
    const statuses = get(project, 'statuses', []);
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    if (project.projectManagerId.toString() !== userId.toString()) {
      const error = new Error("Not enough authority to create a status bar");
      error.statusCode = 401;
      throw error;
    }
    const statusIdx = statuses.findIndex(existedStat => existedStat === status);
    if (statusIdx !== -1) {
      const error = new Error('Status is already existed !');
      error.statusCode = 400;
      throw error;
    }
    project = new Project(project._id);
    await project.addStatus(status);
    statuses.push(status);

    res.status(201).json({ message: "Add status success", projectId, statuses });
  } catch (error) {
    next(error);
  }
};

module.exports.addTask = async (req, res, next) => {
  const userId = req.userId;
  const projectId = get(req.body, 'projectId');
  const title = get(req.body, 'title');
  const description = get(req.body, 'description');
  const status = get(req.body, 'status');

  const schema = Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().required(),
    status: Joi.string().required()
  });

  const { error, value } = schema.validate({ title, description, status });

  if (error) {
    const err = new Error("Validation Failed !");
    err.statusCode = 422;
    return next(error);
  }

  try {
    let project = await Project.findById(projectId);
    let tasks = get(project, 'taskList', []);
    let statuses = get(project, 'statuses', []);
    let taskLength = tasks.length;
    const projectManagerId = get(project, 'projectManagerId', '');
    const members = get(project, 'members');
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    const statusIdx = statuses.findIndex(vStat => vStat === status);
    if (statusIdx === -1) {
      const error = new Error('Invalid Status');
      error.statusCode = 422;
      throw error;
    }
    const allowMems = members.filter(member => member.createTaskPermission === true);
    const userIdx = allowMems.findIndex(member => member.memberId.toString() === userId.toString());
    if (userIdx === -1 && userId.toString() !== projectManagerId.toString()) {
      const error = new Error("Not enough authority to create a task");
      error.statusCode = 401;
      throw error;
    }
    project = new Project(project._id);
    const task = {
      _id: new ObjectId(),
      ref: taskLength + 1,
      title,
      description,
      status,
      assigns: [],
      comments: [],
      deadline: ''
    };
    await project.addTask(task);
    res.status(201).json({ message: 'Create Task Success', task: task });
  } catch (error) {
    next(error);
  }
};

module.exports.addMembers = async (req, res, next) => {
  const userId = req.userId;
  const projectId = get(req.body, 'projectId');
  let members = get(req.body, 'members', []);

  if (members.length === 0) {
    const error = new Error('members is empty');
    error.statusCode = 422;
    return next(error);
  }

  const schema = Joi.object().keys({
    projectId: Joi.string().required(),
    members: Joi.array().items(Joi.object().keys({
      memberId: Joi.string().required(),
      username: Joi.string().required(),
      createTaskPermission: Joi.boolean().required()
    }))
  });

  const { error, value } = schema.validate({ projectId, members });

  if (error) {
    const err = new Error('Validation Fail');
    err.statusCode = 422;
    return next(err);
  }

  try {
    let project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    if (get(project, 'projectManagerId', '').toString() !== userId.toString()) {
      const error = new Error('Not enough authorization to add members in this project');
      error.statusCode = 401;
      throw error;
    }
    project = new Project(project._id);

    members = members.map(member => ({
      ...member,
      memberId: new ObjectId(get(member, 'memberId'))
    }));

    await project.addMembers(members);
    const mems = get(project, 'members');
    mems.push(members);
    res.status(201).json({ message: "Add Members success", projectId, members: mems });
  } catch (error) {
    next(error);
  }
};

module.exports.assignTask = async (req, res, next) => {
  const userId = req.userId;
  const taskId = get(req.body, 'taskId');
  const projectId = get(req.body, 'projectId');
  const memberIds = get(req.body, 'memberIds');
  const deadline = get(req.body, 'deadline', '');

  const schema = Joi.object().keys({
    taskId: Joi.string().required(),
    projectId: Joi.string().required(),
    memberIds: Joi.array()
  });

  const { error, value } = schema.validate({ taskId, projectId, memberIds });

  if (deadline !== '') {

    const deadlineValidFormat = moment(deadline, 'HH:mm', true).isValid();

    if (!deadlineValidFormat) {
      const err = new Error('Validation Deadline wrong format (HH:mm)');
      err.statusCode = 422;
      return next(err);
    }

  }

  if (error) {
    const err = new Error('Validation Fail');
    err.statusCode = 422;
    return next(err);
  }

  try {
    let project = await Project.findById(projectId);
    const groupIds = get(project, 'members', []).map(member => get(member, 'memberId'));
    groupIds.push(get(project, 'projectManagerId'));

    const taskFound = get(project, 'taskList', []).find(task => task._id.toString() === taskId.toString());

    if (!taskFound) {
      const error = new Error("Can't find tasks");
      error.statusCode = 404;
      throw error;
    }

    const userIdx = groupIds.findIndex(id => id.toString() === userId.toString());
    if (userIdx === -1) {
      const error = new Error("You're not join in this project");
      error.statusCode = 404;
      throw error;
    }
    project = new Project(project._id);
    await project.assignTask(memberIds, taskId, deadline);
    res.status(201).json({ message: "Assign Task Success", projectId, taskId, memberIds, deadline });
  } catch (error) {
    next(error);
  }
};

module.exports.editTaskStatus = async (req, res, next) => {
  const userId = req.userId;
  const taskId = get(req.body, 'taskId');
  const projectId = get(req.body, 'projectId');
  const status = get(req.body, 'status');

  const schema = Joi.object().keys({
    projectId: Joi.string().required(),
    taskId: Joi.string().required()
  });

  const { error, value } = schema.validate({ projectId, taskId });

  if (error) {
    const err = new Error('Validation Fail');
    err.statusCode = 422;
    return next(err);
  }

  try {
    let project = await Project.findById(projectId);
    const statuses = get(project, 'statuses', []);
    const groupIds = get(project, 'members', []).map(member => get(member, 'memberId'));
    groupIds.push(get(project, 'projectManagerId'));
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    const userIdx = groupIds.findIndex(id => id.toString() === userId.toString());
    if (userIdx === -1) {
      const error = new Error("You're not join in this project");
      error.statusCode = 404;
      throw error;
    }
    const taskFound = get(project, 'taskList', []).find(task => task._id.toString() === taskId.toString());
    if (!taskFound) {
      const error = new Error("Can't find tasks");
      error.statusCode = 404;
      throw error;
    }
    const statusIdx = statuses.findIndex(vStat => vStat === status);
    if (statusIdx === -1) {
      const error = new Error('Invalid Status');
      error.statusCode = 422;
      throw error;
    }
    project = new Project(project._id);
    await project.editStatusTask(taskId, status);
    res.status(202).json({ message: "edit Status Success", projectId, taskId, status });
  } catch (error) {
    next(error);
  }
};

module.exports.addCommentTask = async (req, res, next) => {
  const userId = req.userId;
  const taskId = get(req.body, 'taskId');
  const projectId = get(req.body, 'projectId');
  const comment = get(req.body, 'comment');

  const schema = Joi.object().keys({
    projectId: Joi.string().required(),
    taskId: Joi.string().required(),
    comment: Joi.string().required()
  });

  const { error, value } = schema.validate({ projectId, taskId, comment });

  if (error) {
    const err = new Error('Validation Fail');
    err.statusCode = 422;
    return next(err);
  }

  try {
    let project = await Project.findById(projectId);
    const groupIds = get(project, 'members', []).map(member => get(member, 'memberId'));
    groupIds.push(get(project, 'projectManagerId'));
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    const userIdx = groupIds.findIndex(id => id.toString() === userId.toString());
    if (userIdx === -1) {
      const error = new Error("You're not join in this project");
      error.statusCode = 404;
      throw error;
    }
    const taskFound = get(project, 'taskList', []).find(task => task._id.toString() === taskId.toString());
    if (!taskFound) {
      const error = new Error("Can't find tasks");
      error.statusCode = 404;
      throw error;
    }
    project = new Project(project._id);

    await project.addCommentTask(taskId, userId, comment);
    res.status(202).json({ message: "edit Status Success", projectId, taskId, userId, comment });
  } catch (error) {
    next(error);
  }
};

module.exports.editTaskInfo = async (req, res, next) => {
  const userId = req.userId;
  const projectId = get(req.body, 'projectId');
  const taskId = get(req.body, 'taskId');
  const title = get(req.body, 'title');
  const description = get(req.body, 'description');
  const status = get(req.body, 'status');

  const schema = Joi.object().keys({
    taskId: Joi.string().required(),
    projectId: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    status: Joi.string().required()
  });

  const { error, value } = schema.validate({ taskId, projectId, title, description, status });

  if (error) {
    const err = new Error("Validation Failed !");
    err.statusCode = 422;
    return next(error);
  }

  try {
    let project = await Project.findById(projectId);
    let statuses = get(project, 'statuses', []);
    const projectManagerId = get(project, 'projectManagerId', '');
    const members = get(project, 'members');
    if (!project) {
      const error = new Error('Invalid ProjectId');
      error.statusCode = 404;
      throw error;
    }
    const statusIdx = statuses.findIndex(vStat => vStat === status);
    if (statusIdx === -1) {
      const error = new Error('Invalid Status');
      error.statusCode = 422;
      throw error;
    }
    const allowMems = members.filter(member => member.createTaskPermission === true);
    const userIdx = allowMems.findIndex(member => member.memberId.toString() === userId.toString());
    if (userIdx === -1 && userId.toString() !== projectManagerId.toString()) {
      const error = new Error("Not enough authority to edit a task");
      error.statusCode = 401;
      throw error;
    }

    const taskFound = get(project, 'taskList', []).find(task => task._id.toString() === taskId.toString());
    if (!taskFound) {
      const error = new Error("Can't find tasks");
      error.statusCode = 404;
      throw error;
    }

    project = new Project(project._id);

    const task = {
      title,
      description,
      status
    };

    await project.editTaskInfo(taskId, task);
    res.status(201).json({ message: 'Create Task Success', task: task });
  } catch (error) {
    next(error);
  }
};

module.exports.removeMember = async (req, res, next) => {
  const userId = req.userId;
  const role = req.role;
  const validRoles = [ROLE.administrator];
  const projectId = get(req.body, 'projectId');
  const ids = get(req.body, 'ids');

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new Error("Can not find your project");
      error.statusCode = 404;
      throw error;
    }
    const projectMangerId = get(project, 'projectManagerId', '');
    if (String(projectMangerId) !== String(userId) && !validRoles.includes(role)) {
      const error = new Error("Your role is not enough to do this function");
      error.statusCode = 422;
      throw error;
    }

    await Project.removeMembers(projectId, ids);
    const updatedProject = await Project.findById(projectId);
    res.status(201).json({ message: 'success', updatedProject });
  } catch (error) {
    next(error);
  }
};