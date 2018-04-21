const setup = require('./starter-kit/setup');
const {uploadToS3} = require('./starter-kit/uploader');
const imageDiff = require('./starter-kit/image-diff');

exports.handler = async (event, context, callback) => {
  const { url, snapshotIdentifier, debugId, baselineBase64String } = JSON.parse(event.body);
  console.info(debugId, 'received', url, snapshotIdentifier);
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  exports.run(browser, { url, snapshotIdentifier, debugId, baselineBase64String }).then(
    (result) => callback(null, {
      statusCode: 200,
      body: JSON.stringify({status: 200, result})})
  ).catch(
    (err) => {
      console.info(debugId, 'ran into error');
      console.info(err);
      callback(err);
    }
  );
};

exports.run = async (browser, { url, snapshotIdentifier, debugId, baselineBase64String }) => {
  // implement here
  // this is sample
  console.info(debugId, 'opening new page..');
  console.info(debugId, 'browser', browser);
  const page = await browser.newPage();
  await page.setViewport({width: 1024, height: 768});
  console.info(debugId, 'trying to go to page...');
  await page.goto(url, {waitUntil: 'networkidle0', timeout: 10000});
  // console.log((await page.content()).slice(0, 500));
  console.info(debugId, 'past page load..');
  // await page.type('#lst-ib', 'aaaaa');
  // // avoid to timeout waitForNavigation() after click()
  // await Promise.all([
  //   // avoid to
  //   // 'Cannot find context with specified id undefined' for localStorage
  //   page.waitForNavigation(),
  //   page.click('[name=btnK]'),
  // ]);
  console.info(debugId, 'trying to take a screenshot');
  await page.screenshot({
    path: '/tmp/screenshot.jpeg', type: 'jpeg', quality: 50});
  // , fullPage: true});

  // const aws = require('aws-sdk');
  // const s3 = new aws.S3({apiVersion: '2006-03-01'});
  console.info(debugId, 'trying to read from the screenshot file');
  const fs = require('fs');
  const screenshot = await new Promise((resolve, reject) => {
    fs.readFile('/tmp/screenshot.jpeg', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
  console.info(debugId, 'trying to upload file..');
  const screenshotPath =
    await uploadToS3(screenshot, 'image/jpeg', snapshotIdentifier);

  console.info(debugId, 'trying to do diff');
  // also do the diff
  const { diffPixelCount, diffBase64String } = await imageDiff(baselineBase64String, screenshot);
  console.info(debugId, 'trying to upload diff to s3');
  const diffPath = await uploadToS3(diffBase64String, 'image/png', `${snapshotIdentifier}_diff`);
  // await s3.putObject({
  //   Bucket: process,
  //   Key: 'screenshot.png',
  //   ContentType: 'image/png',
  //   ACL: 'public-read',
  //   Body: screenshot,
  // }).promise();

  // cookie and localStorage
  // await page.setCookie({name: 'name', value: 'cookieValue'});
  // console.log(await page.cookies());
  // console.log(await page.evaluate(() => {
  //   localStorage.setItem('name', 'localStorageValue');
  //   return localStorage.getItem('name');
  // }));
  console.info(debugId, 'closing page');
  await page.close();
  console.info(debugId, 'returning data');
  return { screenshotPath, diffPath, diffPixelCount };
};
