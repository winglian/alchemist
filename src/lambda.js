const aws = require('aws-sdk');
const Alchemy = require('./alchemy.js');

exports.handler = function(event, context) {
  const s3 = new aws.S3({region: 'us-west-2', endpoint: 's3-us-west-2.amazonaws.com'});
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

  // TODO targetBucket
  // TODO targetKey

  Alchemy.fetchS3(srcBucket, srcKey, s3, function(err, data) {
    if (err) {
      return context.fail(err);
    }
    Alchemy.convert(data.Body, function(err, data) {
      if (err) {
        return context.fail(err);
      }
      Alchemy.putS3(data, s3, targetBucket, targetKey, function(err, ret) {
        if (err) {
          return context.fail(err);
        }

      });
    });
  });
};