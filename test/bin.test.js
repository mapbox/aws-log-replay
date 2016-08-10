var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var tape = require('tape');
var queue = require('queue-async');
var S3 = new (require('aws-sdk')).S3();
var http = require('http');
var server;

tape('setup', function(assert) {
    server = http.createServer(function(req, res) {
        if (/\/c\.json/.test(req.url)) {
            res.writeHead(404);
        } else {
            res.writeHead(200);
            res.write(JSON.stringify({ obj: req.url.split('/')[1].split('.')[0] }));
        }
        res.end();
    });
    server.listen(9999, assert.end);
});

tape('pathreplay: usage', function(assert) {
    exec(__dirname + '/../bin/pathreplay', {env:process.env}, function(err, stdout, stderr) {
        assert.equal(err.code, 1, 'exits 1');
        assert.equal(stderr, 'Usage: pathreplay <baseurl> [--concurrency=<n>]\n', 'shows usage');
        assert.end();
    });
});

tape('pathreplay', function(assert) {
    var child = spawn(__dirname + '/../bin/pathreplay', ['http://localhost:9999']);
    var data = [];
    child.stdout.on('data', function(d) {
        data.push(d.toString());
    });
    child.stderr.on('data', function(data) {
        assert.ifError(data);
    });
    child.on('close', function(code) {
        assert.deepEqual(data, ['{"obj":"a"}\n', '{"obj":"b"}\n'], 'emits obj a, b');
        assert.equal(code, 0, 'exits 0');
        assert.end();
    });
    child.stdin.write('/a.json\n');
    child.stdin.write('/b.json\n');
    child.stdin.write('/c.json\n');
    child.stdin.write('\n');
    child.stdin.end();
});

tape('pathreplay [bad args]', function(assert) {
    var child = spawn(__dirname + '/../bin/pathreplay', ['foobar', 'http://localhost:9999']);
    var data = [];
    child.stderr.on('data', function(data) {
        assert.equal(data.toString(), 'Usage: pathreplay <baseurl> [--concurrency=<n>]\n', 'Usage when args out of order');
        assert.end();
    });
});

tape('pathreplay [concurrency arg]', function(assert) {
    var child = spawn(__dirname + '/../bin/pathreplay', ['http://localhost:9999', '--concurrency=5']);
    var data = [];
    child.stdout.on('data', function(d) {
        data.push(d.toString());
    });
    child.stderr.on('data', function(data) {
        assert.ifError(data);
    });
    child.on('close', function(code) {
        assert.deepEqual(data, ['{"obj":"a"}\n'], 'emits obj a');
        assert.equal(code, 0, 'exits 0');
        assert.end();
    });
    child.stdin.write('/a.json\n');
    child.stdin.write('\n');
    child.stdin.end();
});

tape('teardown', function(assert) {
    server.close(assert.end);
});

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

tape('generatepath: usage', function(assert) {
    exec(__dirname + '/../bin/generatepath', {env:process.env}, function(err, stdout, stderr) {
        assert.equal(err.code, 1, 'exits 1');
        assert.equal(stderr, 'Usage: generatepath <type>\n<type> can be "cloudfront" or "elb"\n', 'shows usage');
        assert.end();
    });
});

tape('generatepath [cloudfront]', function(assert) {
    var child = spawn(__dirname + '/../bin/generatepath', ['cloudfront']);
    var data = [];
    child.stdout.on('data', function(d) {
        data.push(d.toString());
    });
    child.stderr.on('data', function(data) {
        assert.ifError(data);
    });
    child.on('close', function(code) {
        assert.equal(data[0], '/a.json?option=1\n');
        assert.equal(data[1], '/b.json?option=2\n');
        assert.equal(data[2], '/c.json?option=2\n');
        assert.equal(code, 0, 'exits 0');
        assert.end();
    });
    child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n');
    child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/b.json	200	https://www.mapbox.com/	FakeAgent	option=2	-	Miss	FAKE==	example.com	http	784	0.314\n');
    child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/c.json	200	https://www.mapbox.com/	FakeAgent	option=2	-	Miss	FAKE==	example.com	http	784	0.314\n');
    child.stdin.write('\n');
    child.stdin.end(); 
});

tape('generatepath [cloudfront]', function(assert) {
    var child = spawn(__dirname + '/../bin/generatepath', ['elb']);
    var data = [];
    child.stdout.on('data', function(d) {
        data.push(d.toString());
    });
    child.stderr.on('data', function(data) {
        assert.ifError(data);
    });
    child.on('close', function(code) {
        assert.equal(data[0], '/a.json?option=1\n');
        assert.equal(code, 0, 'exits 0');
        assert.end();
    });
    child.stdin.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 304 304 0 0 "GET http://green-eggs.com:80/a.json?option=1 HTTP/1.1" "Amazon CloudFront" - -\n');
    child.stdin.write('\n');
    child.stdin.end(); 
});
