var fs = require('fs');
var S3 = new (require('aws-sdk')).S3();
var queue = require('queue-async');
var reader = require('../index.js');
var tape = require('tape');
var split = require('split');

tape('setup', function(assert) {
    var q = queue();
    q.defer(upload, 'AAAAAAAAAAAAAA.2015-10-19-17.e5b6526a.gz');
    q.defer(upload, 'AAAAAAAAAAAAAA.2015-10-19-17.e5b6526b.gz');
    q.defer(upload, 'AAAAAAAAAAAAAA.2015-10-19-17.e5b6526c.gz');
    q.awaitAll(assert.end);
    function upload(file, done) {
        S3.putObject({
            Bucket: 'mapbox',
            Key: 'cloudfront-log-reader/testing/' + file,
            Body: fs.readFileSync(__dirname + '/fixtures/' + file)
        }, done);
    }
});

tape('LogStream', function(assert) {
    var logStream = reader.LogStream('s3://mapbox/cloudfront-log-reader/testing/');
    var lines = 0;
    logStream
        .pipe(split())
        .on('data', function(line) {
            if (!line) return;
            if (/d3eju24r2ptc5d\.cloudfront\.net/.test(line)) lines++;
        })
        .on('error', assert.ifError)
        .on('end', function() {
            assert.equal(lines, 27, 'emits 27 lines');
            assert.end();
        });
});

