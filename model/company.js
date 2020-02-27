const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Company {
    constructor(name, userRegisteredId, officeWorkplaces, id) {
        this.name = name;
        this.userRegisteredId = userRegisteredId;
        this.officeWorkplaces = officeWorkplaces || [];
        this.verify = false;
        this._id = id ? new ObjectId(id) : null;
    }

    save() {
        const db = getDB();

        return db.collection('companies')
            .insertOne(this);
    }

    addOffice(office) {
        const db = getDB();

        return db.collection('companies')
            .updateOne({ _id: this._id }, { $push: { officeWorkplaces: office } });
    }

    static findById(companyId) {
        const db = getDB();

        return db.collection('companies')
            .findOne({ _id: new ObjectId(companyId) });
    }

    static updatedById(companyId, args) {
        const db = getDB();

        return db.collection('companies')
            .updateOne({ _id: new ObjectId(companyId) }, { $set: args });
    }

    static findByUserId(userId) {
        const db = getDB();

        return db.collection('companies')
            .findOne({ userRegisteredId: new ObjectId(userId) });
    }

    static updateByUserId(userId, args) {
        const db = getDB();

        return Company.findByUserId(userId)
            .then(company => Company.updatedById(company._id, args));
    }
};