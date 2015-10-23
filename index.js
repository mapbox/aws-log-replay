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

/**
 * Create a readable line-oriented stream of CF logs.
 * @param {string} uri - An s3 url with prefix to CF logs. Example: 's3://mybucket/cf-logs/'
 * @param {object} options
 * @param {object} options.agent - Optional. An http agent to use when requesting logs
 */
function LogStream(uri, options) {
    options = options || {};

    var s3scanOpts = { agent: options.agent, highWaterMark: 128 };
    var scanGunzip = ScanGunzip();
    var scan = s3scan.Scan(uri, s3scanOpts)
        .on('error', function(err) {
            scanGunzip.emit('error', err);
        });
    scan.pipe(scanGunzip).pipe(split());
    return scanGunzip;
}

/**
 * Transform stream for converting gzipped CF logs from an s3scan Scan stream
 * to line log text.
 */
function ScanGunzip() {
    var scanGunzip = new stream.Transform({ objectMode: true, highWaterMark: 8 });
    scanGunzip._transform = function(data, enc, callback) {
        zlib.gunzip(data.Body, function(err, body) {
            if (err) return callback(err);
            scanGunzip.push(body.toString('utf8'));
            callback();
        });
    };
    return scanGunzip;
}

/**
 * Transform stream for replaying requests from a CF log against a specified
 * host. LH side expects a line-oriented stream of CF log lines.
 * @param {object} options
 * @param {string} options.baseurl - Required. An http or https url prepended to paths when making requests.
 */
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

        var requrl = options.baseurl + url.format(uri);
        requestStream.pending++;
        requestStream.queue.defer(function(next) {
            request({
                agent: options.agent,
                encoding: null,
                uri: requrl
            }, function(err, res, body) {
                requestStream.pending--;
                if (err) return requestStream.emit('error', err);
                if (res.statusCode !== 200) return next();
                requestStream.push({ url: requrl, body: body });
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

/**
 * Convert a CF log line into a path and querystring.
 * @param {string} line
 */
function getPath(line) {
    var parts = line.split(/\s+/g);
    if (parts.length > 7) {
        if (parts[11] && parts[11] !== "-") {
            return parts[7] + "?" + parts[11];
        } else {
            return parts[7];
        }
    }
}

