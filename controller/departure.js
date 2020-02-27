const { get, set } = require('lodash');
const Joi = require('@hapi/joi');

const Departure = require('../model/departure');
const Office = require('../model/office-workplace');

module.exports.createDeparture = async (req, res, next) => {
    const officeId = get(req.body, 'officeId');
    const name = get(req.body, 'name');
    const isAnotherName = get(req.body, 'isAnotherName');

    const schema = Joi.object().keys({
        officeId: Joi.string().trim().required(),
        name: Joi.string().trim().required(),
        isAnotherName: Joi.string().trim().optional().allow(null, '')
    });

    const { error, value } = schema.validate({ officeId, name, isAnotherName });

    if (error) {
        error.statusCode = 422;
        return next(error);
    }

    try {
        const departure = new Departure(get(value, 'officeId'), get(value, 'name'), null, null, get(value, 'isAnotherName'));
        const result = await departure.save();
        res.status(201).json({ message: "Departure Create Success", departure });
    } catch (error) {
        error.statusCode = 500;
        next(error);
    }
};

module.exports.getDepartures = async (req, res, next) => {
    const officeId = get(req.params, 'officeId');
    const companyId = req.companyId;
    try {
        const office = new Office(companyId, null, null, null, null, null, null, null, officeId);
        let departures = await office.getAllDepartures();
        departures = departures[0];
        if (!departures) {
            const err = new Error('Invalid OfficeId');
            err.statusCode = 404;
            throw err;
        }
        if (companyId.toString() !== get(departures, 'companyId').toString()) {
            const err = new Error('Invalid OfficeId');
            error.statusCode = 404;
            throw err;
        }
        res.status(200).json({ message: "Get successes", departures: get(departures, 'departures') });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};