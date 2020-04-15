const { ObjectId } = require('mongodb');

const { getDB } = require('../config/database');

module.exports = class TimeCheckin {
  constructor(id, companyId, officeId, userId, checkin, checkout, duration, isConfirmed, shiftId) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.officeId = officeId ? new ObjectId(officeId) : null;
    this.userId = userId ? new ObjectId(userId) : null;
    this.checkin = checkin;
    this.checkout = checkout;
    this.duration = duration || 0;
    this.isConfirmed = isConfirmed ? true : false;
    this.shiftId = shiftId ? new ObjectId(shiftId) : null;
  }

  punchIn() {
    const db = getDB();

    return db.collection('timeCheckins')
      .insertOne(this);
  }

  punchOut(checkout, duration) {
    const db = getDB();

    return db.collection('timeCheckins')
      .updateOne({ _id: this._id }, { $set: { checkout: checkout, duration: duration } });
  }

  static findOneByUserId(userId) {
    const db = getDB();

    return db.collection('timeCheckins')
      .find({ userId: new ObjectId(userId), checkout: null })
      .sort({ userId: -1 })
      .limit(1)
      .toArray();
  }

  static findOneById(id) {
    const db = getDB();

    return db.collection('timeCheckins')
      .findOne({ _id: new ObjectId(id) });
  }
};