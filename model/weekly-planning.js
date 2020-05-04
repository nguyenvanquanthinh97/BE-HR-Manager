const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { getDB } = require('../config/database');

module.exports = class WeeklyPlanning {
  constructor(id, userId, title, status, dueDate, objectiveIds = [], quarterObjectiveId) {
    this._id = id ? new ObjectId(id) : null;
    this.userId = new ObjectId(userId);
    this.title = title;
    this.status = status;
    this.dueDate = dueDate ? moment(dueDate, 'MM-DD-YYYY').toDate() : moment(Date.now()).toDate();

    let objectiveObjectIds = [];

    if (objectiveIds.length > 0) {
      objectiveObjectIds = objectiveIds(objectiveId => new ObjectId(objectiveId));
    }
    this.objectiveIds = objectiveObjectIds;
    this.quarterObjectiveId = quarterObjectiveId ? new ObjectId(quarterObjectiveId) : null;
  }

  save() {
    const db = getDB();

    return db.collection('weekly_planning')
      .insertOne(this);
  }

  updateOne(updatedWeeklyPlanning) {
    const db = getDB();

    return db.collection('weekly_planning')
      .updateOne({ _id: this._id }, { $set: updatedWeeklyPlanning });
  }

  static findById(id) {
    const db = getDB();

    return db.collection('weekly_planning')
      .findOne({ _id: new ObjectId(id) });
  }

  static deleteById(id) {
    const db = getDB();

    return db.collection('weekly_planning')
      .deleteOne({ _id: new ObjectId(id) });
  }

  static findByUserIdAndQuarterObjectiveId(userId, quarterObjectiveId) {
    const db = getDB();

    return db.collection('weekly_planning')
      .find({ userId: new ObjectId(userId), quarterObjectiveId: new ObjectId(quarterObjectiveId) })
      .toArray();
  }
};