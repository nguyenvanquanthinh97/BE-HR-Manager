const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { getDB } = require('../config/database');

module.exports = class TimeCheckin {
  constructor(id, companyId, officeId, userId, checkin, checkout, duration, isConfirmed, shiftId, zoneName) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.officeId = officeId ? new ObjectId(officeId) : null;
    this.userId = userId ? new ObjectId(userId) : null;
    this.checkin = checkin;
    this.checkout = checkout;
    this.duration = duration || 0;
    this.isConfirmed = isConfirmed ? true : false;
    this.shiftId = shiftId ? new ObjectId(shiftId) : null;
    this.createdAt = zoneName ? moment().tz(zoneName).toDate() : moment().toDate();
    this.updatedAt = this.createdAt;
  }

  punchIn() {
    const db = getDB();

    return db.collection('timeCheckins')
      .insertOne(this);
  }

  punchOut(checkout, duration, zoneName) {
    const db = getDB();

    return db.collection('timeCheckins')
      .updateOne({ _id: this._id }, { $set: { checkout: checkout, duration: duration, updatedAt: moment().tz(zoneName).toDate() } });
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

  static findByDate(officeId, dateQuery) {
    const db = getDB();

    return db.collection('timeCheckins')
      .find({
        officeId: new ObjectId(officeId), $and: [
          { updatedAt: { $gte: moment(dateQuery, 'MM-DD-YYYY').toDate() } },
          { updatedAt: { $lt: moment(dateQuery, 'MM-DD-YYYY').add(1, 'days').toDate() } }
        ]
      })
      .toArray();
  }

  static approveCheckins(checkinIds) {
    const db = getDB();

    return db.collection('timeCheckins')
      .updateMany({ _id: { $in: checkinIds } }, { $set: { isConfirmed: true } });
  }

  static cancelCheckinApprovals(checkinIds) {
    const db = getDB();

    return db.collection('timeCheckins')
      .updateMany({ _id: { $in: checkinIds } }, { $set: { isConfirmed: false } });
  }
};