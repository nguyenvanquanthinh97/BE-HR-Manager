const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Project {
  constructor(id, companyId, name, prefixedCode, description, statuses, taskList, members, projectManagerId) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = new ObjectId(companyId);
    this.name = name;
    this.prefixedCode = prefixedCode;
    this.description = description;
    this.statuses = statuses || [];
    this.taskList = taskList || [];
    this.members = members || [];
    this.projectManagerId = new ObjectId(projectManagerId);
  }

  save() {
    const db = getDB();

    return db.collection('projects')
      .insertOne(this);
  }

  addStatus(status) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ _id: new ObjectId(this._id) }, { $push: { statuses: status } });
  }

  addTask(task) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ _id: new ObjectId(this._id) }, { $push: { taskList: task } });
  }

  static getProjectList(companyId) {
    const db = getDB();

    return db.collection('projects')
      .find({ companyId: new ObjectId(companyId) })
      .project({ name: 1, prefixedCode: 1, description: 1, memberIds: 1, projectManagerId: 1})
      .toArray();
  }

  static findById(projectId) {
    const db = getDB();

    return db.collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
  }
};