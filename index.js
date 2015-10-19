var s3scan = require('s3scan');
var zlib = require('zlib');
var stream = require('stream');

module.exports = {};
module.exports.LogStream = LogStream;
module.exports.ScanGunzip = ScanGunzip;

function LogStream(uri, options) {
    options = options || {};

    var s3scanOpts = { agent: options.agent };
    var scanGunzip = ScanGunzip();
    var scan = s3scan.Scan(uri, s3scanOpts)
        .on('error', function(err) {
            scanGunzip.emit('error', err);
        });
    scan.pipe(scanGunzip);
    return scanGunzip;
}

function ScanGunzip() {
    var scanGunzip = new stream.Transform({ objectMode: true });
    scanGunzip._transform = function(data, enc, callback) {
        zlib.gunzip(data.Body, function(err, body) {
            if (err) return callback(err);
            scanGunzip.push(body.toString('utf8'));
            callback();
        });
    };
    return scanGunzip;
}

