const { get, set } = require('lodash');

const Company = require('../model/company');

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
        if(!error.statusCode){
            error.statusCode = 500;
        }
        next(error);
    }
};