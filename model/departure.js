const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

module.exports = class Departure {
	constructor(officeId, name, members, leader, isAnotherDeparture, id) {
		this._id = id ? new ObjectId(id) : null;
		this.officeId = new ObjectId(officeId);
		this.name = name;
		this.members = members || [];
		// this.leader = leader;
		this.isAnotherDeparture = isAnotherDeparture ? new ObjectId(isAnotherDeparture) : null;
	}

	save() {
		const db = getDB();

		return db.collection('departures').insertOne(this);
	}

	addMember(memberId, username) {
		const db = getDB();

		const member = {
			userId: new ObjectId(memberId),
			username
		};

		return db.collection('departures').updateOne({ _id: this._id }, { $push: { members: member } });
	}

	static addMembers(members) {
		const db = getDB();

		const departuresObj = {};
		let tmp;
		members.forEach((member) => {
			tmp = member.departureId;
			if (!departuresObj[tmp]) {
				departuresObj[tmp] = [];
			}
			departuresObj[tmp].push({ _id: new ObjectId(member._id), username: member.username });
		});

		const promises = [];
		for (let departId in departuresObj) {
			promises.push(
				db.collection('departures').updateMany(
					{ _id: new ObjectId(departId) },
					{
						$push: {
							members: {
								$each: departuresObj[departId]
							}
						}
					}
				)
			);
		}

		return promises;
	}

	static findById(departureId) {
		const db = getDB();

		return db.collection('departures').findOne({ _id: new ObjectId(departureId) });
	}

	// static setLeader(departureId, leaderId, leaderUsername) {
	//     const db = getDB();

	//     const leader = {
	//         userId: new ObjectId(leaderId),
	//         username: leaderUsername
	//     };

	//     return db.collection('departures')
	//         .updateOne({ _id: this._id }, { $set: { leader: leader } });
	// }

	static findByOfficeId(officeId) {
		const db = getDB();

		return db.collection('departures').find({ officeId: new ObjectId(officeId) }).toArray();
	}

	static findDeparturesInCompanyByOfficeIds(officeIds) {
		const db = getDB();

		const ids = officeIds.map((officeId) => new ObjectId(officeId));

		return db.collection('departures').find({ officeId: { $in: ids } }).toArray();
	}

	static countDeparturesInCompanyByOfficeIds(officeIds) {
		const db = getDB();

		const ids = officeIds.map((officeId) => new ObjectId(officeId));

		return db.collection('departures').find({ officeId: { $in: ids } }).count();
	}

	static updateMemberUsername(id, userId, username) {
		const db = getDB();

		return db
			.collection('departures')
			.updateOne(
				{ _id: new ObjectId(id), 'members.userId': new ObjectId(userId) },
				{ $set: { 'members.$.username': username } }
			);
	}

	static removeMember(id, userId) {
		const db = getDB();

		return db
			.collection('departures')
			.updateOne({ id: new ObjectId(id) }, { $pull: { members: { userId: new ObjectId(userId) } } });
	}
};
