const { ObjectId } = require('mongodb');

const User = require('./user');
const { getDB } = require('../config/database');
module.exports = class OfficeWorkplace {
    constructor(companyId, name, address, city, timeStarted, timeEnded, departures, shifts, id, location, zoneName) {
        this.companyId = new ObjectId(companyId);
        this.name = name;
        this.address = address;
        this.city = city;
        this.timeStarted = timeStarted;
        this.timeEnded = timeEnded;
        this.shifts = shifts || [];
        this._id = id ? new ObjectId(id) : null;
        this.location = location;
        this.zoneName = zoneName;
    }

    save() {
        const db = getDB();

        return db.collection('office_workplaces')
            .insertOne(this);
    }

    addDeparture(departureId) {
        const db = getDB();

        return db.collection('office_workplaces')
            .updateOne({ _id: this._id }, { $push: { departureIds: departureId } });
    }

    addShift(shift) {
        const db = getDB();

        return db.collection('office_workplaces')
            .updateOne({ _id: this._id }, { $push: { shifts: { shiftId: new ObjectId(), ...shift } } });
    }

    getAllDepartures() {
        const db = getDB();
        return db.collection('office_workplaces')
            .aggregate([
                {
                    $match: { _id: new ObjectId(this._id) }
                },
                {
                    $lookup: {
                        from: 'departures',
                        localField: '_id',
                        foreignField: 'officeId',
                        as: 'departures'
                    }
                }]).toArray();
    }

    getMembers() {
        const db = getDB();

        return db.collection('office_workplaces')
            .aggregate([
                {
                    $match: { _id: new ObjectId(this._id) }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'officeWorkplaceId',
                        as: 'members'
                    }
                }, { $project: { _id: 1, name: 1, shifts: 1, "members._id": 1, "members.username": 1, "members.email": 1 } }]).toArray();
    }

    updateOffice(args) {
        const db = getDB();

        return db.collection('office_workplaces')
            .updateOne({ _id: this._id }, { $set: args });
    }

    static findById(officeId) {
        const db = getDB();

        return db.collection('office_workplaces')
            .findOne({ _id: new ObjectId(officeId) });
    }

    static findByCompanyId(companyId) {
        const db = getDB();

        return db.collection('office_workplaces')
            .find({ companyId: new ObjectId(companyId) })
            .toArray();
    }

    static deleteById(officeId) {
        const db = getDB();

        return db.collection('users')
            .findOne({ officeWorkplaceId: new ObjectId(officeId) })
            .then(user => {
                if (user) {
                    const error = new Error("Can not delete this office, there is still a user in");
                    error.statusCode = 422;
                    throw error;
                }
            })
            .then(() => {
                db.collection('office_workplaces')
                    .deleteOne({ _id: new ObjectId(officeId) });
            });
    }

    static findByGeo(location) {
        const db = getDB();

        return db.collection('office_workplaces')
            .find(
                {
                    location: {
                        $near: {
                            $geometry: location,
                            $maxDistance: 50
                        }
                    }
                }
            ).toArray();
    }
};