var AWS = require('aws-sdk'),
    _ = require('underscore'),
    zlib = require('zlib'),
    util = require('util'),
    Readable = require('stream').Readable;

var s3 = new AWS.S3();

module.exports = Reader;

function Reader(options) {
    this.bucket = options.bucket;
    this.prefix = options.prefix;
    this.logs = [];
    this.fetching = 0;
    Readable.call(this, {
        objectMode: true
    });
    return this;
}
util.inherits(Reader, Readable);

Reader.prototype._read = function() {
    var that = this;

    var fetchAndProcess = function() {
        that._fetch(that._pick(), function(err, data) {
            if (err) throw err;
            that._process(data, function(err, lines) {
                lines.forEach(function(line) {
                    that.push(line);
                });
            });
        });
    };

    var prime = function() {
        for (var i = that.fetching; i < 5; i++)
            fetchAndProcess();
    };

    // Need to determine list of keys to fetch from S3
    if (!this.logs.length) {
        that._list(function(err) {
            if (err) throw err;
            if (that.fetching > 5) return that;
            prime();
        });
    } else {
        if (that.fetching > 5) return that;
        prime();
    }
};

// Fetch list of log files from S3
Reader.prototype._list = function(cb) {
    var that = this;
    s3.listObjects({Bucket: this.bucket, Prefix: this.prefix}, function(err, data) {
        if (err) return cb(err);
        that.logs = _(data.Contents).pluck('Key');
        cb();
    });
};

// Fetch log file from S3
Reader.prototype._fetch = function(key, cb) {
console.log('_fetch');
    var that = this;
    this.fetching++;
    s3.getObject({Bucket: this.bucket, Key: key}, function(err, data) {
        if (err) return cb(err);
        that.fetching--;
        cb(null, data.Body);
    });
};

// Uncompress log file, return array of urls
Reader.prototype._process = function(file, cb) {
    var entries = [];
    zlib.gunzip(file, function(err, buf) {
        if (err) return cb(err);
        var lines = buf.toString();
        // slice removes two header lines
        lines = lines.split('\n').slice(2);
        lines.forEach(function(line) {
            var parts = line.split(/\s+/g);
            if (parts.length > 7) {
                entries.push(parts[7]);
            }
        });
        cb(null, entries);
    });
};

Reader.prototype._pick = function() {
    return this.logs[this.logs.length * Math.random | 0];
};
