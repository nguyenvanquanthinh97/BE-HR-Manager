const { get, set } = require('lodash');
const Joi = require('@hapi/joi');
const { ObjectId } = require('mongodb');

const Office = require('../model/office-workplace');
const Company = require('../model/company');

module.exports.createOffice = async (req, res, next) => {
    const name = get(req.body, 'name');
    const address = get(req.body, 'address');
    const city = get(req.body, 'city');
    const timeStarted = get(req.body, 'timeStarted');
    const timeEnded = get(req.body, 'timeEnded');
    const location = get(req.body, 'location');
    const companyId = req.companyId;
    console.log(companyId);

    const schema = Joi.object().keys({
        name: Joi.string().trim().min(2).required(),
        address: Joi.string().trim().optional().allow(null, ''),
        city: Joi.string().trim().optional().allow(null, ''),
        timeStarted: Joi.string().trim(),
        timeEnded: Joi.string().trim(),
        location: Joi.array()
    });

    const { error, value } = schema.validate({ name, address, city, timeStarted, timeEnded, location });

    if (error) {
        error.statusCode = 422;
        return next(error);
    }

    try {
        const office = new Office(companyId, get(value, 'name'), get(value, 'address'), get(value, 'city'), get(value, 'timeStarted'), get(value, 'timeEnded'), null, null, null, { type: 'Point', coordinates: get(value, 'location') });

        const officeInserted = await office.save();

        const company = new Company(null, null, null, companyId);
        await company.addOffice({ officeId: new ObjectId(get(officeInserted, 'insertedId')), name: get(value, 'name'), location: { type: 'Point', coordinates: get(value, 'location') } });

        res.status(201).json({ message: "Create Office Success", office });
    } catch (error) {
        error.statusCode = 500;
        return next(error);
    }
};

module.exports.getOffices = async (req, res, next) => {
    const companyId = req.companyId;

    try {
        const offices = await Office.findByCompanyId(companyId);
        res.status(200).json({ message: "Get offices success", offices });
    } catch (error) {
        error.statusCode = 500;
        return next(error);
    }
};