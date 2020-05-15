const Path = require('path');

const { get, set, omit } = require('lodash');
const Joi = require('@hapi/joi');
const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const Datauri = require('datauri/parser');

const { ROLE, WEEKLY_PLANNING_STATUS } = require('../constant');
const User = require('../model/user');
const Office = require('../model/office-workplace');
const Departure = require('../model/departure');
const TimeCheckin = require('../model/time-checkin');
const Project = require('../model/project');
const WeeklyPlanning = require('../model/weekly-planning');
const TimeZone = require('../utils/timezone');
const OffDayPermission = require('../model/off-days');
// const { uploader } = require('../config/cloudinaryConfig');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploader');

module.exports.editInfo = async (req, res, next) => {
    const userId = req.userId;
    const companyId = req.companyId;
    let selectedUserId = get(req.body, 'userId', null);
    const role = req.role;
    const validRoles = [ROLE.administrator, ROLE.hr];

    const username = get(req.body, 'username');
    const updatedOfficeWorkplaceId = get(req.body, 'officeWorkplaceId', '');
    const updatedDepartureId = get(req.body, 'departureId', '');
    const imgData = get(req.body, 'imgData', null);

    if (selectedUserId) {
        if (!validRoles.includes(role)) {
            const error = new Error("Your role is not enough to do this");
            error.statusCode = 422;
            return next(error);
        }
    } else {
        selectedUserId = userId;
    }

    try {
        const user = await User.findById(selectedUserId);

        const img = get(user, 'img', '');
        const officeWorkplaceId = get(user, 'officeWorkplaceId', '');
        const departureId = get(user, 'departureId', '');

        if (String(companyId) !== String(get(user, 'companyId'))) {
            const error = new Error("This user is not in your company");
            error.statusCode = 422;
            throw (error);
        }

        let updatedUser = omit(user, ['_id', 'email', 'role', 'password', 'companyId', 'actived']);

        ////////////test
        if (imgData) {
            // const image = req.file;
            // const datauri = new Datauri();
            // datauri.format(Path.extname(req.file.originalname).toString(), image.buffer);

            const newImgUrl = await uploadToCloudinary(imgData);
            if (img) {
                const urlSplits = img.split('/');
                const fileName = urlSplits[urlSplits.length - 1];
                const publicId = fileName.split('.')[0];
                await deleteFromCloudinary(publicId);
            }

            set(updatedUser, 'img', newImgUrl);
        }

        if (get(updatedUser, 'username') !== username) {
            set(updatedUser, 'username', username);
            await Project.updateMemberUsername(companyId, selectedUserId, username);
            if (departureId !== '') {
                await Departure.updateMemberUsername(departureId, selectedUserId, username);
            }
        }

        if (validRoles.includes(role)) {
            set(updatedUser, 'officeWorkplaceId', updatedOfficeWorkplaceId !== '' ? new ObjectId(updatedOfficeWorkplaceId) : '');
            if (departureId === '' && updatedDepartureId !== '') {
                set(updatedUser, 'departureId', new ObjectId(updatedDepartureId));
                const departure = new Departure(updatedOfficeWorkplaceId, null, null, null, null, departureId);
                await departure.addMember(selectedUserId, username);
            }
            if (String(updatedDepartureId) !== String(departureId) && departureId !== '') {
                await Departure.removeMember(departureId, selectedUserId);
                const updatedDeparture = new Departure(null, null, null, null, null, updatedDepartureId);
                await updatedDeparture.addMember(selectedUserId, username);
            }
        }

        await User.updateUserInfo(selectedUserId, updatedUser);
        res.status(200).json({ message: 'updated success', updatedUser });

    } catch (error) {
        next(error);
    }
};

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
        const officeWorkplaceId = get(user, "officeWorkplaceId");
        const departureId = get(user, "departureId");

        let office, departure;
        if (officeWorkplaceId && departureId) {
            office = await Office.findById(officeWorkplaceId);
            departure = await Departure.findById(departureId);

            set(user, 'officeName', get(office, 'name'));
            set(user, 'departureName', get(departure, 'name'));
        }
        const projects = await Project.findByMemberId(userId);

        set(user, 'projectJoin', projects);

        res.status(200).json({ message: "get user info success", user: omit(user, 'password'), office });
    } catch (error) {
        next(error);
    }
};

