const gm = require('gm').subClass({ imageMagick: true });

const fetchS3 = function(srcBucket, srcKey, s3, callback) {
  return s3.getObject({Bucket: srcBucket, Key: srcKey}, callback);
};

const convert = function(data, callback) {
  return gm(data).autoOrient().strip().interlace('Line').toBuffer('jpg', callback);
};

const findBytes = function(data, startIndex) {
  var initialByte;
  var secondByte;

  do {
    initialByte = data.indexOf(0xFF, startIndex);
    secondByte = data.indexOf(0xDA, initialByte);
    startIndex++;
  } while (initialByte + 1 != secondByte && startIndex < data.length);

  return initialByte;
};

const parse = function(data, callback) {
  const meta = {};
  var sosBytes = 0;
  meta.contentLength = data.length;
  meta.sos = [];
  do {
    sosBytes = findBytes(data, sosBytes);
    if (sosBytes !== -1) {
      meta.sos.push(sosBytes);
      sosBytes += 2;
    }
  } while (sosBytes !== -1);

  gm(data).size(function(err, size) {
    if (err) {
      return callback(err, null);
    }
    meta.width = size.width;
    meta.height = size.height;

    return callback(null, meta);
  });
};

const putS3 = function(data, s3, targetBucket, targetKey, callback) {
  parse(data, function(err, parseData) {
    if (err) {
      return callback(err, parseData);
    }

    const params = {
      Bucket: targetBucket,
      Key: targetKey,
      Body: data,
      ContentType: 'image/jpeg',
      ContentLength: data.length,
      ACL: 'public-read',
      Metadata: {
        alchemist: JSON.stringify(parseData)
      }
    };

    const s3Request = s3.putObject(params);
    s3Request.on('build', function() {
      s3Request.httpRequest.headers['X-Alchemist-Meta-Json'] = JSON.stringify(parseData);
    });
    s3Request.send(function(err, data) {
      if (err) {
        return callback(err, null);
      }
      return callback(null, true);
    });
  });
};

exports = module.exports = {
  fetchS3: fetchS3,
  convert: convert,
  parse: parse,
  putS3: putS3
};
