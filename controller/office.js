const { get, set } = require('lodash');
const Joi = require('@hapi/joi');
const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

const { ROLE } = require('../constant');
const Office = require('../model/office-workplace');
const Company = require('../model/company');
const TimeCheckin = require('../model/time-checkin');
const TimeZone = require('../utils/timezone');

module.exports.createOffice = async (req, res, next) => {
	const role = req.role;
	const validRoles = [ ROLE.administrator ];

	if (!validRoles.includes(role)) {
		const error = new Error('This function only applies for Administrator');
		error.statusCode = 422;
		return next(error);
	}

	const name = get(req.body, 'name');
	const address = get(req.body, 'address');
	const city = get(req.body, 'city');
	const timeStarted = get(req.body, 'timeStarted');
	const timeEnded = get(req.body, 'timeEnded');
	const location = get(req.body, 'location');
	const companyId = req.companyId;

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
		const zoneName = await TimeZone.getTimeZones(get(value, 'location')[1], get(value, 'location')[0]);
		const office = new Office(
			companyId,
			get(value, 'name'),
			get(value, 'address'),
			get(value, 'city'),
			get(value, 'timeStarted'),
			get(value, 'timeEnded'),
			null,
			null,
			null,
			{ type: 'Point', coordinates: get(value, 'location') },
			get(zoneName, 'zoneName')
		);

		const officeInserted = await office.save();

		const company = new Company(null, null, null, companyId);
		await company.addOffice({
			officeId: new ObjectId(get(officeInserted, 'insertedId')),
			name: get(value, 'name'),
			location: { type: 'Point', coordinates: get(value, 'location') }
		});

		res.status(201).json({ message: 'Create Office Success', office });
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.getOffices = async (req, res, next) => {
	const companyId = req.companyId;

	try {
		const offices = await Office.findByCompanyId(companyId);
		res.status(200).json({ message: 'Get offices success', offices });
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.addShift = async (req, res, next) => {
	const officeId = get(req.params, 'officeId');
	const name = get(req.body, 'name');
	const timeStarted = get(req.body, 'timeStarted');
	const timeEnded = get(req.body, 'timeEnded');
	const role = req.role;
	const validRole = [ ROLE.administrator, ROLE.hr ];

	const roleIdx = validRole.findIndex((vRole) => vRole === role);

	if (roleIdx === -1) {
		const error = new Error('Unvalid Role');
		error.statusCode = 401;
		return next(error);
	}

	const schema = Joi.object().keys({
		name: Joi.string().trim().required(),
		timeStarted: Joi.string().trim().required(),
		timeEnded: Joi.string().trim().required()
	});

	const { error, value } = schema.validate({ name, timeStarted, timeEnded });

	const timeStartedValid = moment(timeStarted, 'HH:mm', true).isValid();
	const timeEndedValid = moment(timeEnded, 'HH:mm', true).isValid();

	if (!timeStartedValid) {
		const error = new Error('Invalid time started format');
		error.statusCode = 422;
		return next(error);
	}

	if (!timeEndedValid) {
		const error = new Error('Invalid time ended format');
		error.statusCode = 422;
		return next(error);
	}

	if (error) {
		error.statusCode = 422;
		return next(error);
	}

	try {
		let office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('Invalid OfficeId');
			error.statusCode = 404;
			throw error;
		}
		if (office.companyId.toString() !== req.companyId) {
			const error = new Error('Invalid CompanyId');
			error.statusCode = 404;
			throw error;
		}
		office = new Office(null, null, null, null, null, null, null, null, officeId);
		const shift = {
			name: get(value, 'name'),
			timeStarted: get(value, 'timeStarted'),
			timeEnded: get(value, 'timeEnded')
		};
		const result = await office.addShift(shift);
		res.status(201).json({ message: 'Shift created Success', shift });
	} catch (error) {
		throw error;
	}
};

module.exports.getUserDepartureOffice = async (req, res, next) => {
	const officeId = get(req.params, 'officeId');
	const office = new Office(null, null, null, null, null, null, null, null, officeId);

	try {
		let officeMemberInfo = await office.getMembers();
		officeMemberInfo = officeMemberInfo[0];
		if (!officeMemberInfo) {
			const error = new Error('Invalid OfficeId');
			error.statusCode = 404;
			throw error;
		}
		let departures = await office.getAllDepartures();
		departures = departures[0];
		departures = get(departures, 'departures');
		departures = departures.map((departure) => {
			let departObj = {
				_id: departure._id,
				name: departure.name,
				members: departure.members
			};
			return departObj;
		});
		res.status(200).json({ message: 'Get Success', officeMemberInfo, departures });
	} catch (error) {
		next(error);
	}
};

module.exports.editOffice = async (req, res, next) => {
	const officeId = get(req.params, 'officeId');
	const name = get(req.body, 'name');
	const address = get(req.body, 'address');
	const city = get(req.body, 'city');
	const timeStarted = get(req.body, 'timeStarted');
	const timeEnded = get(req.body, 'timeEnded');
	let location = get(req.body, 'location');
	const shifts = get(req.body, 'shifts', []);
	const companyId = req.companyId;
	const role = req.role;
	const validRoles = [ ROLE.administrator ];

	const roleIdx = validRoles.findIndex((vRole) => vRole === role);
	if (roleIdx === -1) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	const schema = Joi.object().keys({
		name: Joi.string().trim().min(2).required(),
		address: Joi.string().trim().optional().allow(null, ''),
		city: Joi.string().trim().optional().allow(null, ''),
		timeStarted: Joi.string().trim(),
		timeEnded: Joi.string().trim(),
		location: Joi.optional().allow(null, ''),
		shifts: Joi.array()
	});

	const { error, value } = schema.validate({ name, address, city, timeStarted, timeEnded, location });

	if (get(value, 'location.type', '') !== 'Point') {
		location = {
			type: 'Point',
			coordinates: location
		};
	}

	if (error) {
		error.statusCode = 422;
		return next(error);
	}

	try {
		let office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('OfficeId is not existed');
			error.statusCode = 404;
			throw error;
		}

		let updatedOffice = {
			name: get(value, 'name'),
			address: get(value, 'address'),
			city: get(value, 'city'),
			timeStarted: get(value, 'timeStarted'),
			timeEnded: get(value, 'timeEnded'),
			location
		};

		if (shifts.length > 0) {
			updatedOffice['shifts'] = shifts;
		}

		if (get(location, 'coordinates', []).length > 0) {
			const coordinates = get(location, 'coordinates');
			const zoneName = await TimeZone.getTimeZones(coordinates[1], coordinates[0]);

			set(updatedOffice, 'zoneName', get(zoneName, 'zoneName'));
		}

		office = new Office(null, null, null, null, null, null, null, null, office._id);
		const result = await office.updateOffice(updatedOffice);

		res.status(201).json({ message: 'Edit Office Success' });
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.deleteOffice = async (req, res, next) => {
	const officeId = get(req.params, 'officeId');
	const role = req.role;
	const validRoles = [ ROLE.administrator ];

	const roleIdx = validRoles.findIndex((vRole) => vRole === role);
	if (roleIdx === -1) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	try {
		const result = await Office.deleteById(officeId);
		res.status(200).json({ message: 'Remove this office success' });
	} catch (error) {
		next(error);
	}
};

module.exports.getOfficeDetail = async (req, res, next) => {
	const officeId = get(req.params, 'officeId');

	try {
		const office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('OfficeId is not valid');
			error.statusCode = 404;
			throw error;
		}
		res.status(200).json({ message: 'get office Info success', office });
	} catch (error) {
		next(error);
	}
};

module.exports.getCheckinsDate = async (req, res, next) => {
	const role = req.role;
	const officeId = get(req.body, 'officeId');
	const dateFrom = get(req.body, 'dateFrom');
	const dateTo = get(req.body, 'dateTo');

	const validRoles = [ ROLE.hr, ROLE.administrator ];
	if (!validRoles.includes(role)) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	const validDateFrom = moment(dateFrom, 'DD-MM-YYYY', true).isValid();
	const validDateTo = moment(dateTo, 'DD-MM-YYYY', true).isValid();

	if (!validDateFrom || !validDateTo) {
		const error = new Error('DateFrom and DateTo must have format(DD-MM-YYYY)');
		error.statusCode = 422;
		return next(error);
	}

	try {
		const office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('OfficeId is not valid');
			error.statusCode = 404;
			throw error;
		}
		let timeCheckins = await TimeCheckin.findByDate(officeId, dateFrom, dateTo);
		res.status(200).json({ message: 'Fetch Checkins sucess', timeCheckins });
	} catch (error) {
		next(error);
	}
};

module.exports.approveCheckins = async (req, res, next) => {
	const role = req.role;
	const checkinIds = get(req.body, 'checkinIds');

	const schema = Joi.object().keys({
		checkinIds: Joi.array().items(Joi.string())
	});

	const { error } = schema.validate({ checkinIds });

	if (error) {
		const err = new Error(error);
		err.statusCode = 422;
		return next(err);
	}

	const validRoles = [ ROLE.hr, ROLE.administrator ];
	if (!validRoles.includes(role)) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	try {
		await TimeCheckin.approveCheckins(checkinIds);
		res.status(201).json({ message: 'success update' });
	} catch (error) {
		next(error);
	}
};

module.exports.cancelCheckinApprovals = async (req, res, next) => {
	const role = req.role;
	const checkinIds = get(req.body, 'checkinIds');

	const schema = Joi.object().keys({
		checkinIds: Joi.array().items(Joi.string())
	});

	const { error } = schema.validate({ checkinIds });

	if (error) {
		const err = new Error(error);
		err.statusCode = 422;
		return next(err);
	}

	const validRoles = [ ROLE.hr, ROLE.administrator ];
	if (!validRoles.includes(role)) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	try {
		await TimeCheckin.cancelCheckinApprovals(checkinIds);
		res.status(201).json({ message: 'Success Update' });
	} catch (error) {
		next(error);
	}
};

module.exports.getApprovalCheckins = async (req, res, next) => {
	const role = req.role;
	const officeId = get(req.query, 'officeId');
	const page = parseInt(get(req.query, 'page', 1));

	const validRoles = [ ROLE.hr, ROLE.administrator ];
	if (!validRoles.includes(role)) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	try {
		const office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('OfficeId is not valid');
			error.statusCode = 404;
			throw error;
		}
		let timeCheckins = await TimeCheckin.findApprovalCheckins(officeId, page);
		res.status(200).json({ message: 'Fetch Checkins sucess', timeCheckins });
	} catch (error) {
		next(error);
	}
};

module.exports.getUnapprovalCheckins = async (req, res, next) => {
	const role = req.role;
	const officeId = get(req.query, 'officeId');
	const page = parseInt(get(req.query, 'page', 1));

	const validRoles = [ ROLE.hr, ROLE.administrator ];
	if (!validRoles.includes(role)) {
		const error = new Error('Unauthorization');
		error.statusCode = 401;
		return next(error);
	}

	try {
		const office = await Office.findById(officeId);
		if (!office) {
			const error = new Error('OfficeId is not valid');
			error.statusCode = 404;
			throw error;
		}
		let timeCheckins = await TimeCheckin.findUnapprovalCheckins(officeId, page);
		res.status(200).json({ message: 'Fetch Checkins sucess', timeCheckins });
	} catch (error) {
		next(error);
	}
};
