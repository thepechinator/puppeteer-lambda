const moment = require('moment');

exports.handler = async (event, context, callback) => {
    // const data = JSON.parse(event.body);

    const returnTime = moment().format('MM/DD/YYYY HH:mm:ss');
    console.info('calling lambda function with', event);
    console.info('and context', context);

    callback(null, {
        statusCode: 200,
        body: JSON.stringify({ status: 200, data: { returnTime } }),
    });
};
