const MongoClient = require('mongodb').MongoClient;

const url = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/";

let _db;

const initialConnect = (callback) => {
    MongoClient.connect(url)
        .then(client => {
            _db = client.db('office-manager');
            console.log('Mongo Initial')
            return callback();
        })
        .catch(err => {
            if (err) {
                throw err;
            }
        });
};

const getDB = () => {
    if (_db) {
        return _db;
    }
    throw new Error("Error in connecting to Mongodb");
};

module.exports = {
    initialConnect,
    getDB
};