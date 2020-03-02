const { ObjectId } = require('mongodb');

const { getDB } = require('../config/database');
module.exports = class OfficeWorkplace {
    constructor(companyId, name, address, city, timeStarted, timeEnded, departures, shifts, id, location) {
        this.companyId = new ObjectId(companyId);
        this.name = name;
        this.address = address;
        this.city = city;
        this.timeStarted = timeStarted;
        this.timeEnded = timeEnded;
        this.shifts = shifts || [];
        this._id = id ? new ObjectId(id) : null;
        this.location = location;
    }

    save() {
        const db = getDB();

        return db.collection('office_workplaces')
            .insertOne(this);
    }

    addDeparture(departureId) {
        const db = getDB();

        return db.collection('office_workplaces')
            .updateOne({ _id: this._id }, { $push: {departureIds: departureId} });
    }

    addShift(shift) {
        const db = getDB();

        return db.collection('office_workplaces')
            .updateOne({ _id: this._id }, { $push: { shifts: { shiftId: new ObjectId(), ...shift } } });
    }

    getAllDepartures() {
        const db = getDB();
        return db.collection('office_workplaces')
            .aggregate([{$lookup: {
                from: 'departures',
                localField: '_id',
                foreignField: 'officeId',
                as: 'departures'
            }}]).toArray();
    }

    getMembers() {
        const db = getDB();

        return db.collection('office_workplaces')
            .aggregate([{$lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'officeWorkplaceId',
                as: 'members'
<<<<<<< HEAD
            }}, {$project: {_id: 1, name: 1, shifts: 1 , "members._id": 1, "members.username": 1, "members.email": 1}}]).toArray();
=======
            }}, {$project: {_id: 1, name: 1 , "members._id": 1, "members.username": 1, "members.email": 1}}]).toArray();
>>>>>>> 1fa8d7e21b5c61bdc08b210851e45630fb4dbe2a
    }

    static findById(departureId) {
        const db = getDB();

        return db.collection('office_workplaces')
            .findOne({_id: new ObjectId(departureId)})
    }

    static findByCompanyId(companyId) {
        const db = getDB()

        return db.collection('office_workplaces')
            .find({companyId: new ObjectId(companyId)})
            .toArray();
    }
};