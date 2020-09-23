const { get, set, omit } = require('lodash');
const Joi = require('@hapi/joi');
const EmailTemplate = require('email-templates');
const sgMail = require('@sendgrid/mail');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../model/user');
const Company = require('../model/company');
const Departure = require('../model/departure');
const BlackList = require('../model/black-lists');
const Office = require('../model/office-workplace');

const { ROLE } = require('../constant');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.signup = async (req, res, next) => {
	const companyName = get(req.body, 'companyName');
	const username = get(req.body, 'username');
	const email = get(req.body, 'email');
	const password = get(req.body, 'password');
	const role = ROLE.administrator;

	const schema = Joi.object().keys({
		companyName: Joi.string().trim().min(2).required(),
		username: Joi.string().trim().min(2).required(),
		email: Joi.string().trim().email().required(),
		password: Joi.string().trim().min(6)
	});

	const { error, value } = schema.validate({ companyName, username, email, password });

	if (error) {
		const err = new Error(error);
		err.statusCode = 422;
		return next(err);
	}

	try {
		const salt = await bcrypt.genSalt(12);
		const hasedPassword = await bcrypt.hash(get(value, 'password'), salt);
		const company = new Company(companyName);
		const companyInserted = await company.save();
		const companyId = get(companyInserted, 'insertedId');
		const user = new User(get(value, 'username'), get(value, 'email'), companyId, role, hasedPassword);
		const userInserted = await user.save();
		await Company.updatedById(companyId, { userRegisteredId: new ObjectId(get(userInserted, 'insertedId')) });
		res.status(201).json({ message: 'Create User Success' });
		let template = new EmailTemplate({
			views: {
				root: 'views'
			}
		});
		const result = await template.render('verify-email.pug', {
			username,
			verifyUrl:
				(process.env.BACKEND_DOMAIN || 'http://localhost:5000/') +
				'auth/verify-email/' +
				get(userInserted, 'insertedId')
		});
		sgMail.send({
			to: get(value, 'email'),
			from: 'no-reply@HR-Manager.com',
			subject: 'Validation Email',
			html: result
		});
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.verifyEmail = async (req, res, next) => {
	const userId = get(req.params, 'userId');

	try {
		const user = await User.findById(userId);
		if (!user) {
			const error = new Error("Can't find your account");
			error.statusCode = 404;
			return next(error);
		}
		await Company.updateByUserId(userId, { verify: true });
		res.redirect(301, process.env.FRONTEND_DOMAIN || 'http://localhost:5000/login');
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.login = async (req, res, next) => {
	const email = get(req.body, 'email');
	const password = get(req.body, 'password');

	const schema = Joi.object().keys({
		email: Joi.string().trim().email().required(),
		password: Joi.string().required()
	});

	const { error, value } = schema.validate({ email, password });

	if (error) {
		error.statusCode = 422;
		return next(error);
	}

	try {
		const user = await User.findByEmail(get(value, 'email'));

		const actived = get(user, 'actived', true);
		if (!actived) {
			const error = new Error('user is inactive');
			error.statusCode = 401;
			return next(error);
		}

		if (!user) {
			const error = new Error('Invalid Email or Password');
			error.statusCode = 401;
			return next(error);
		}
		const result = await bcrypt.compare(get(value, 'password'), get(user, 'password'));
		if (!result) {
			const error = new Error('Invalid Email or Password');
			error.statusCode = 401;
			return next(error);
		}
		const company = Company.findById(get(user, 'companyId'));
		const token =
			'Bearer ' +
			jwt.sign(
				{
					email: email,
					userId: user._id,
					companyId: get(user, 'companyId'),
					companyName: get(company, 'name'),
					role: get(user, 'role'),
					username: get(user, 'username')
				},
				process.env.JWT_SECRET,
				{ expiresIn: '2h' }
			);
		res.status(200).json({ message: 'Log in success', token, userId: user._id });
	} catch (error) {
		error.statusCode = 500;
		next(error);
	}
};

module.exports.logout = async (req, res, next) => {
	const blackToken = new BlackList(get(req, 'token'));
	try {
		await blackToken.save();
		res.status(200).json({ message: 'Logout Success' });
	} catch (error) {
		error.statusCode = 500;
		return next(error);
	}
};

module.exports.addStaff = async (req, res, next) => {
	const email = get(req.body, 'email');
	const username = get(req.body, 'username');
	let role = get(req.body, 'role', '');
	const officeId = get(req.body, 'officeId');
	const departureId = get(req.body, 'departureId');
	const companyId = req.companyId;
	const companyName = req.companyName;
	const trustedUsername = req.username;
	const trustedUserRole = req.role;

	const validRoles = [ ROLE.administrator, ROLE.hr ];

	role = role.toUpperCase();

	const roleIdx = validRoles.findIndex((vRole) => vRole === trustedUserRole);

	if (roleIdx === -1) {
		const error = new Error('Unauthorization User');
		error.statusCode = 401;
		return next(error);
	}

	const schema = Joi.object().keys({
		email: Joi.string().trim().email().required(),
		username: Joi.string().trim().min(2).required(),
		role: Joi.string().trim().valid(ROLE.staff, ROLE.hr, ROLE.leader),
		officeId: Joi.string().trim().required(),
		departureId: Joi.string().trim().required()
	});

	const { error, value } = schema.validate({ email, username, role, officeId, departureId });

	if (error) {
		error.statusCode = 422;
		return next(error);
	}

	try {
		const office = new Office(companyId, null, null, null, null, null, null, null, officeId);
		let departures = await office.getAllDepartures();
		departures = get(departures[0], 'departures');

		let defaultPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(process.env.DEFINED_PASSWORD, salt));

		if (!departures) {
			const err = new Error('Invalid OfficeId');
			err.statusCode = 404;
			throw err;
		}

		let departure = departures.find((depart) => depart._id.toString() === departureId.toString());
		if (!departure) {
			const err = new Error('Invalid DepartureId');
			err.statusCode = 404;
			throw err;
		}

		const user = new User(
			get(value, 'username'),
			get(value, 'email'),
			companyId,
			get(value, 'role'),
			defaultPassword,
			get(value, 'officeId'),
			get(value, 'departureId')
		);

		const userInserted = await user.save();

		departure = new Departure(get(value, 'officeId'), null, null, null, null, get(value, 'departureId'));

		await departure.addMember(get(userInserted, 'insertedId'), get(value, 'username'));

		res.status(201).json({ message: 'Create user sucess', user });

		let template = new EmailTemplate({
			views: {
				root: 'views'
			}
		});

		const result = await template.render('staff-request-change-password.pug', {
			username,
			usernameAdded: trustedUsername,
			companyName,
			defaultPassword: process.env.DEFINED_PASSWORD,
			resetUrl: (process.env.FRONTEND_DOMAIN || 'http://localhost:5000/') + 'auth/reset-password/'
		});
		sgMail.send({
			to: get(value, 'email'),
			from: 'no-reply@HR-Manager.com',
			subject: 'Validation Email',
			html: result
		});
	} catch (error) {
		throw error;
	}
};

module.exports.addStaffs = async (req, res, next) => {
	const staffs = get(req.body, 'staffs', []);
	const companyId = req.companyId;
	const companyName = req.companyName;
	const trustedUsername = req.username;
	const trustedUserRole = req.role;

	const validRoles = [ ROLE.administrator, ROLE.hr ];

	const roleIdx = validRoles.findIndex((vRole) => vRole === trustedUserRole);

	if (roleIdx === -1) {
		const error = new Error('Unauthorization User');
		error.statusCode = 401;
		return next(error);
	}

	const schema = Joi.array().items(
		Joi.object().keys({
			email: Joi.string().trim().email().required(),
			username: Joi.string().trim().min(2).required(),
			role: Joi.string().trim().valid(ROLE.staff, ROLE.hr, ROLE.leader),
			office: Joi.string().trim().allow(null).optional(),
			departure: Joi.string().trim().allow(null).optional(),
			officeId: Joi.string().trim().required(),
			departureId: Joi.string().trim().required()
		})
	);

	const { error } = schema.validate(staffs);

	if (error) {
		const err = new Error('Validation fail!');
		err.statusCode = 422;
		return next(err);
	}

	try {
		const officeObj = {};
		let defaultPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(process.env.DEFINED_PASSWORD, salt));
		for (let idx = 0; idx < staffs.length; idx++) {
			officeObj[staffs[idx].officeId] = true;
			staffs[idx].officeWorkplaceId = new ObjectId(staffs[idx].officeId);
			staffs[idx].departureId = new ObjectId(staffs[idx].departureId);
			staffs[idx].role = staffs[idx].role.toUpperCase();
			staffs[idx].companyId = new ObjectId(companyId);
			staffs[idx].password = defaultPassword;
			delete staffs[idx].officeId;
		}

		let departures = await Departure.findDeparturesInCompanyByOfficeIds(Object.keys(officeObj));

		const departuresObject = {};

		let tmp;
		departures.forEach((depart) => {
			tmp = depart._id;
			if (!departuresObject[tmp]) {
				departuresObject[tmp] = true;
			}
		});

		const validStaffs = staffs.filter((staff) => departuresObject[staff.departureId]);

		const { insertedIds: insertedIdsObj } = await User.addManyStaffs(validStaffs);

		const insertedIds = Object.values(insertedIdsObj);

		const insertedStaffs = await User.findByIds(companyId, insertedIds);

		await Departure.addMembers(insertedStaffs);

		if (insertedIds.length === staffs.length) {
			res.status(201).json({ message: 'All users successfully created !' });
		} else {
			res.status(201).json({ message: `Only ${insertedIds.length} staffs are successfully created !` });
		}

		// Send gmail
		let template = new EmailTemplate({
			views: {
				root: 'views'
			}
		});

		const asyncResults = [];
		const emails = [];

		validStaffs.forEach(({ username, email }) => {
			emails.push(email);
			asyncResults.push(
				template.render('staff-request-change-password.pug', {
					username,
					usernameAdded: trustedUsername,
					companyName,
					defaultPassword: process.env.DEFINED_PASSWORD,
					resetUrl: (process.env.FRONTEND_DOMAIN || 'http://localhost:5000/') + 'auth/reset-password/'
				})
			);
		});

		const results = await Promise.all(asyncResults);

		for (let i = 0; i < results.length; i++) {
			sgMail.send({
				to: emails[i],
				from: 'no-reply@HR-Manager.com',
				subject: 'Validation Email',
				html: results[i]
			});
		}
	} catch (err) {
		next(err);
	}
};

module.exports.resetPassword = async (req, res, next) => {
	const email = get(req.body, 'email');
	const oldPassword = get(req.body, 'oldPassword');
	const newPassword = get(req.body, 'newPassword');

	const schema = Joi.object().keys({
		email: Joi.string().trim().email().required(),
		oldPassword: Joi.string().required(),
		newPassword: Joi.string().trim().min(6).required()
	});

	const { error, value } = schema.validate({ email, oldPassword, newPassword });

	if (error) {
		const error = new Error('Validation Error !');
		error.statusCode = 422;
		return next(error);
	}

	try {
		let user = await User.findByEmail(get(value, 'email'));
		if (!user) {
			const error = new Error('Email not found');
			error.statusCode = 404;
			throw error;
		}
		const password = get(user, 'password');
		const result = await bcrypt.compare(oldPassword, password);
		if (!result) {
			const error = new Error('Wrong Password');
			error.statusCode = 406;
			throw error;
		}
		user = new User(null, null, null, null, null, null, null, user._id);
		const hashedPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(get(value, 'newPassword'), salt));
		await user.resetPassword(hashedPassword);
		res.status(201).json({ message: 'Account Reset Password Success' });
	} catch (error) {
		return next(error);
	}
};

module.exports.inActiveUser = async (req, res, next) => {
	const userId = req.userId;
	const role = req.role;
	const companyId = req.companyId;
	const validRoles = [ ROLE.administrator, ROLE.hr ];

	const inactivedUserId = get(req.params, 'userId');

	if (!validRoles.includes(role)) {
		const error = new Error('Your role is not enough to do this');
		error.statusCode = 422;
		return next(error);
	}

	try {
		const inactivedUser = await User.findById(inactivedUserId);
		if (inactivedUser === ROLE.administrator) {
			const error = new Error('Sorry can not inactive this user');
			error.statusCode = 422;
			throw error;
		}
		if (String(get(inactivedUser, 'companyId')) !== String(companyId)) {
			const error = new Error('This user is not in your company');
			error.statusCode = 404;
			throw error;
		}
		await User.setInactiveUser(inactivedUserId, userId);
		const user = await User.findById(inactivedUserId);
		res.status(201).json({ message: 'success', inactivedUser: omit(user, 'password') });
	} catch (error) {
		next(error);
	}
};
