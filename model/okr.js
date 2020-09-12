const { ObjectId } = require('mongodb');
const { get } = require('lodash');

const { getDB } = require('../config/database');

module.exports = class OKR {
  constructor(id, quarterId, title, level, companyId, officeId, departureId, userId, keyResultIds, prevOKRIds, assignId) {
    this._id = id ? new ObjectId(id) : null;
    this.progress = 0;
    this.quarterId = quarterId ? new ObjectId(quarterId) : null;
    this.title = title;
    this.level = level;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.officeId = officeId ? new ObjectId(officeId) : null;
    this.departureId = departureId ? new ObjectId(departureId) : null;
    this.userId = userId ? new ObjectId(userId) : null;
    this.keyResultIds = keyResultIds || [];
    this.prevOKRIds = prevOKRIds || [];
    this.assignId = assignId ? new ObjectId(assignId) : null;
    this.taskIds = [];
  }

  save() {
    const db = getDB();

    return db.collection('okrs')
      .insertOne(this);
  }

  update(updatedOKR) {
    const db = getDB();

    return db.collection('okrs')
      .updateOne({ _id: this._id }, { $set: updatedOKR });
  }

  static addChildOKR(parentId, childId) {
    const db = getDB();

    return db.collection('okrs')
      .updateOne({ _id: new ObjectId(parentId) }, { $push: { keyResultIds: new ObjectId(childId) } });
  }

  static deleteChildOKR(parentId, childId) {
    const db = getDB();

    return db.collection('okrs')
      .updateOne({ _id: new ObjectId(parentId) }, { $pull: { keyResultIds: new ObjectId(childId) } });
  }

  static findByQuarterObjectiveId(quarterId) {
    const db = getDB();

    return db.collection('okrs')
      .find({ quarterId: new ObjectId(quarterId) })
      .toArray();
  }

  static deleteOKR(okrId, keyResultIds = []) {
    const db = getDB();

    if (keyResultIds.length === 0) {
      return db.collection('okrs')
        .deleteOne({ _id: new ObjectId(okrId) });
    }

    return db.collection('okrs')
      .deleteMany({
        $or: [
          { _id: new ObjectId(okrId) },
          { prevOKRIds: new ObjectId(okrId) }
        ]
      });
  }

  static findOneById(okrId) {
    const db = getDB();

    return db.collection('okrs')
      .findOne({ _id: new ObjectId(okrId) });
  }

  static findByOKRIds(okrIds) {
    const db = getDB();

    const ids = okrIds.map(id => new ObjectId(id));

    return db.collection('okrs')
      .find({ _id: { $in: ids } })
      .toArray();
  }

  static updateProgress(updatedOKRsProgress) {
    /* 
    updatedOKRProgress = {
      _id,
      progress
    }
    */
    const db = getDB();

    const ids = [];
    const cases = updatedOKRsProgress.map(okr => {
      const _id = new ObjectId(get(okr, '_id'));
      ids.push(_id);
      return {
        case: { $eq: ["$_id", new ObjectId(_id)] }, then: Number(get(okr, 'progress'))
      };
    });

    return db.collection('okrs')
      .updateMany(
        { _id: { $in: ids } },
        [
          {
            $set: {
              progress: {
                $switch: {
                  branches: cases,
                  default: 0
                }
              }
            }
          }
        ]
      );
  }
};