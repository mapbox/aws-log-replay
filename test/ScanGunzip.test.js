var fs = require('fs');
var reader = require('../index.js');
var tape = require('tape');

tape('ScanGunzip', function(assert) {
    var scanGunzip = reader.ScanGunzip();
    scanGunzip.on('data', function(data) {
        assert.equal(typeof data, 'string');
        assert.equal(/d3eju24r2ptc5d\.cloudfront\.net/.test(data), true, 'has CF log lines');
    });
    scanGunzip.on('error', function() {
        assert.ifError();
    });
    scanGunzip.on('end', function() {
        assert.end();
    });
    scanGunzip.write({
        Body: fs.readFileSync(__dirname + '/fixtures/AAAAAAAAAAAAAA.2015-10-19-17.e5b6526a.gz')
    });
    scanGunzip.write({
        Body: fs.readFileSync(__dirname + '/fixtures/AAAAAAAAAAAAAA.2015-10-19-17.e5b6526b.gz')
    });
    scanGunzip.write({
        Body: fs.readFileSync(__dirname + '/fixtures/AAAAAAAAAAAAAA.2015-10-19-17.e5b6526c.gz')
    });
    scanGunzip.end();
});

