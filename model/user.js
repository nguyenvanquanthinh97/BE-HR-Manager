const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');


module.exports = class User {
    constructor(username, email, companyId, role, password, officeWorkplaceId, departureId, id) {
        this.username = username,
            this.email = email;
        this.companyId = companyId ? new ObjectId(companyId) : null;
        this.role = role;
        this.password = password;
        this._id = id ? new ObjectId(id) : null;
        this.officeWorkplaceId = officeWorkplaceId ? new ObjectId(officeWorkplaceId) : null;
        this.departureId = departureId ? new ObjectId(departureId) : null;
    }

    save() {
        const db = getDB();

        return db.collection('users')
            .insertOne(this);
    }

    resetPassword(newPassword) {
        const db = getDB();

        return db.collection('users')
            .updateOne({ _id: new ObjectId(this._id) }, { $set: { password: newPassword } });
    }

    static assignShiftByIds(userIds, shifts) {
        const db = getDB();

        let ids = userIds.map(userId => new ObjectId(userId));

        return db.collection('users')
            .updateMany({ _id: { $in: ids } }, { $set: shifts });
    }

    static findById(userId) {
        const db = getDB();

        return db.collection('users')
            .findOne({ _id: new ObjectId(userId) });
    }

    static findByEmail(email) {
        const db = getDB();

        return db.collection('users')
            .findOne({ email: email });
    }

    static findByCompanyId(companyId, page) {
        const db = getDB();
        const size = 10;

        return db.collection('users')
            .aggregate([
                {
                    $match: { companyId: new ObjectId(companyId) }
                },
                {
                    $skip: (page - 1) * size
                },
                {
                    $limit: size
                },
                {
                    $lookup: {
                        from: 'office_workplaces',
                        localField: 'officeWorkplaceId',
                        foreignField: '_id',
                        as: 'office'
                    }
                },
                {
                    $lookup: {
                        from: 'departures',
                        localField: 'departureId',
                        foreignField: '_id',
                        as: 'departure'
                    }
                },
                {
                    $project: { _id: 1, username: 1, email: 1, role: 1, "office._id": 1, "office.name": 1, "departure._id": 1, "departure.name": 1 }
                }
            ]).toArray();
    }

    static findByCompanyIdWithLimitField(companyId) {
        const db = getDB();

        return db.collection('users')
            .find({ companyId: new ObjectId(companyId) }, { username: 1, email: 1 })
            .toArray();
    }

    static countUsersInCompany(companyId) {
        const db = getDB();

        return db.collection('users')
            .find({ companyId: new ObjectId(companyId) })
            .count();
    }
};