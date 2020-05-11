const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Project {
  constructor(id, companyId, name, prefixedCode, description, statuses, taskList, members, projectManagerId, projectManagerUsername) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = new ObjectId(companyId);
    this.name = name;
    this.prefixedCode = prefixedCode;
    this.description = description;
    this.statuses = statuses || [];
    this.taskList = taskList || [];
    this.members = members || [];
    this.projectManagerId = new ObjectId(projectManagerId);
    this.projectManagerUsername = projectManagerUsername;
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

  editTaskInfo(taskId, task) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ _id: new ObjectId(this._id), "taskList._id": new ObjectId(taskId) }, { $set: { "taskList.$": task } });
  }

  addMembers(members) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ _id: this._id }, { $push: { members: { $each: members } } });
  }

  assignTask(memberIds, taskId, deadline) {
    const db = getDB();

    const ids = memberIds.map(id => new ObjectId(id));

    return db.collection('projects')
      .updateOne({ _id: this._id, "taskList._id": new ObjectId(taskId) }, { $set: { "taskList.$.assigns": ids, "taskList.$.deadline": deadline } });
  }

  editStatusTask(taskId, status) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ _id: this._id, "taskList._id": new ObjectId(taskId) }, { $set: { "taskList.$.status": status } });
  }

  addCommentTask(taskId, userId, comment) {
    const db = getDB();

    const userComment = {
      userId: new ObjectId(userId),
      comment
    };

    return db.collection('projects')
      .updateOne({ _id: this._id, "taskList._id": new ObjectId(taskId) }, { $push: { "taskList.$.comments": userComment } });
  }

  static getProjectList(companyId) {
    const db = getDB();

    return db.collection('projects')
      .find({ companyId: new ObjectId(companyId) })
      .project({ name: 1, prefixedCode: 1, description: 1, members: 1, projectManagerId: 1, projectManagerUsername: 1 })
      .toArray();
  }

  static getDetailById(projectId) {
    const db = getDB();

    return db.collection('projects')
      .aggregate([
        {
          $match: { _id: new ObjectId(projectId) }
        },
        {
          $lookup:
          {
            from: 'users',
            localField: 'members.memberId',
            foreignField: '_id',
            as: 'members'
          }
        },
        {
          $lookup:
          {
            from: 'users',
            localField: 'projectManagerId',
            foreignField: '_id',
            as: 'projectManagerInfo'
          }
        },
        {
          $project:
          {
            companyId: 1,
            name: 1,
            prefixedCode: 1,
            description: 1,
            statuses: 1,
            taskList: 1,
            'members._id': 1,
            'members.username': 1,
            'members.email': 1,
            'members.img': 1,
            projectManagerId: 1,
            'projectManagerInfo.email': 1,
            'projectManagerInfo.img': 1,
            projectManagerUsername: 1
          }
        }
      ])
      .toArray();
  }

  static findById(projectId) {
    const db = getDB();

    return db.collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
  }

  static findByMemberId(memberId) {
    const db = getDB();

    return db.collection('projects')
      .find({ "members.memberId": new ObjectId(memberId) }, { name: 1, description: 1 })
      .toArray();
  }

  static updateMemberUsername(companyId, memberId, username) {
    const db = getDB();

    return db.collection('projects')
      .updateOne({ companyId: new ObjectId(companyId), "members.memberId": new ObjectId(memberId) }, { $set: { "members.$.username": username } });
  }

  static countByCompanyId(companyId) {
    const db = getDB();

    return db.collection('projects')
      .find({ companyId: new ObjectId(companyId) })
      .count();
  }

  static removeMembers(projectId, memberIds) {
    const db = getDB();

    let ids = memberIds.map(id => new ObjectId(id));

    return db.collection('projects')
      .updateOne(
        {
          _id: new ObjectId(projectId),
          "taskList.assigns": {
            $in: ids
          }
        },
        [
          {
            $pull: {
              members: {
                memberId: { $in: ids }
              }
            }
          },
          {
            $set: {
              "taskList.$.assigns": {
                $pull: { $in: ids }
              }
            }
          }
        ]
      );
  }
};