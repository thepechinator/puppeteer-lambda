const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01'});
// const uuidv4 = require('uuid/v4');

function getS3BucketName() {
  return process.env['CHROME_S3_BUCKET_NAME']
}

function getS3BucketUrl() {
  return process.env['CHROME_S3_BUCKET_URL']
}

function getS3ObjectKeyPrefix() {
  return process.env['CHROME_S3_OBJECT_KEY_PREFIX'] || ''
}

function getS3FilesPermissions() {
  return process.env['CHROME_S3_OBJECT_ACL'] || 'public-read'
}

// const isS3Configured = () => {
//   return getS3BucketName() && getS3BucketUrl();
// }

const s3ContentTypes = {
  'image/png': {
    extension: 'png',
  },
  'image/jpg': {
    extension: 'jpg',
  },
  'image/jpeg': {
    extension: 'jpeg',
  },
  'application/pdf': {
    extension: 'pdf',
  },
};

const uploadToS3 = async (
  data,
  contentType,
  snapshotIdentifier,
) => {
  console.info('upload the damn thing to s3!');
  const s3ContentType = s3ContentTypes[contentType];
  if (!s3ContentType) {
    throw new Error(`Unknown S3 Content type ${contentType}`);
  }
  const s3Path = `${getS3ObjectKeyPrefix()}${snapshotIdentifier}.${s3ContentType.extension}`
  await s3
    .putObject({
      Bucket: getS3BucketName(),
      Key: s3Path,
      ContentType: contentType,
      ACL: getS3FilesPermissions(),
      Body: Buffer.from(data, 'base64'),
    })
    .promise();

  return `https://${getS3BucketUrl()}/${s3Path}`;
};

module.exports = {
  uploadToS3,
};
