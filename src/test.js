const moment = require('moment');

exports.handler = async (event, context, callback) => {
    // const data = JSON.parse(event.body);
    const { debugId, delay } = event.data;

    console.info(debugId, 'calling lambda function with', event);
    console.info(debugId, 'and context', context);

    setTimeout(() => {
        console.info(debugId, 'delay ended. returning');
        const returnTime = moment().format('MM/DD/YYYY HH:mm:ss');
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ status: 200, data: { returnTime } }),
        });
    }, delay);
};
