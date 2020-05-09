const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { getDB } = require('../config/database');

module.exports = class TimeCheckin {
  constructor(id, companyId, officeId, officeName, userId, username, checkin, checkout, duration, late, isConfirmed, shiftId, shiftName, zoneName) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.officeId = officeId ? new ObjectId(officeId) : null;
    this.officeName = officeName;
    this.userId = userId ? new ObjectId(userId) : null;
    this.username = username;
    this.checkin = checkin;
    this.checkout = checkout;
    this.duration = duration || 0;
    this.lateDuration = late || 0;
    this.isConfirmed = isConfirmed ? true : false;
    this.shiftId = shiftId ? new ObjectId(shiftId) : null;
    this.shiftName = shiftName;
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

  static findByDate(officeId, dateFrom, dateTo) {
    const db = getDB();

    return db.collection('timeCheckins')
      .aggregate(
        [
          {
            $match: {
              officeId: new ObjectId(officeId),
              $and: [
                { updatedAt: { $gte: moment(dateFrom, 'DD-MM-YYYY').toDate() } },
                { updatedAt: { $lt: moment(dateTo, 'DD-MM-YYYY').toDate() } }
              ]
            }
          },
          {
            $group: {
              _id: {
                userId: "$userId",
                username: "$username"
              },
              totalWorkDuration: { $sum: '$duration' },
              totalLateDuration: { $sum: '$lateDuration' },
              checkins: {
                $push: "$$ROOT"
              },
            }
          },
          {
            $project: {
              userId: 1,
              username: 1,
              totalWorkDuration: 1,
              totalLateDuration: 1,
              "checkins._id": 1,
              "checkins.checkin.dateChecked": 1,
              "checkins.officeId": 1,
              "checkins.officeName": 1,
              "checkins.checkout.dateChecked": 1,
              "checkins.shiftId": 1,
              "checkins.shiftName": 1,
              "checkins.isConfirmed": 1
            }
          }
        ]
      )
      .toArray();
  }

  static findApprovalCheckins(officeId, page = 1) {
    const db = getDB();
    const items = 10;

    return db.collection('timeCheckins')
      .find({
        officeId: new ObjectId(officeId),
        isConfirmed: true
      })
      .skip((page - 1) * items)
      .limit(items)
      .toArray();
  }

  static findUnapprovalCheckins(officeId, page = 1) {
    const db = getDB();
    const items = 10;

    return db.collection('timeCheckins')
      .find({
        officeId: new ObjectId(officeId),
        isConfirmed: false
      })
      .skip((page - 1) * items)
      .limit(items)
      .toArray();
  }

  static approveCheckins(checkinIds) {
    const db = getDB();

    const ids = checkinIds.map(id => new ObjectId(id));

    return db.collection('timeCheckins')
      .updateMany({ _id: { $in: ids } }, { $set: { isConfirmed: true } });
  }

  static cancelCheckinApprovals(checkinIds) {
    const db = getDB();

    const ids = checkinIds.map(id => new ObjectId(id));

    return db.collection('timeCheckins')
      .updateMany({ _id: { $in: ids } }, { $set: { isConfirmed: false } });
  }

  static findByUserId(userId, page = 1) {
    const db = getDB();
    const items = 10;

    return db.collection('timeCheckins')
      .find({ userId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * items)
      .limit(items)
      .toArray();
  }
};