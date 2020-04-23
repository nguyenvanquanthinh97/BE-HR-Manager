const { get, set } = require('lodash');

const Company = require('../model/company');
const User = require('../model/user');
const Departure = require('../model/departure');
const Project = require('../model/project');

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

        res.status(200).json({ message: "Get Statistics Success", numOfOffices, numOfDepartures, numOfProjects });
    } catch (error) {
        next(error);
    }
};