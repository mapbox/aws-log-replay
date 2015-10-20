var request = require('requestretry');
var s3scan = require('s3scan');
var split = require('split');
var zlib = require('zlib');
var url = require('url');
var stream = require('stream');
var queue = require('queue-async');

module.exports = {};
module.exports.LogStream = LogStream;
module.exports.ScanGunzip = ScanGunzip;
module.exports.RequestStream = RequestStream;
module.exports.getPath = getPath;

function LogStream(uri, options) {
    options = options || {};

    var s3scanOpts = { agent: options.agent };
    var scanGunzip = ScanGunzip();
    var scan = s3scan.Scan(uri, s3scanOpts)
        .on('error', function(err) {
            scanGunzip.emit('error', err);
        });
    scan.pipe(scanGunzip).pipe(split());
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

function RequestStream(options) {
    options = options || {};
    if (!options.baseurl) throw new Error('options.baseurl should be an http:// or https:// baseurl for replay requests');

    var starttime = Date.now();
    var requestStream = new stream.Transform(options);
    requestStream._readableState.objectMode = true;
    requestStream.got = 0;
    requestStream.pending = 0;
    requestStream.queue = queue();
    requestStream.queue.awaitAll(function(err) {
        if (err) requestStream.emit('error', err);
    });

    requestStream._transform = function(line, enc, callback) {
        if (typeof line !== 'string') line = line.toString('utf8');

        var pathname = getPath(line);

        if (!pathname) return callback();

        var uri = url.parse(pathname, true);

        if (requestStream.pending > 1000) {
            return setImmediate(requestStream._transform.bind(requestStream), line, enc, callback);
        }

        requestStream.pending++;
        requestStream.queue.defer(function(next) {
            request({
                agent: options.agent,
                encoding: null,
                uri: options.baseurl + url.format(uri),
            }, function(err, res, body) {
                requestStream.pending--;
                if (err) return requestStream.emit('error');
                if (res.statusCode !== 200) return next();
                requestStream.push({ Body: body });
                requestStream.got++;
                next();
            });
        });
        callback();
    };

    requestStream._flush = function(callback) {
        requestStream.queue.awaitAll(callback);
    };

    return requestStream;
}

function getPath(line) {
    var parts = line.split(/\s+/g);
    if (parts.length > 7) {
        if (parts[11] !== "-") {
            return parts[7] + "?" + parts[11];
        } else {
            return parts[7];
        }
    }
}

