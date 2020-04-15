const { get, omit } = require('lodash');
const Joi = require('@hapi/joi');
const moment = require('moment-timezone');

const { ROLE } = require('../constant');
const User = require('../model/user');
const Office = require('../model/office-workplace');
const TimeCheckin = require('../model/time-checkin');

module.exports.assignShift = async (req, res, next) => {
    const userIds = get(req.body, 'userIds');
    const officeId = get(req.body, 'officeId');
    const shiftRegistered = get(req.body, 'shiftRegistered');
    const role = req.role;
    const validRole = [ROLE.administrator, ROLE.hr];

    const roleIdx = validRole.findIndex(vRole => vRole === role);

    const schema = Joi.object().keys({
        userIds: Joi.array().required(),
        officeId: Joi.string().required(),
        shiftRegistered: Joi.array().items(Joi.object().keys({
            dayWeek: Joi.array().items(Joi.number().min(0).max(6)).required(),
            shiftedId: Joi.string().required()
        })).required()
    });

    const { error, value } = schema.validate({ userIds, officeId, shiftRegistered });

    if (error) {
        const error = new Error('Invalid input');
        error.statusCode = 422;
        return next(error);
    }

    if (roleIdx === -1) {
        const error = new Error('Unvalid Role');
        error.statusCode = 401;
        return next(error);
    }

    if (shiftRegistered.length === 0) {
        const error = new Error("shift registered must not be empty");
        error.statusCode = 422;
        return next(error);
    }

    if (userIds.length === 0) {
        const error = new Error("userIds must not be empty");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const office = await Office.findById(officeId);
        if (!office) {
            const error = new Error('Invalid OfficeId');
            error.statusCode = 404;
            throw error;
        }
        const validShiftIds = office.shifts.map(shift => shift.shiftId);
        for (shift of shiftRegistered) {
            const idx = validShiftIds.findIndex(vShiftId => vShiftId.toString() === shift.shiftedId.toString());
            if (idx === -1) {
                const error = new Error('Invalid ShiftId');
                error.statusCode = 422;
                throw error;
            }
        }
        const result = await User.assignShiftByIds(userIds, { shifts: [...shiftRegistered] });
        res.status(202).json({ message: "Assign Shifts Success" });
    } catch (error) {
        next(error);
    }
};

module.exports.getInfo = async (req, res, next) => {
    const userId = get(req.params, 'userId');
    const companyId = req.companyId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('UserID is not valid');
            error.statusCode = 404;
            throw error;
        }
        if (get(user, 'companyId').toString() !== companyId.toString()) {
            const error = new Error('Invalid companyId');
            error.statusCode = 401;
            throw error;
        }

        res.status(200).json({ message: "get user info success", user: omit(user, 'password') });
    } catch (error) {
        next(error);
    }
};

module.exports.checkin = async (req, res, next) => {
    const userId = req.userId;
    const companyId = req.companyId;
    const officeId = get(req.body, 'officeId');
    const shiftId = get(req.body, 'shiftId');
    const longitude = Number(get(req.body, 'longitude'));
    const latitude = Number(get(req.body, 'latitude'));

    try {
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('UserID is not valid');
            error.statusCode = 404;
            throw error;
        }
        if (String(officeId) !== String(get(user, 'officeWorkplaceId'))) {
            const error = new Error('Invalid officeId barcode');
            error.statusCode = 422;
            throw error;
        }

        const location = {
            type: "Point",
            coordinates: [longitude, latitude]
        };

        const offices = await Office.findByGeo(location);

        const officeIdx = offices.findIndex(office => String(get(office, '_id')) === String(officeId));

        if (officeIdx === -1) {
            const error = new Error("Invalid location checkin");
            error.statusCode = 422;
            throw error;
        }

        const office = offices[officeIdx];

        const shift = get(office, 'shifts', []).find(oShift => String(oShift.shiftId) === String(shiftId));

        const checkin = {
            dateChecked: moment().format("MM-DD-YYYY hh:mm:ss a"),
            location
        };

        const shifts = get(user, 'shifts');
        const shiftIdx = shifts.findIndex(shiftUser => String(shiftUser.shiftedId) === String(shiftId));
        if (shiftIdx === -1) {
            const error = new Error("ShiftId is not valid");
            error.statusCode = 422;
            throw error;
        }

        let checkout = await TimeCheckin.findOneByUserId(userId);

        if (checkout.length > 0) {
            checkout = checkout[0];
            const timeCheckout = new TimeCheckin(get(checkout, '_id', null));
            let diffMins = moment().diff(moment(get(checkout, 'checkin.dateChecked'), "MM-DD-YYYY hh:mm:ss a"), 'minutes');

            const timeShiftStart = moment(get(shift, 'timeStarted'), 'hh:mm');
            const timeShiftEnd = moment(get(shift, 'timeEnded'), 'hh:mm');

            const shiftLastedMins = timeShiftEnd.diff(timeShiftStart, 'minutes');

            if (diffMins > shiftLastedMins) {
                diffMins = shiftLastedMins;
            }

            const duration = moment.utc().startOf('day').add(diffMins, 'minutes').format('H:mm');

            await timeCheckout.punchOut(checkin, duration);

            const timeCheckin = await TimeCheckin.findOneById(get(checkout, '_id'));
            res.status(201).json({ message: "Checkout Success", timeCheckin });
            return;
        }

        const timeCheckin = new TimeCheckin(null, companyId, officeId, userId, checkin, null, null, false, shiftId);
        await timeCheckin.punchIn();

        res.status(201).json({ message: "Checkin success", timeCheckin });
    } catch (error) {
        next(error);
    }
};