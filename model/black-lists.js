const { getDB } = require('../config/database');

module.exports = class BlackList {
    constructor(jwt) {
        this.jwt = jwt;
    }

    save() {
        const db = getDB();

        return db.collection('black_lists')
            .insertOne({ createdAt: new Date(), ...this });
    }

    static searchJWT(jwt) {
        const db = getDB();

        return db.collection('black_lists')
            .findOne({jwt: jwt});
    }
};