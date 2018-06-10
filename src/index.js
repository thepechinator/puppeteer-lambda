const sharp = require('sharp');
const moment = require('moment');

const setup = require('./starter-kit/setup');
const {uploadToS3} = require('./starter-kit/uploader');
const imageDiff = require('./starter-kit/image-diff');


// exports.handler = async (event, context, callback) => {
//   // for calls hitting the api gateway
//   const { id, clientInvokeTime } = JSON.parse(event.body);
//   // for direct lambda calls
//   // const { id, clientInvokeTime } = event.data;
//   const result = {};
//   result.invokeTime = moment().format('MM/DD/YYYY HH:mm:ss');
//   console.info('got id and clientInvokeTime', id, clientInvokeTime);
//   console.info('invoked at', result.invokeTime);
//   setTimeout(() => {
//     result.returnTime = moment().format('MM/DD/YYYY HH:mm:ss');

//     console.info('returning', result);
//     callback(null, {
//       statusCode: 200,
//       body: JSON.stringify({status: 200, result})})
//   }, 0);
// };

exports.handler = async (event, context, callback) => {
  const body = JSON.parse(event.body);

  // For keeping the browser launched
  // https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();

  if (body.keepAliveRequest) {
    const timeout = body.timeout || 5000;
    console.info(body.debugId, 'This is a keepAliveRequest to keep the lambda func warm. Doing nothing further. Returning.');
    setTimeout(() => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({status: 200}),
      });
    }, timeout);
  } else {
    const { url, snapshotIdentifier, uploadDirectory, debugId, baselineBase64String, viewport, config }
      = body;
    const startTime = Date.now();
    console.info(debugId, 'received url', url, 'and snapshotIdentifier', snapshotIdentifier);
    console.info(debugId, 'with config', config);

    exports.run(browser,
      {
        url,
        snapshotIdentifier,
        uploadDirectory,
        debugId,
        baselineBase64String,
        viewport,
        startTime,
        // Other config options we may need
        config,
      }).then(
      // On a successful run, we invoke the callback with what data we want to
      // send back
      (result) => callback(null, {
        statusCode: 200,
        body: JSON.stringify({status: 200, result})})
    ).catch(
      (err) => {
        console.info(debugId, 'ran into error');
        console.info(err);
        // Any runtime errors we log as a 500. Other error codes will be handled
        // by the API gateway, outside of this lambda call.
        callback(null,
          {
            statusCode: 500,
            body: JSON.stringify({ statusCode: 500, error: 'Internal Server Error',
            internalError: JSON.stringify({ message: err.message, stack: err.stack }) }),
          });
      }
    );
  }
};

