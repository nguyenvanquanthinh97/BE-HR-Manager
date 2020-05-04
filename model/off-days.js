const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { getDB } = require('../config/database');

module.exports = class OffDayPermission {
  constructor(id, companyId, userId, fromDate, toDate, duration, reason, description) {
    this._id = id ? new ObjectId(id) : null;
    this.companyId = new ObjectId(companyId);
    this.userId = userId ? new ObjectId(userId) : null;
    this.fromDate = moment(fromDate, 'DD-MM-YYYY').toDate();
    this.toDate = moment(toDate, 'DD-MM-YYYY').toDate();
    this.duration = duration;
    this.reason = reason;
    this.description = description;
    this.accepted = null;
    this.verifyingUser = null;
    this.deniedReason = null;
  }

  save() {
    const db = getDB();

    return db.collection('off_days')
      .insertOne(this);
  }

  static findById(id) {
    const db = getDB();

    return db.collection('off_days')
      .aggregate([
        {
          $match: {
            _id: new ObjectId(id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $lookup: {
            from: 'office_workplaces',
            localField: 'userInfo.officeWorkplaceId',
            foreignField: '_id',
            as: 'officeInfo'
          }
        },
        {
          $lookup: {
            from: 'departures',
            localField: 'userInfo.departureId',
            foreignField: '_id',
            as: 'departureInfo'
          }
        },
        {
          $project: {
            companyId: 1,
            userId: 1,
            fromDate: 1,
            toDate: 1,
            duration: 1,
            reason: 1,
            description: 1,
            accepted: 1,
            verifyingUser: 1,
            deniedReason: 1,
            "userInfo.username": 1,
            "userInfo.email": 1,
            "userInfo.role": 1,
            "userInfo.officeWorkplaceId": 1,
            "userInfo.departureId": 1,
            "userInfo.shifts": 1,
            "officeInfo": 1,
            "officeInfo": 1,
            "officeInfo": 1,
            "departureInfo.name": 1,
          }
        }
      ])
      .toArray();
  }

  static findAll(companyId, page = 1) {
    const items = 10;
    const db = getDB();

    return db.collection('off_days')
      .aggregate([
        {
          $match: {
            companyId: new ObjectId(companyId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $project: {
            companyId: 1,
            userId: 1,
            fromDate: 1,
            toDate: 1,
            duration: 1,
            reason: 1,
            description: 1,
            accepted: 1,
            verifyingUser: 1,
            deniedReason: 1,
            "userInfo.username": 1,
            "userInfo.email": 1,
            "userInfo.role": 1,
            "userInfo.officeWorkplaceId": 1,
            "userInfo.departureId": 1,
            "userInfo.shifts": 1,
          }
        },
        {
          $skip: (page - 1) * items
        },
        {
          $limit: items
        }
      ])
      .toArray();
  }

  static approvePermission(ids, verifyingUser) {
    const objectIds = ids.map(id => new ObjectId(id));
    const db = getDB();

    return db.collection('off_days')
      .updateMany({ _id: { $in: objectIds } }, { $set: { accepted: true, verifyingUser: verifyingUser } });
  }

  static DenyPermission(id, denyingUser, deniedReason) {
    const db = getDB();

    return db.collection('off_days')
      .updateOne({ _id: new ObjectId(id) }, { $set: { verifyingUser: denyingUser, deniedReason: deniedReason, accepted: false } });
  }

  static findApprovePermission(companyId, page = 1, isApproval) {
    const items = 10;
    const db = getDB();

    let isAccepted = isApproval;

    if(typeof(isApproval) === 'string') {
      isAccepted = isApproval === 'true' ? true : false;
      isAccepted = isApproval === 'null' ? null : isAccepted;
    }

    return db.collection('off_days')
      .aggregate([
        {
          $match: {
            companyId: new ObjectId(companyId),
            accepted: isAccepted
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $project: {
            companyId: 1,
            userId: 1,
            fromDate: 1,
            toDate: 1,
            duration: 1,
            reason: 1,
            description: 1,
            accepted: 1,
            verifyingUser: 1,
            deniedReason: 1,
            "userInfo.username": 1,
            "userInfo.email": 1,
            "userInfo.role": 1,
            "userInfo.officeWorkplaceId": 1,
            "userInfo.departureId": 1,
            "userInfo.shifts": 1,
          }
        },
        {
          $skip: (page - 1) * items
        },
        {
          $limit: items
        }
      ])
      .toArray();
  }

};