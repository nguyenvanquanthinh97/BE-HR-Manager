const fetch = require('node-fetch');

const timezoneUrl = "http://api.timezonedb.com/v2.1/get-time-zone";
module.exports.getTimeZones = async (latitude, longtitude) => {
        const response = await fetch(`${timezoneUrl}?key=${process.env.API_TIMEZONEDB}&format=json&by=position&lat=${latitude}&lng=${longtitude}`);
        const data = response.json();
        return data;
};

module.exports.transformMinutesToHHmmFormat = (minutes) => {
        const hour = parseInt(minutes / 60);
        const minute = parseInt(minutes) % parseInt(60);
        return `${hour}:${minute}`;
};

module.exports.transformHHmmFormatToMinutes = (time) => {
        const hour = parseInt(time.split(':')[0]);
        const minute = parseInt(time.split(':')[1]);

        return hour * 60 + minute;
};