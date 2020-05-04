const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Departure {
    constructor(officeId, name, members, leader, isAnotherDeparture, id) {
        this._id = id ? new ObjectId(id) : null;
        this.officeId = new ObjectId(officeId);
        this.name = name;
        this.members = members || [];
        // this.leader = leader;
        this.isAnotherDeparture = isAnotherDeparture ? new ObjectId(isAnotherDeparture) : null;
    }

    save() {
        const db = getDB();

        return db.collection('departures')
            .insertOne(this);
    }

    addMember(memberId, username) {
        const db = getDB();

        const member = {
            userId: new ObjectId(memberId),
            username
        };

        return db.collection('departures')
            .updateOne({ _id: this._id }, { $push: { members: member } });
    }

    static findById(departureId) {
        const db = getDB();

        return db.collection('departures')
            .findOne({ _id: new ObjectId(departureId) });
    }

    // static setLeader(departureId, leaderId, leaderUsername) {
    //     const db = getDB();

    //     const leader = {
    //         userId: new ObjectId(leaderId),
    //         username: leaderUsername
    //     };

    //     return db.collection('departures')
    //         .updateOne({ _id: this._id }, { $set: { leader: leader } });
    // }

    static findByOfficeId(officeId) {
        const db = getDB();

        return db.collection('departures')
            .find({ officeId: new ObjectId(officeId) })
            .toArray();
    }

    static findDeparturesInCompanyByOfficeIds(officeIds) {
        const db = getDB();

        const ids = officeIds.map(officeId => new ObjectId(officeId));

        return db.collection('departures')
            .find({ officeId: { $in: ids } })
            .toArray();
    }

    static countDeparturesInCompanyByOfficeIds(officeIds) {
        const db = getDB();

        const ids = officeIds.map(officeId => new ObjectId(officeId));

        return db.collection('departures')
            .find({ officeId: { $in: ids } })
            .count();
    }

    static findByCompanyIdAndOfficeId(companyId, officeId) {
        const db = getDB();

        return db.collection('departures')
            
    }
};