var AWS = require('aws-sdk'),
    _ = require('underscore'),
    zlib = require('zlib'),
    util = require('util');

var s3 = new AWS.S3();

module.exports = Reader;

function Reader(options) {
    this.bucket = options.bucket;
    this.prefix = options.prefix;
    this.paths = [];
    this.logs = [];
    return this;
}

Reader.prototype.read = function(cb) {
    var called = false;
    var that = this;
    if (this.paths.length) {
        called = true;
        cb(null, this.paths.shift());
    }
    if (this.paths.length < 10000) {
        this._fetch(function() {
            if (!called) cb(null, that.paths.shift());
        });
    }
};

Reader.prototype._fetch = function(cb) {
    var that = this;
    this._list(function() {
        if (!that.logs.length) return;
        s3.getObject({Bucket: that.bucket, Key: that.logs.pop()}, function(err, data) {
            if (err) throw err;
            zlib.gunzip(data.Body, function(err, buf) {
                if (err) throw err;
                var lines = buf.toString();
                // slice removes two header lines
                lines = lines.split('\n').slice(2);
                lines.forEach(function(line) {
                    var parts = line.split(/\s+/g);
                    if (parts.length > 7) {
                        that.paths.push(util.format('%s "%s"', parts[5], parts[7]));
                    }
                });
                cb();
            });
        });
    });
};

Reader.prototype._list = function(cb) {
    if (this.logs.length) return cb();
    var that = this;
    s3.listObjects({Bucket: this.bucket, Prefix: this.prefix}, function(err, data) {
        if (err) throw err;
        that.logs = _(data.Contents).pluck('Key');
        cb();
    });
};

// Preemptively prime the paths list
Reader.prototype.prime = function(cb) {
    var that = this;
    this._list(function() {
        that._fetch(function() {
            cb();
        });
    });
};
