const { get } = require('lodash');
const Joi = require('@hapi/joi');

const { ROLE } = require('../constant');
const User = require('../model/user');
const Office = require('../model/office-workplace');

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
            console.log(idx);
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