const moment = require('moment');

exports.handler = async (event, context, callback) => {
    const data = JSON.parse(event.body);
    const returnTime = moment().format('MM/DD/YYYY HH:mm:ss');
    console.info('calling lambda function with', data);
    return { status: 200, data: { returnTime } };
};
