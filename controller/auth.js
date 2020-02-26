const { get, set } = require('lodash');
const Joi = require('@hapi/joi');
const EmailTemplate = require('email-templates');
const sgMail = require('@sendgrid/mail');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../model/user');
const Company = require('../model/company');
const BlackList = require('../model/black-lists');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.signup = async (req, res, next) => {
    const companyName = get(req.body, 'companyName');
    const username = get(req.body, 'username');
    const email = get(req.body, 'email');
    const password = get(req.body, 'password');
    const role = 'administrator';

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
        const companyId = get(companyInserted, "insertedId");
        const user = new User(get(value, 'username'), get(value, 'email'), companyId, role, hasedPassword);
        const userInserted = await user.save();
        await Company.updatedById(companyId, { userRegisteredId: new ObjectId(get(userInserted, 'insertedId')) });
        res.status(201).json({ message: "Create User Success" });
        let template = new EmailTemplate({
            views: {
                root: 'views'
            }
        });
        const result = await template.render('verify-email.pug', {
            username,
            verifyUrl: (process.env.DOMAIN || 'http://localhost:5000/') + 'auth/verify-email/' + get(userInserted, 'insertedId')
        });
        sgMail.send({
            to: get(value, 'email'),
            from: 'no-reply@HR-Manager.com',
            subject: 'Validation Email',
            html: result
        });

    } catch (error) {
        console.log(error);
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
        res.status(202).json({ message: "Verify Success" });
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
        if (!user) {
            const error = new Error("Invalid Email or Password");
            error.statusCode = 401;
            return next(error);
        }
        const result = await bcrypt.compare(get(value, 'password'), get(user, 'password'));
        if (!result) {
            const error = new Error("Invalid Email or Password");
            error.statusCode = 401;
            return next(error);
        }
        const token = 'Bearer ' + jwt.sign({ email: email, userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.status(200).json({ message: "Log in success", token, userId: user._id });
    } catch (error) {
        error.statusCode = 500;
        next(error);
    }
};

module.exports.logout = async (req, res, next) => {
    const blackToken = new BlackList(get(req, 'token'));
    try {
        await blackToken.save();
        res.status(200).json({ message: "Logout Success" });
    } catch (error) {
        error.statusCode = 500;
        return next(error);
    }
};