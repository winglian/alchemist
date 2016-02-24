const fs = require('fs');
const Alchemy = require('./alchemy.js');
const aws = require('aws-sdk');


// strip out the `node {scriptname}` part
const args = process.argv.slice(2);
const path = args[0];
const data = fs.readFileSync(path);
const targetBucket = 'dwell-ugc';
const targetKey = 'photos/' + path.split('/').pop();
const s3 = new aws.S3({region: 'us-west-2', endpoint: 's3-us-west-2.amazonaws.com'});

Alchemy.convert(data, function(err, data) {
  if (err) {
    console.error(err);
    return;
  }
  Alchemy.putS3(data, s3, targetBucket, targetKey, function(err, res) {
    if (err) {
      console.error(err);
    }
  });
});
