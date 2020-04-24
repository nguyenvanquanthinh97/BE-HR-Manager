const { ObjectId } = require('mongodb');

const { getDB } = require('../config/database');

module.exports = class OKR {
  constructor(id, title, level, companyId, officeId, departureId, userId, keyResults, prevOKRIds, assignId) {
    this._id = id ? new ObjectId(id) : null;
    this.title = title;
    this.level = level;
    this.companyId = companyId ? new ObjectId(companyId) : null;
    this.officeId = officeId ? new ObjectId(officeId) : null;
    this.departureId = departureId ? new ObjectId(departureId) : null;
    this.userId = userId ? new ObjectId(userId) : null;
    this.keyResults = keyResults || [];
    this.prevOKRIds = prevOKRIds || [];
    this.assignId = assignId ? new ObjectId(assignId) : null;
  }
};