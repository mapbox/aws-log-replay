var request = require('requestretry');
var url = require('url');
var stream = require('stream');
var crypto = require('crypto');
var parallel = require('parallel-stream');

module.exports = {};
module.exports.RequestStream = RequestStream;
module.exports.GeneratePath = GeneratePath;
module.exports.SampleStream = SampleStream;

const allowedMethods = ['GET', 'HEAD'];

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
 * @param {boolean} keepReferer - set to true if using cloudfront logs and you want to include the referer in the request
 */
function GeneratePath(type, keepReferer = false) {
  var generatePath = new stream.Transform({ objectMode: true });
  generatePath._transform = function(line, enc, callback) {
    if (!line) return callback();
    if (Buffer.isBuffer(line)) line = line.toString('utf-8');
    if (type.toLowerCase() == 'cloudfront') {
      var parts = line.split(/\s+/g);
      if (parts.length > 7) {
        if (parts[11] && parts[11] !== '-') {
          var path = cloudFrontDecode(parts[7] + '?' + parts[11]);
        } else {
          path = cloudFrontDecode(parts[7]);
        }
        if (!path) return callback();

        if (keepReferer && parts[9] && parts[9] !== '-') {
          var referer = parts[9];
        }

        const method = parts[5];
        // get Referer & method
        if (method && allowedMethods.some((m) => method.includes(m))) {
          const obj = { path, method };
          if (referer) obj.referer = referer;
          generatePath.push(obj);
        } 
      } 
    } else if (type.toLowerCase() == 'lb') {
      if (line.indexOf('Amazon Route 53 Health Check Service') > -1) return callback();
      parts = line.split(/\s+/g);
      if (parts.length < 12) return callback();
      path = parts.length === 18 ? parts[12] : parts[13];
      path = url.parse(path).path;
      const method = parts.length === 18 ? parts[11] : parts[12];
      if (!path) return callback();

      // get request method
      // usually it is stored as "GET, regex will help remove the non-alphabetical characters
      if (method && allowedMethods.some((m) => method.includes(m))) generatePath.push({ path, method: method.match(/[a-zA-Z]+/g)[0] });
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
 * @param {string} options.strictSSL - Optional. If true (default), requires SSL/TLS certificates to be valid
 */
function RequestStream(options) {
  options = options || {};
  if (!options.baseurl) throw new Error('options.baseurl should be an http:// or https:// baseurl for replay requests');
  if (!options.hwm) options.hwm = 100;
  function transform(data, enc, callback) {
    if (this._closed) return setImmediate(callback);
    var pathname, referer;
    const method = data['method'];

    referer = data['referer'];
    if (referer && typeof referer !== 'string') referer = referer.toString('utf8');
  
    pathname = data['path'];
    if (pathname && typeof pathname !== 'string') pathname = pathname.toString('utf8');
    if (!pathname || pathname.indexOf('/') !== 0) return callback();

    // replace all potential empty space characters with standard space character
    var uri = url.parse(pathname.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/, ' '), true);
    var requrl = options.baseurl + url.format(uri);

    var requestOptions = {
      agent: options.agent,
      strictSSL: options.strictSSL === false ? false : true,
      encoding: null,
      uri: requrl,
      time: true
    };

    if (referer) {
      requestOptions.headers = { referer };
    }

    if (method) {
      requestOptions.method = method;
    }

    request(requestOptions, (err, res, body) => {
      if (err) return callback(err);
      this.push({ url: requrl, elapsedTime: res.elapsedTime, statusCode: res.statusCode, body: body });
      callback();
    });
  }

  var requestStream = parallel.transform(transform, { concurrency: options.hwm, objectMode: true });
  requestStream.close = function() {
    requestStream._closed = true;
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
