const jwt = require('jsonwebtoken');
const { get } = require('lodash');

const BlackList = require('../model/black-lists');

module.exports = async (req, res, next) => {
    const token = req.get('Authorization').split(' ')[1];
    let decodedToken;
    if (!token) {
        const error = new Error("Unauthention User");
        res.statusCode = 401;
        return next(error);
    }

    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        const error = new Error("Invalid Token");
        error.statusCode = 401;
        return next(error);
    }

    const blackJWT = await BlackList.searchJWT(token);

    if (blackJWT) {
        const error = new Error("Invalid Token");
        error.statusCode = 401;
        return next(error);
    }

    req.token = token;
    req.companyId = get(decodedToken, 'companyId');
    req.userId = get(decodedToken, 'userId');
    next();
};