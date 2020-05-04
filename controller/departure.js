const { get, set } = require('lodash');
const Joi = require('@hapi/joi');

const { ROLE } = require('../constant');
const Company = require('../model/company');
const Departure = require('../model/departure');
const Office = require('../model/office-workplace');

module.exports.createDeparture = async (req, res, next) => {
    const companyId = req.companyId;
    const officeId = get(req.body, 'officeId');
    const name = get(req.body, 'name');
    const isAnotherDeparture = get(req.body, 'isAnotherDeparture');

    const schema = Joi.object().keys({
        officeId: Joi.string().trim().required(),
        name: Joi.string().trim().required(),
        isAnotherDeparture: Joi.string().trim().optional().allow(null, '')
    });

    const { error, value } = schema.validate({ officeId, name, isAnotherDeparture });

    if (error) {
        error.statusCode = 422;
        return next(error);
    }

    try {

        const company = await Company.findById(companyId);
        const officeFound = get(company, 'officeWorkplaces', []).find(officeEl => String(get(officeEl, 'officeId')) === String(officeId));

        if (!officeFound) {
            const error = new Error("This office does not belong to your company");
            error.statusCode = 422;
            throw error;
        }

        const departure = new Departure(get(value, 'officeId'), get(value, 'name'), null, null, get(value, 'isAnotherDeparture'));
        const result = await departure.save();
        res.status(201).json({ message: "Departure Create Success", departure });
    } catch (error) {
        error.statusCode = 500;
        next(error);
    }
};

module.exports.getDepartures = async (req, res, next) => {
    const companyId = req.companyId;
    const officeId = get(req.params, 'officeId');
    try {
        const company = await Company.findById(companyId);
        const officeFound = get(company, 'officeWorkplaces', []).find(officeEl => String(get(officeEl, 'officeId')) === String(officeId));

        if (!officeFound) {
            const error = new Error("This departer does not belong to your company");
            error.statusCode = 422;
            throw error;
        }

        const office = new Office(companyId, null, null, null, null, null, null, null, officeId);
        let departures = await office.getAllDepartures();
        departures = departures[0];
        if (!departures) {
            const err = new Error('Invalid OfficeId');
            err.statusCode = 404;
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

// module.exports.setLeader = async (req, res, next) => {
//     const role = req.role;
//     const validRole = [ROLE.administrator];
//     const companyId = req.companyId;
//     const departureId = get(req.body, 'departureId');
//     const leaderId = get(req.body, 'userId');
//     const leaderUsername = get(req.body, 'username');

//     if (!validRole.includes(role)) {
//         const error = new Error("Your authorization is not enough to do this");
//         error.statusCode = 422;
//         return next(error);
//     }

//     try {
//         let departure = await Departure.findById(departureId);

//         if (!departure) {
//             const error = new Error("Cannot find departure");
//             error.statusCode = 422;
//             throw error;
//         }
//         const officeId = get(departure, 'officeId');

//         const company = await Company.findById(companyId);
//         const office = get(company, 'officeWorkplaces', []).find(officeEl => String(get(officeEl, 'officeId')) === String(officeId));

//         if (!office) {
//             const error = new Error("This departer does not belong to your company");
//             error.statusCode = 422;
//             throw error;
//         }

//         await Departure.setLeader(departureId, leaderId, leaderUsername);

//         departure = await Departure.findById(departureId);
//         res.status(200).json({ message: "set leader success", departure });
//     } catch (error) {
//         next(error);
//     }
// };