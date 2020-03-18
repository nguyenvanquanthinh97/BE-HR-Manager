const { get, set } = require('lodash');
const Joi = require('@hapi/joi');
const { ObjectId } = require('mongodb');

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

  const schema = Joi.object().keys({
    name: Joi.string().trim().required(),
    prefixedCode: Joi.string().trim().required(),
    description: Joi.string().trim().optional().allow(null, ''),
    projectManagerId: Joi.string().trim()
  });

  const { error, value } = schema.validate({ name, prefixedCode, description, projectManagerId });

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
    const project = new Project(null, companyId, name, prefixedCode, description, null, null, null, projectManagerId);
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
    set(project, 'statuses', statuses);
    res.status(201).json({ message: "Add status success", project });
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
    if(statusIdx === -1) {
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