module.exports.checkin = async (req, res, next) => {
    const userId = req.userId;
    const companyId = req.companyId;
    const username = req.username;
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
        if (offices.length === 0) {
            const error = new Error("Invalid location checkin");
            error.statusCode = 422;
            throw error;
        }

        const officeIdx = offices.findIndex(office => String(get(office, '_id')) === String(officeId));

        if (officeIdx === -1) {
            const error = new Error("Invalid location checkin");
            error.statusCode = 422;
            throw error;
        }

        const office = offices[officeIdx];

        let zoneName = get(office, 'zoneName', null);

        if (!zoneName) {
            const timezone = await TimeZone.getTimeZones(latitude, longitude);

            zoneName = get(timezone, 'zoneName');
        }

        const shift = get(office, 'shifts', []).find(oShift => String(oShift.shiftId) === String(shiftId));

        const checkin = {
            dateChecked: moment().tz(zoneName).format("MM-DD-YYYY hh:mm:ss a"),
            location
        };

        const shifts = get(user, 'shifts');
        const shiftIdx = shifts.findIndex(shiftUser => String(shiftUser.shiftedId) === String(shiftId));
        if (shiftIdx === -1) {
            const error = new Error("ShiftId is not valid");
            error.statusCode = 422;
            throw error;
        }

        const timeShiftStart = moment(get(shift, 'timeStarted'), 'HH:mm');
        const timeShiftEnd = moment(get(shift, 'timeEnded'), 'HH:mm');

        let checkout = await TimeCheckin.findOneByUserId(userId);

        const checkinHHmm = moment(checkin.dateChecked, "MM-DD-YYYY hh:mm:ss a").format('HH:mm');
        const momentCheckinHHmm = moment(checkinHHmm, 'HH:mm');

        if (checkout.length > 0) {
            checkout = checkout[0];
            const timeCheckout = new TimeCheckin(get(checkout, '_id', null));

            let diffMins = momentCheckinHHmm.diff(timeShiftStart, 'minutes');
            //let diffMins = moment().diff(moment(get(checkout, 'checkin.dateChecked'), "MM-DD-YYYY hh:mm:ss a"), 'minutes');

            diffMins = diffMins - get(checkout, 'lateDuration', '0');
            const shiftLastedMins = timeShiftEnd.diff(timeShiftStart, 'minutes');

            if (diffMins > shiftLastedMins) {
                diffMins = shiftLastedMins;
            }

            const duration = diffMins;

            await timeCheckout.punchOut(checkin, duration, zoneName);

            const timeCheckin = await TimeCheckin.findOneById(get(checkout, '_id'));

            res.status(201).json({ message: "Checkout Success", timeCheckin });
            return;
        }

        let lateDuration = 0;
        if (momentCheckinHHmm.isAfter(timeShiftStart)) {
            lateDuration = momentCheckinHHmm.diff(timeShiftStart, 'minutes');
        }

        const timeCheckin = new TimeCheckin(null, companyId, officeId, get(office, 'name'), userId, username, checkin, null, null, lateDuration, false, shiftId, get(shift, 'name'), zoneName);
        await timeCheckin.punchIn();

        res.status(201).json({ message: "Checkin success", timeCheckin });
    } catch (error) {
        next(error);
    }
};

module.exports.createWeeklyPlanning = async (req, res, next) => {
    const userId = req.userId;

    const title = get(req.body, 'title');
    const status = get(req.body, 'status', '').toUpperCase();
    const dueDate = get(req.body, 'dueDate');
    const objectiveIds = get(req.body, 'objectiveIds', []);
    const quarterObjectiveId = get(req.body, 'quarterObjectiveId');

    const schema = Joi.object().keys({
        title: Joi.string().required(),
        status: Joi.string().uppercase().valid(WEEKLY_PLANNING_STATUS.planning, WEEKLY_PLANNING_STATUS.done, WEEKLY_PLANNING_STATUS.problems),
        dueDate: Joi.string().optional().allow(null, ''),
        objectiveIds: Joi.array().optional(),
        quarterObjectiveId: Joi.string().required()
    });

    const { error } = schema.validate({ title, status, dueDate, objectiveIds, quarterObjectiveId });

    if (error) {
        const err = new Error(error);
        err.statusCode = 422;
        return next(err);
    }

    try {
        const weeklyPlanning = new WeeklyPlanning(null, userId, title, status, dueDate, objectiveIds, quarterObjectiveId);
        const weeklyPlanningInserted = await weeklyPlanning.save();

        set(weeklyPlanning, '_id', get(weeklyPlanningInserted, 'insertedId'));

        res.status(201).json({ message: "create Planning Success", weeklyPlanning });
    } catch (error) {
        next(error);
    }
};

