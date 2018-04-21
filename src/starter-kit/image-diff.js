// const fs = require('fs');
// const path = require('path');
// const childProcess = require('child_process');
// const rimraf = require('rimraf');
const pixelmatch = require('pixelmatch');
// const mkdirp = require('mkdirp');
const sharp = require('sharp');

// both of these should be base64 strings for now
module.exports = async (baselineImageData, testImageData) => {
    const baselineBinaryData = Buffer.from(baselineImageData, 'base64');
    const testBinaryData = Buffer.from(testImageData, 'base64');

    // hacky way to get width and height
    let { width, height } = await sharp(baselineBinaryData)
        .metadata();

    // bump it up by 2 on each side b/c we need to add the alpha layer
    // so the diff appears correct
    width += 2;
    height += 2;

    const baselineBuffer = await sharp(baselineBinaryData)
        .background({ r: 0, g: 0, b: 0, alpha: 0 })
        // lastly, we need to extend the boundaries of the image so
        // the alpha channel actually gets applied. w/o doing this,
        // the alpha channel won't exist on the image, and make
        // the resulting diff look funky b/c of the absence
        // of that channel.
        // another way to get around this is do our own diff
        // in the frontend or just set the channels property
        // of the diff image to 3
        .extend({ top: 1, bottom: 1, left: 1, right: 1 })

        .raw()
        .toBuffer();

    const testBuffer = await sharp(testBinaryData)
        .background({ r: 0, g: 0, b: 0, alpha: 0 })
        // lastly, we need to extend the boundaries of the image so
        // the alpha channel actually gets applied. w/o doing this,
        // the alpha channel won't exist on the image, and make
        // the resulting diff look funky b/c of the absence
        // of that channel.
        // another way to get around this is do our own diff
        // in the frontend or just set the channels property
        // of the diff image to 3
        .extend({ top: 1, bottom: 1, left: 1, right: 1 })

        .raw()
        .toBuffer();

    // what we are using to use to store our diff info into
    const diffBuffer = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .raw()
        .toBuffer();

    const diffPixelCount = pixelmatch(baselineBuffer, testBuffer, diffBuffer, width, height, { threshold: 0.1 });

    // The diff should be stored somewhere. Convert to base64 string for upload to s3
    const diffBinaryData = await sharp(diffBuffer, { raw: { width, height, channels: 4 } })
      .toBuffer()
    const diffBase64String = Buffer.from(diffBinaryData, 'binary').toString('base64');

    return {
        diffPixelCount,
        diffBase64String,
    };
};
