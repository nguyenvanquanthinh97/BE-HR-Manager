const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');


module.exports = class User {
    constructor(username, email, companyId, role, password, officeWorkplaceId, departureId, id) {
        this.username = username,
            this.email = email;
        this.companyId = companyId;
        this.role = role;
        this.password = password || process.env.DEFINED_PASSWORD;
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
};