module.exports.updateWeeklyPlanning = async (req, res, next) => {
    const userId = req.userId;
    const weeklyPlanningId = get(req.body, 'weeklyPlanningId');

    const title = get(req.body, 'title');
    const status = get(req.body, 'status', '').toUpperCase();
    const dueDate = get(req.body, 'dueDate');
    let objectiveIds = get(req.body, 'objectiveIds', []);
    const quarterObjectiveId = get(req.body, 'quarterObjectiveId');

    const schema = Joi.object().keys({
        weeklyPlanningId: Joi.string().required(),
        title: Joi.string().required(),
        status: Joi.string().uppercase().valid(WEEKLY_PLANNING_STATUS.planning, WEEKLY_PLANNING_STATUS.done, WEEKLY_PLANNING_STATUS.problems),
        dueDate: Joi.string().optional().allow(null, ''),
        objectiveIds: Joi.array().optional(),
        quarterObjectiveId: Joi.string().required()
    });

    const { error } = schema.validate({ weeklyPlanningId, title, status, dueDate, objectiveIds, quarterObjectiveId });

    if (error) {
        const err = new Error(error);
        err.statusCode = 422;
        return next(err);
    }

    try {
        const weeklyPlanning = await WeeklyPlanning.findById(weeklyPlanningId);

        if (!weeklyPlanning) {
            const error = new Error("Weekly Planning is not existed");
            error.statusCode = 422;
            throw error;
        }

        if (String(get(weeklyPlanning, 'userId', '')) !== String(userId)) {
            const error = new Error("This is not your Weekly Planning");
            error.statusCode = 422;
            throw error;
        }

        const updatedWeeklyPlanning = new WeeklyPlanning(weeklyPlanningId);

        if (objectiveIds.length > 0) {
            objectiveObjectIds = objectiveIds.map(objectiveId => new ObjectId(objectiveId));
        }

        const updatedWeeklyPlanningData = {
            title,
            status,
            dueDate,
            objectiveIds,
            quarterObjectiveId: new ObjectId(quarterObjectiveId)
        };

        await updatedWeeklyPlanning.updateOne(updatedWeeklyPlanningData);

        res.status(201).json({ message: "update Planning Success", updatedWeeklyPlanningData });
    } catch (error) {
        next(error);
    }
};

module.exports.deleteWeeklyPlanning = async (req, res, next) => {
    const userId = req.userId;
    const weeklyPlanningId = get(req.body, 'weeklyPlanningId');

    try {
        const weeklyPlanning = await WeeklyPlanning.findById(weeklyPlanningId);
        if (!weeklyPlanning) {
            const error = new Error("Weekly Planning is not existed");
            error.statusCode = 422;
            throw error;
        }

        if (String(get(weeklyPlanning, 'userId', '')) !== String(userId)) {
            const error = new Error("This is not your Weekly Planning");
            error.statusCode = 422;
            throw error;
        }

        await WeeklyPlanning.deleteById(weeklyPlanningId);
        res.status(200).json({ message: "delete success" });
    } catch (error) {
        next(error);
    }
};

module.exports.getWeeklyPlannings = async (req, res, next) => {
    const companyId = req.companyId;
    const quarterObjectiveId = get(req.query, 'quarterObjectiveId');
    const selectedUserId = get(req.query, 'selectedUserId');

    const schema = Joi.object().keys({
        quarterObjectiveId: Joi.string().required(),
        selectedUserId: Joi.string().required()
    });

    const { error } = schema.validate({ quarterObjectiveId, selectedUserId });

    if (error) {
        const err = new Error(error);
        err.statusCode = 422;
        return next(err);
    }

    try {
        const selectedUser = await User.findById(selectedUserId);

        if (String(get(selectedUser, 'companyId', '')) !== String(companyId)) {
            const error = new Error("You are not in the same company with the user Selected");
            error.statusCode = 422;
            throw error;
        }

        const weeklyPlanning = await WeeklyPlanning.findByUserIdAndQuarterObjectiveId(selectedUserId, quarterObjectiveId);
        res.status(200).json({ message: "Get Weekly Planning Success", weeklyPlanning });

    } catch (error) {
        next(error);
    }
};

module.exports.getCheckins = async (req, res, next) => {
    const userId = req.userId;
    const page = parseInt(get(req.query, 'page', 1));

    try {
        const checkins = await TimeCheckin.findByUserId(userId, page);

        res.status(200).json({ message: 'Get Self Checkins Success', checkins });
    } catch (error) {
        next(error);
    }
};

module.exports.getUserCheckins = async (req, res, next) => {
    const role = req.role;
    const page = parseInt(get(req.query, 'page', 1));
    const userId = get(req.params, 'userId');

    const validRoles = [ROLE.hr, ROLE.administrator];

    if (!validRoles.includes(role)) {
        const error = new Error("Authorization is not enough to do this");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const checkins = await TimeCheckin.findByUserId(userId, page);

        res.status(200).json({ message: 'Get Self Checkins Success', checkins });
    } catch (error) {
        next(error);
    }
};