exports.run = async (browser,
  {
    url,
    snapshotIdentifier,
    // all screenshots get placed in the same bucket.
    // this parameter helps us split them up in their own
    // subdirectory per run.
    // An example of a value here is like os.hostname() + '/' + timestamp + '/'
    uploadDirectory,
    // A unique id we pass up from the client
    debugId,
    // Existing baseline image from client (if exists)
    baselineBase64String,
    viewport = { width: 1024, height: 768 },
    // startTime comes from the client for debugging purposes. May not be needed eventually.
    startTime,
    // will contain some stuff we don't need for now,
    // but has some stuff we want
    // This should be a merged config object of the global and a test's settings
    config,
  } = {}) => {
  const { hideSelectors, removeSelectors } = config;

  console.info(debugId, 'opening new page..');
  console.info(debugId, 'browser', browser);
  const page = await browser.newPage();

  // debugging purposes
  if (config.intentionallyCauseError) {
    page.setViewPort1221();
  }
  page.setJavaScriptEnabled = config.jsEnabled;
  // change to the right resolution
  await page.setViewport({width: viewport.width, height: viewport.height});
  // wait for the right event
  // waitUntil: 'networkidle0',
  // waitUntil: 'networkidle2',
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options
  // waitUntil defaults to 'load'
  await page.goto(url, {timeout: config.timeout});
  // console.log((await page.content()).slice(0, 500));
  console.info(debugId, 'Loaded page');

  // Now we need to wait for a certain element so we may hide or remove it.

  // hide or display none element on page
  // for hiding
  (hideSelectors.length || removeSelectors.length) && await page.evaluate((hideSelectors, removeSelectors) => {
    for (const selector of hideSelectors) {
      // eslint-disable-next-line
      const list = document.querySelectorAll(selector);
      for (const el of list) {
        if (el) {
          el.style.visibility = 'hidden';
        }
      }
    }

    for (const selector of removeSelectors) {
      // eslint-disable-next-line
      const list = document.querySelectorAll(selector);
      for (const el of list) {
        if (el) {
          el.style.display = 'none';
        }
      }
    }
  }, hideSelectors, removeSelectors);
  console.info(debugId, 'Processed hide and remove selectors');
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.goto('https://s3.amazonaws.com/usn-static-atlas-mocks-test-bucket/sand32/1525106539885/mocks/pages/education/higher-education/grad/landing.html');
  // const el = await page.$('.widget-bleed');
  // hide element
  // await page.evaluate(el => el.style.visibility = 'hidden', el);
  // remove element
  // await page.evaluate(el => el.style.display = 'none', el);
  // await page.screenshot({ path: 'example.png', fullPage: true })
  // await browser.close();

  // Long-term goal: Also need a way to target certain selectors (unfortunately, targeting a selector means
  // running 1 x viewport count per selector... so 3 lambda invocations).

  // Take screenshot of specific element.
  //
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.goto('https://s3.amazonaws.com/usn-static-atlas-mocks-test-bucket/sand32/1525106539885/mocks/pages/education/higher-education/grad/landing.html');
  // if outside viewport, element will generate blank screenshot... so we need
  // to increase the viewport height so it is in view:
  // tracked in https://github.com/GoogleChrome/puppeteer/issues/2423
  //
  // await page.setViewport({ width: 800, height: 10000 })
  // const el = await page.$('.widget-bleed');
  // await el.screenshot({ path: 'example.png'  });
  // await browser.close();

  // Long-term goal: if a lambda times out, it 502s... and we don't have a good way to handle that... yet.

  console.info(debugId, 'trying to take a screenshot');
  const tmpPath = `/tmp/${uploadDirectory.replace(/\//g, '_')}${snapshotIdentifier}.jpg`;
  await page.waitFor(config.screenshotDelay);
  await page.screenshot({
    path: tmpPath,
    type: 'jpeg',
    quality: config.screenshotQuality,
    // have to use either clip or fullPage ... they
    // are exclusive of one another
    fullPage: config.fullPage,
    // clip: {
    //   x: 0,
    //   y: 0,
    //   width: viewport.width,
    //   height: config.screenshotMaxHeight,
    // },
  });
  // , fullPage: true});

  // const aws = require('aws-sdk');
  // const s3 = new aws.S3({apiVersion: '2006-03-01'});
  // const fs = require('fs');

  let screenshot = null;
  let contentType = 'image/jpg';
  const { screenshotContentType } = config;

  if (screenshotContentType === 'webp') {
    contentType = 'image/webp';
    screenshot = await sharp(tmpPath)
      // need to figure out how to crop and resize a second time
      // screenshotMaxHeight
      // .crop()
      // try resizing it to save space
      .resize(Math.floor(viewport.width * config.screenshotResizePercent), null)
      .webp()
      .toBuffer();

  } else {
    screenshot = await sharp(tmpPath)
      // need to figure out how to crop and resize a second time
      // screenshotMaxHeight
      // .crop()
      // try resizing it to save space
      // .resize(Math.floor(viewport.width * config.screenshotResizePercent), null)
      // .webp()
      .toBuffer();
  }

  console.info(debugId, 'trying to upload file..');
  const screenshotPath =
    await uploadToS3(screenshot, contentType, `${uploadDirectory}${snapshotIdentifier}`);

  let resultObject = {
    id: snapshotIdentifier,
    // the same as the identifier
    // actual path resolution will be done by the reporter and importer
    baselineFileName: `${snapshotIdentifier}.${screenshotContentType}`,
    testScreenshotPath: screenshotPath,
    url,
  };

  // also do the diff, if baselineBase64String exists
  // baselineBase64String
  // The existence of this means a baseline exists from the caller.
  if (baselineBase64String) {
    console.info(debugId, 'doing diff');
    const { diffPixelCount, diffRatio, totalPixels, diffBinaryData, pass } = await imageDiff(baselineBase64String, screenshot,
      {
        failureThreshold: config.failureThreshold,
        failureThresholdType: config.failureThresholdType,
      }
    );
    console.info(debugId, 'trying to upload diff to s3');
    let diffPath = '';
    if (!pass) {
      // only upload if the test didn't pass
      diffPath = await uploadToS3(diffBinaryData,
        'image/png', `${snapshotIdentifier}--diff`,
      );

      resultObject.diffDetails = {
        ratio: diffRatio,
        totalPixels,
        path: diffPath,
        mismatchedPixels: diffPixelCount,
      };
    }

    // resultObject.diffRatio = diffRatio;
    // resultObject.totalPixels = totalPixels;
    // resultObject.diffPath = diffPath;
    // resultObject.diffPixelCount = diffPixelCount;

    // may not be needed
    resultObject.performedDiff = true;
    // simple boolean flag that tells us whether the test failed or passed
    resultObject.pass = pass;
    resultObject.status = pass ? 'passed' : 'failed';
  } else {
    // for cases where we are not auto-adding the baseline image to
    // some destination, we need a way for the reporter to know to add this
    // new baseline when the bless command is run
    if (config.autoAddNewBaselines) {
      console.info(debugId, 'adding new baseline to imageData');
      // try not passing this back to see if this makes things faster
      resultObject.imageData = {
        newBaselineBase64String: screenshot,
      };
      resultObject.baselineAutoAdded = true;
    }

    // Maybe we can use this to indicate to the reporter this baseline needs
    // to be added.
    resultObject.newBaseline = true;
    resultObject.performedDiff = false;
  }
  resultObject.returnTime = moment().format('MM/DD/YYYY HH:mm:ss');
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
  // How long the test took to execute (in milliseconds)
  resultObject.executionTime =  Date.now() - startTime;
  return resultObject;
};
