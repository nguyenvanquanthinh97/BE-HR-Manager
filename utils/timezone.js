const fetch = require('node-fetch');

const timezoneUrl = "http://api.timezonedb.com/v2.1/get-time-zone";
module.exports.getTimeZones = async (latitude, longtitude) => {
        const response = await fetch(`${timezoneUrl}?key=${process.env.API_TIMEZONEDB}&format=json&by=position&lat=${latitude}&lng=${longtitude}`);
        const data = response.json();
        return data;
};