module.exports.createOffDayPermission = async (req, res, next) => {
    const userId = req.userId;
    const companyId = req.companyId;
    const fromDate = get(req.body, 'fromDate');
    const toDate = get(req.body, 'toDate');
    const duration = get(req.body, 'duration');
    const reason = get(req.body, 'reason', '');
    const description = get(req.body, 'description');

    const isFromDateValid = moment(fromDate, 'DD-MM-YYYY', true).isValid();
    const isToDateValid = moment(toDate, 'DD-MM-YYYY', true).isValid();

    if (!isFromDateValid || !isToDateValid) {
        const error = new Error("Wrong fromDate or toDate format (DD-MM-YYYY)");
        error.statusCode = 422;
        return next(error);
    }

    const schema = Joi.object().keys({
        duration: Joi.string().required(),
        reason: Joi.string().required(),
        description: Joi.string().required()
    });

    const { error } = schema.validate({ duration, reason, description });

    if (error) {
        const err = new Error(error);
        err.statusCode = 422;
        return next(err);
    }

    try {
        const offDayPermission = new OffDayPermission(null, companyId, userId, fromDate, toDate, duration, reason, description);
        const insertedOffDayPermission = await offDayPermission.save();

        set(offDayPermission, '_id', get(insertedOffDayPermission, 'insertedId'));
        res.status(201).json({ message: "create off day permission success", offDayPermission });
    } catch (error) {
        next(error);
    }
};

module.exports.getOffDayPermissionDetail = async (req, res, next) => {
    const idOffDayPermission = get(req.params, 'idOffDayPermission');

    try {
        const offDayPermissionDetail = await OffDayPermission.findById(idOffDayPermission);

        if (offDayPermissionDetail.length === 0) {
            const error = new Error("Cannot find off day permission you want to find");
            error.statusCode = 422;
            throw error;
        }

        res.status(200).json({ message: 'get off day permission detail success', offDayPermissionDetail: offDayPermissionDetail[0] });
    } catch (error) {
        next(error);
    }
};

module.exports.getOffDayPermissionList = async (req, res, next) => {
    const companyId = req.companyId;
    const page = parseInt(get(req.query, 'page', 1));

    try {
        const offDayPermissionList = await OffDayPermission.findAll(companyId, page);

        res.status(200).json({ message: 'get off day permission list success', offDayPermissionList: offDayPermissionList[0] });

    } catch (error) {
        next(error);
    }
};

module.exports.approveOffDayPermission = async (req, res, next) => {
    const userId = req.userId;
    const username = req.username;
    const email = req.email;
    const role = req.role;

    const approvalIds = get(req.body, 'ids', []);
    const validRoles = [ROLE.hr, ROLE.administrator];

    if (!validRoles.includes(role)) {
        const error = new Error("Your auhorization is not enough to do this function");
        error.statusCode = 422;
        return next(error);
    }

    if (approvalIds.length === 0) {
        const error = new Error("At least past an id into [ids]");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const user = await User.findById(userId);
        const acceptingUser = {
            userId: new ObjectId(userId),
            username,
            email,
            img: get(user, 'img')
        };

        await OffDayPermission.approvePermission(approvalIds, acceptingUser);

        res.status(201).json({ message: 'Approval Success', acceptingUser, approvalIds });
    } catch (error) {
        next(error);
    }
};

module.exports.approveOffDayPermissionDeny = async (req, res, next) => {
    const userId = req.userId;
    const username = req.username;
    const email = req.email;
    const role = req.role;

    const deniedReason = get(req.body, 'deniedReason', null);
    const offDayId = get(req.body, 'id', null);
    const validRoles = [ROLE.hr, ROLE.administrator];

    if (!validRoles.includes(role)) {
        const error = new Error("Your auhorization is not enough to do this function");
        error.statusCode = 422;
        return next(error);
    }

    if (!offDayId) {
        const error = new Error("id is empty");
        error.statusCode = 422;
        return next(error);
    }

    if (!deniedReason) {
        const error = new Error("You must give the reason why not approve this permission");
        error.statusCode = 422;
        return next(error);
    }

    try {
        const user = await User.findById(userId);
        const denyingUser = {
            userId: new ObjectId(userId),
            username,
            email,
            img: get(user, 'img')
        };

        await OffDayPermission.DenyPermission(offDayId, denyingUser, deniedReason);

        res.status(201).json({ message: 'deny success', denyingUser, reason: deniedReason });

    } catch (error) {
        next(error);
    }
};

module.exports.getApproveOffDayPermission = async (req, res, next) => {
    const companyId = req.companyId;
    const isApproval = get(req.query, 'isApproval', true);
    const page = parseInt(get(req.query, 'page', 1));

    try {
        const approvalPermission = await OffDayPermission.findApprovePermission(companyId, page, isApproval);

        res.status(200).json({ message: 'fetch Approval Permission Success', approvalPermission });
    } catch (error) {
        next(error);
    }
};