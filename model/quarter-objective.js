const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { getDB } = require('../config/database');

module.exports = class QuarterObjective {
  constructor(id, companyId, title, dateStart, dateEnd) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.title = title;
    this.dateStart = moment(dateStart).toDate();
    this.dateEnd = moment(dateEnd).toDate();
  }

  save() {
    const db = getDB();

    return db.collection('quarter_objectives')
      .insertOne(this);
  }

  static findByCompanyId(companyId) {
    const db = getDB();

    return db.collection('quarter_objectives')
      .find({ companyId: new ObjectId(companyId) })
      .toArray();
  }

  static updateByQuarterId(quarterId, updatedQuarterObjective) {
    const db = getDB();

    return db.collection('quarter_objectives')
      .updateOne({ _id: new ObjectId(quarterId) }, { $set: updatedQuarterObjective });
  }
};