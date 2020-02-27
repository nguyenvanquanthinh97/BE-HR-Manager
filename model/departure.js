const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Departure {
    constructor(officeId, name, memberIds, leaderId, isAnotherDeparture, id) {
        this.officeId = new ObjectId(officeId);
        this.name = name;
        this.memberIds = memberIds || [];
        this.leaderId = leaderId ? new ObjectId(leaderId) : null;
        this.isAnotherDeparture = isAnotherDeparture;
        this._id = id ? new ObjectId(id) : null;
    }

    save() {
        const db = getDB();

        return db.collection('departures')
            .insertOne(this);
    }

    static addMember(memberId) {
        const db = getDB();

        return db.collection('departures')
            .updateOne({ _id: this._id }, { $push: { memberIds: memberId } });
    }

    static setLeaderId(leaderId) {
        const db = getDB();

        return db.collection('departures')
            .updateOne({ _id: this._id }, { $set: { leaderId: leaderId } });
    }

    static findByOfficeId(officeId) {
        const db = getDB();

        return db.collection('departures')
            .find({officeId: new ObjectId(officeId)})
            .toArray();
    }
};