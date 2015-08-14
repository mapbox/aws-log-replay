var AWS = require('aws-sdk'),
    _ = require('underscore'),
    zlib = require('zlib'),
    spherical_mercator = require('sphericalmercator'),
    util = require('util');

var s3 = new AWS.S3();
var merc = new spherical_mercator({size:256});

module.exports = Reader;

function Reader(options) {
    this.bucket = options.bucket;
    this.prefix = options.prefix;
    this.pattern = options.pattern ? new RegExp(options.pattern) : null;
    this.paths = [];
    this.logs = [];
    this.fetching = false;
    this.bbox = options.bbox;
    return this;
}

Reader.prototype.read = function(cb) {
    var called = false;
    var that = this;
    if (this.paths.length) {
        called = true;
        cb(null, this.getPath());
    }
    // keep at least 10000 paths in the queue
    if (this.paths.length < 10000 && !this.fetching) {
        this.fetching = true;
        this._fetch(function() { if (!called) return cb(null, that.getPath());
        });
    }

    if (!this.paths.length) return this._wait(cb);
};

Reader.prototype._fetch = function(cb) {
    var that = this;
    this._list(function() {
        if (!that.logs.length) return;
        s3.getObject({Bucket: that.bucket, Key: that.logs[that.logs.length * Math.random() | 0]}, function(err, data) {
            if (err) throw err;
            zlib.gunzip(data.Body, function(err, buf) {
                if (err) throw err;
                var lines = buf.toString();
                // slice removes two header lines
                that.paths = lines.split('\n').slice(2);
                // filter by given pattern or bbox
                that.paths = that.paths.filter(function(line) {
                    var parts = line.split(/\s+/g);
                    if (that.pattern && parts.length > 7 && parts[7].match(that.pattern)) {
                        return true;
                    } else return false;
                }).filter(function(line) {
                    if (that.bbox) {
                        var parts = line.split(/\s+/g);
                        if (parts.length > 6) {
                            var tileRequest = parts[7].split('/');
                            if (tileRequest.slice(-1)[0].indexOf('.png') !== -1) {
                                var reqtile = tileRequest.slice(-3).map(function clean(x){return parseInt(x)});
                                reqtile.push(reqtile.shift());
                                // convert requested tile into geometry and compare against given bbox
                                var reqbbox = merc.bbox(+reqtile[0],+reqtile[1],+reqtile[2]);
                                if (reqbbox[0] >= that.bbox[0] && reqbbox[0] <= that.bbox[2] && reqbbox[2] <= that.bbox[2]) {
                                    return true;
                                }
                            } else return false;
                        } else return false;
                    }
                });
                // only keep paths
                that.paths = that.paths.map(function(line){
                    var parts = line.split(/\s+/g);
                    if (parts[11] !== "-") {
                        return line.split(/\s+/g)[7] + "?" + parts[11];
                    } else return line.split(/\s+/g)[7];
                });
                this.fetching = false;
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

Reader.prototype.getPath = function() {
    if (this.paths.length > 50000) {
        // Don't let it get too big
        this.paths = this.paths.splice(Math.ceil(this.paths.length / 2));
        return this.paths.shift();
    }
    else return this.paths[this.paths.length * Math.random() | 0];
};

Reader.prototype._wait = function(cb) {
    var that = this;
    var wait = function() {
        if (that.paths.length) return cb(null, that.getPath());
        else {
            setTimeout(function() {
                wait();
            }, 100);
        }
    };

    if (this.paths.length) return cb(null, this.getPath());
    else {
        wait();
    }
};
