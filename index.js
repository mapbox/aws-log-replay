var request = require('requestretry');
var s3scan = require('s3scan');
var split = require('split');
var zlib = require('zlib');
var url = require('url');
var stream = require('stream');
var queue = require('queue-async');
var crypto = require('crypto');

module.exports = {};
module.exports.RequestStream = RequestStream;
module.exports.GeneratePath = GeneratePath;
module.exports.SampleStream = SampleStream;

/**
 * decode a path according to cloudfront character encoding spec
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html
 * @param {string path} - a cloudfront path to decode
 */
function cloudFrontDecode(path) {
    var whitelist = ['3C', '3E', '22', '23', '25', '7B', '7D', '7C', '5C', '5E', '7E', '5B', '5D', '60', '27', '20'];
    return path.replace(/%([\dA-F]{2})/g, function(match, hex) {
        var code = parseInt(hex, 16);
        if ((code < 32) || (code > 127) || (whitelist.indexOf(hex) !== -1))
            return String.fromCharCode(code);
        else
            return match;
    });
}

/**
 * Transform stream for converting a CF log line into a path and querystring.
 * Expects a line-oriented stream of CF log lines.
 * @param {string} type
 */
function GeneratePath(type) {
    var generatePath = new stream.Transform({ objectMode: true });
    generatePath._transform = function(line, enc, callback) {
        if (!line) return callback();
        if (Buffer.isBuffer(line)) line = line.toString('utf-8');
        if (type.toLowerCase() == 'cloudfront') {
            var parts = line.split(/\s+/g);
            if (parts.length > 7) {
                if (parts[11] && parts[11] !== "-") {
                    generatePath.push(cloudFrontDecode(parts[7] + "?" + parts[11]));
                } else {
                    generatePath.push(cloudFrontDecode(parts[7]));
                }
            }
        } else if (type.toLowerCase() == 'lb') {
            if (line.indexOf('Amazon Route 53 Health Check Service') > -1) return callback();
            var parts = line.split(/\s+/g);
            if (parts.length < 12) return callback();
            var path = parts.length === 18 ? parts[12] : parts[13];
            path = path.split(/:[0-9]\w+/g)[1];
            if (!path) return callback();
            generatePath.push(path);
        }
        callback();
    };
    return generatePath;
}

/**
 * Transform stream for replaying requests from a log of paths against a specified
 * host. LH side expects a line-oriented stream of paths (& querystrings).
 * @param {object} options
 * @param {string} options.baseurl - Required. An http or https url prepended to paths when making requests.
 */
function RequestStream(options) {
    options = options || {};
    if (!options.baseurl) throw new Error('options.baseurl should be an http:// or https:// baseurl for replay requests');
    if (!options.hwm) options.hwm = 100;

    var starttime = Date.now();
    var requestStream = new stream.Transform(options);
    requestStream._readableState.objectMode = true;
    requestStream.got = 0;
    requestStream.pending = 0;
    requestStream.queue = queue(options.hwm);
    requestStream.queue.awaitAll(function(err) {
        if (err) requestStream.emit('error', err);
    });

    requestStream._transform = function(pathname, enc, callback) {
        if (typeof pathname !== 'string') pathname = pathname.toString('utf8');
        if (!pathname || pathname.indexOf('/') !== 0) return callback();

        var uri = url.parse(pathname, true);

        if (requestStream.pending > (options.hwm * 1.5)) {
            return setImmediate(requestStream._transform.bind(requestStream), pathname, enc, callback);
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
 * Emit lines at a specified sample rate & with optional filter regex.
 * Behaves deterministically so given param/input combinations will return
 * reliably identical results.
 * @param {object} options
 * @param {number} options.sample - Required. Sample rate between 0 and 1.0
 * @param {string} options.filter - Optional. Regex pre-filter applied to input.
 */
function SampleStream(options) {
    options = options || {};
    if (!options.rate) throw new Error('must specify a sample rate (0 < sample < 1)');
    if ((parseFloat(options.rate) <= 0) || (parseFloat(options.rate) >= 1)) throw new Error('rate must be between 0 and 1');

    var sampleStream = new stream.Transform({ objectMode: true });
    sampleStream.count = 0;
    sampleStream.threshold = Math.round(parseFloat(options.rate) * Math.pow(2, 16));
    if (options.filter) sampleStream.filter = new RegExp(options.filter);
    sampleStream._transform = function(line, enc, callback) {
        if (!line) return callback();

        if ((sampleStream.filter) && (!sampleStream.filter.test(line)))
            return callback();

        var hash = crypto.createHash('md5').update('cloudfront-log-read-salt-' + sampleStream.count).digest().readUInt16LE(0);
        if (hash < sampleStream.threshold)
            sampleStream.push(line);
        sampleStream.count++;

        callback();
    };

    return sampleStream;
}
