const { ObjectId } = require('mongodb');
const uniqid = require('uniqid');

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
            .updateOne({ _id: this._id }, { $push: { shifts: { shiftId: new ObjectId(uniqid()), ...shift } } });
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