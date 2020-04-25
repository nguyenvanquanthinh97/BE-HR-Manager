const { get, set } = require('lodash');
const Joi = require('@hapi/joi');
const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');

const { ROLE, OKR_LEVEL } = require('../constant');
const Company = require('../model/company');
const User = require('../model/user');
const Departure = require('../model/departure');
const Project = require('../model/project');
const QuarterObjective = require('../model/quarter-objective');
const OKR = require('../model/okr');


module.exports.getCompany = async (req, res, next) => {
    const companyId = req.companyId;

    try {
        const company = await Company.findById(companyId);
        if (!company) {
            const err = new Error('Invalid CompanyID');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json({ message: "Get Company Info Success", company });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};

module.exports.getStaffs = async (req, res, next) => {
    const companyId = req.companyId;
    const page = Number.parseInt(get(req.query, 'page', 1));

    try {
        let users = await User.findByCompanyId(companyId, page);
        if (!users) {
            const error = new Error('Invalid companyId');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({ message: "success", users });
    } catch (error) {
        next(error);
    }
};

module.exports.getStatistics = async (req, res, next) => {
    const companyId = req.companyId;

    try {
        const company = await Company.findById(companyId);
        const officeWorkplaces = get(company, 'officeWorkplaces', []);
        const numOfOffices = officeWorkplaces.length;
        const officeIds = officeWorkplaces.map(office => office.officeId);
        const numOfDepartures = await Departure.countDeparturesInCompanyByOfficeIds(officeIds);
        const numOfProjects = await Project.countByCompanyId(companyId);
        const numOfUsers = await User.countUsersInCompany(companyId);
        res.status(200).json({ message: "Get Statistics Success", numOfOffices, numOfDepartures, numOfProjects, numOfUsers });
    } catch (error) {
        next(error);
    }
};

module.exports.createQuarterObjective = async (req, res, next) => {
    const companyId = req.companyId;
    const role = req.role;
    const validRole = [ROLE.administrator];
    const title = get(req.body, 'title');
    const dateStart = get(req.body, 'dateStart');

    if (!validRole.includes(String(role).toUpperCase())) {
        const error = new Error("Unauthorization");
        error.statusCode = 422;
        return next(error);
    }

    const schema = Joi.object().keys({
        title: Joi.string().required(),
        dateStart: Joi.string().required()
    });

    const { error } = schema.validate({ title, dateStart });

    if (error) {
        const error = new Error(error);
        error.statusCode = 422;
        return next(error);
    }

    const isDateStartValid = moment(dateStart, 'YYYY-MM-DD').isValid();

    if (!isDateStartValid) {
        const error = new Error("Invalid date start format");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const dateStartQuarter = moment(dateStart, 'YYYY-MM-DD');
        const dateEndQuarter = moment(dateStartQuarter).add(3, 'months');
        const quarterObjective = new QuarterObjective(null, companyId, title, dateStartQuarter, dateEndQuarter);
        const quarterObjInserted = await quarterObjective.save();

        set(quarterObjective, '_id', get(quarterObjInserted, 'insertedId'));

        res.status(201).json({ message: "Create Quarter Objective Success", quarterObjective });
    } catch (error) {
        next(error);
    }
};

module.exports.createOKR = async (req, res, next) => {
    const companyId = req.companyId;
    const quarterObjectiveId = get(req.body, 'quarterObjectiveId');
    const title = get(req.body, 'title');
    const level = get(req.body, 'level');
    const officeId = get(req.body, 'officeId', '');
    const departureId = get(req.body, 'departureId');
    const userId = get(req.body, 'userId');
    const keyResultIds = get(req.body, 'keyResultIds', []);
    const prevOKRIds = get(req.body, 'prevOKRIds', []);
    const assignId = get(req.body, 'assignId');

    const schema = Joi.object().keys({
        quarterObjectiveId: Joi.string().required(),
        title: Joi.string().required(),
        level: Joi.string().uppercase().valid(OKR_LEVEL.company, OKR_LEVEL.team, OKR_LEVEL.individual).required(),
        officeId: Joi.string().optional().allow(null, ''),
        departureId: Joi.string().optional().allow(null, ''),
        userId: Joi.string().optional().allow(null, ''),
        keyResultIds: Joi.array().items(Joi.string()),
        prevOKRIds: Joi.array().items(Joi.string()),
        assignId: Joi.string().optional().allow(null)
    });

    const { error } = schema.validate({ quarterObjectiveId, title, level, officeId, departureId, userId, keyResultIds, prevOKRIds, assignId });

    if (error) {
        const error = new Error(error);
        error.statusCode = 422;
        return next(error);
    }

    try {
        const okr = new OKR(null, quarterObjectiveId, title, level, companyId, officeId, departureId, userId, keyResultIds, prevOKRIds, assignId);
        const okrInserted = await okr.save();
        const okrId = get(okrInserted, 'insertedId');
        const prevOKRIdsLength = prevOKRIds.length;
        if (prevOKRIdsLength > 0) {
            const prevOKRId = prevOKRIds[prevOKRIdsLength - 1];
            await OKR.addChildOKR(prevOKRId, okrId);
        }
        set(okr, '_id', okrId);
        res.status(201).json({ message: "create okr success", okr });
    } catch (error) {
        next(error);
    }
};

module.get.getAllOKRSByQuarterId = async (req, res, next) => {
    const quarterId = get(req.params, 'quarterId');

    try {
        const okrs = await OKR.findByQuarterObjectiveId(quarterId);
        res.status(200).json({ message: "Get all okrs in quarter success", okrs });
    } catch (error) {
        next(error);
    }
};

module.exports.getQuarterObjectiveList = async (req, res, next) => {
    const companyId = req.companyId;

    try {
        const quarterObjectives = await QuarterObjective.findByCompanyId(companyId);
        res.status(200).json({ message: "Get Quarter Objective List Success", quarterObjectives });
    } catch (error) {
        next(error);
    }
};

module.exports.editQuarterObjective = async (req, res, next) => {
    const quarterId = get(req.params, 'quarterId');
    const role = req.role;
    const validRole = [ROLE.administrator];
    const title = get(req.body, 'title');
    const dateStart = get(req.body, 'dateStart');

    if (!validRole.includes(String(role).toUpperCase())) {
        const error = new Error("Unauthorization");
        error.statusCode = 422;
        return next(error);
    }

    const schema = Joi.object().keys({
        title: Joi.string().required(),
        dateStart: Joi.string().required()
    });

    const { error } = schema.validate({ title, dateStart });

    if (error) {
        const error = new Error(error);
        error.statusCode = 422;
        return next(error);
    }

    const isDateStartValid = moment(dateStart, 'YYYY-MM-DD').isValid();

    if (!isDateStartValid) {
        const error = new Error("Invalid date start format");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const dateStartQuarter = moment(dateStart, 'YYYY-MM-DD');
        const dateEndQuarter = moment(dateStartQuarter).add(3, 'months');

        const updatedQuarterObjective = {
            title,
            dateStart: dateStartQuarter,
            dateEnd: dateEndQuarter
        };

        await QuarterObjective.updateByQuarterId(quarterId, updatedQuarterObjective);
    } catch (error) {
        next(error);
    }
};

module.exports.editOKR = async (req, res, next) => {
    const okrId = get(req.params, 'okrId');
    const companyId = req.companyId;
    const quarterObjectiveId = get(req.body, 'quarterObjectiveId');
    const title = get(req.body, 'title');
    const level = get(req.body, 'level');
    const officeId = get(req.body, 'officeId', '');
    const departureId = get(req.body, 'departureId');
    const userId = get(req.body, 'userId');
    const assignId = get(req.body, 'assignId');

    try {
        const updatedOKR = {
            quarterId: new ObjectId(quarterObjectiveId),
            title,
            level,
            companyId: new ObjectId(companyId),
            officeId: new ObjectId(officeId),
            departureId: new ObjectId(departureId),
            userId: new ObjectId(userId),
            assignId: new ObjectId(assignId)
        };

        const okr = new OKR(okrId);
        await okr.update(updatedOKR);

        res.status(202).json({ message: "Update OKR Success", updatedOKR });
    } catch (error) {
        next(error);
    }
};

module.exports.deleteOKR = async (req, res, next) => {
    const okrId = get(req.params, 'okrId');

    try {
        const okr = await OKR.findOneById(okrId);
        const prevOKRIds = get(okr, 'prevOKRIds', []);
        const prevOKRIsLength = prevOKRIds.length;
        if (prevOKRIsLength > 0) {
            const prevOKRId = prevOKRIds[prevOKRIsLength - 1];
            await OKR.deleteChildOKR(prevOKRId, okrId);
        }
        await OKR.deleteOKR(okrId, prevOKRIds);
        res.status(201).json({ message: "Delete OKR Success" });
    } catch (error) {
        next(error);
    }
};

module.exports.getOKRs = async (req, res, next) => {
    const okrId = get(req.params, 'okrId');

    try {
        const okr = await OKR.findOneById(okrId);
        const keyResultIds = get(okr, 'keyResultIds', []);
        const prevOKRIds = get(okr, 'prevOKRIds', []);

        const keyResultIdsLength = keyResultIds.length;
        const prevOKRIdsLength = prevOKRIds.length;

        const totalLength = keyResultIdsLength + prevOKRIdsLength;

        const keyResults = [];
        const prevOKRs = [];

        if (keyResultIdsLength > 0 || prevOKRIdsLength > 0) {
            const okrIds = [...prevOKRIds, ...keyResultIds];
            const okrs = await OKR.findByOKRIds(okrIds);


            for (let idx = 0; idx < totalLength - 1; idx++) {
                if (idx < prevOKRIdsLength) {
                    prevOKRs.push(okrs[idx]);
                    continue;
                }
                keyResults.push(okrs[idx]);
            }
        }

        res.status(200).json({ message: "Get OKRS Success", prevOKRs, keyResults });
    } catch (error) {
        next(error);
    }
};

module.exports.getCompanyInfo = async (req, res, next) => {
    const companyId = req.companyId;

    try {
        const company = await Company.findById(companyId);
        const offices = get(company, 'officeWorkplaces', []);
        const officeIds = [];

        const companyInfos = {
            _id: get(company, '_id'),
            name: get(company, 'name'),
        };

        const officeInfos = offices.map(office => {
            const _id = get(office, 'officeId');

            officeIds.push(_id);
            return {
                _id,
                name: get(office, 'name')
            };
        });

        const departureInfos = await Departure.findDeparturesInCompanyByOfficeIds(officeIds);
        const userInfos = await User.findByCompanyIdWithLimitField(companyId);

        res.status(200).json({ message: "Get Company Info Success For OKRS", companyInfos, officeInfos, departureInfos, userInfos });
    } catch (error) {
        next(error);
    }
};