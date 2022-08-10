var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var tape = require('tape');
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
  exec(__dirname + '/../bin/pathreplay', { env: process.env }, function(err, stdout, stderr) {
    assert.equal(err.code, 1, 'exits 1');
    assert.equal(stderr, 'Usage: pathreplay <baseurl> [--concurrency=<n>]\n', 'shows usage');
    assert.end();
  });
});

tape('pathreplay', function(assert) {
  var child = spawn(__dirname + '/../bin/pathreplay', ['http://localhost:9999']);
  var data = [];
  child.stdout.on('data', function(d) {
    if (d.toString() != '\n') {
      data.push(d.toString());
    }
  });
  child.stderr.on('data', function(data) {
    assert.ifError(data);
  });
  child.on('close', function(code) {
    assert.deepEqual(data.sort(), ['{"obj":"a"}\n', '{"obj":"b"}\n'], 'emits obj a, b');
    assert.equal(code, 0, 'exits 0');
    assert.end();
  });
  child.stdin.write(`${JSON.stringify({ path: '/a.json\n' })}\n`);
  child.stdin.write(`${JSON.stringify({ path: '/b.json\n' })}\n`);
  child.stdin.write(`${JSON.stringify({ path: '/c.json\n' })}`);
  child.stdin.end();
});

tape('pathreplay [bad args]', function(assert) {
  var child = spawn(__dirname + '/../bin/pathreplay', ['foobar', 'http://localhost:9999']);
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
  child.stdin.write(JSON.stringify({ path: '/a.json\n' }));
  child.stdin.end();
});

tape('teardown', function(assert) {
  server.close(assert.end);
});

tape('generatepath: usage', function(assert) {
  exec(__dirname + '/../bin/generatepath', { env: process.env }, function(err, stdout, stderr) {
    assert.equal(err.code, 1, 'exits 1');
    assert.equal(stderr, 'Usage: generatepath <type>\n<type> can be "cloudfront" or "lb"\n', 'shows usage');
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
    assert.equal(data[0], '{ path: \'/a.json?option=1\', method: \'GET\' }\n');
    assert.equal(data[1], '{ path: \'/b.json?option=2\', method: \'GET\' }\n');
    assert.equal(data[2], '{ path: \'/c.json?option=2\', method: \'GET\' }\n');
    assert.equal(code, 0, 'exits 0');
    assert.end();
  });
  child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n');
  child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/b.json	200	https://www.mapbox.com/	FakeAgent	option=2	-	Miss	FAKE==	example.com	http	784	0.314\n');
  child.stdin.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/c.json	200	https://www.mapbox.com/	FakeAgent	option=2	-	Miss	FAKE==	example.com	http	784	0.314\n');
  child.stdin.write('\n');
  child.stdin.end();
});

tape('generatepath [lb]', function(assert) {
  var child = spawn(__dirname + '/../bin/generatepath', ['lb']);
  var data = [];
  child.stdout.on('data', function(d) {
    data.push(d.toString());
  });
  child.stderr.on('data', function(data) {
    assert.ifError(data);
  });
  child.on('close', function(code) {
    assert.equal(data[0], '{ path: \'/a.json?option=1\', method: \'GET\' }\n');
    assert.equal(data[1], '{ path: \'/b.json?option=2\', method: \'HEAD\' }\n');
    assert.equal(code, 0, 'exits 0');
    assert.end();
  });
  child.stdin.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 304 304 0 0 "GET http://green-eggs.com:80/a.json?option=1 HTTP/1.1" "Amazon CloudFront" - -\n');
  child.stdin.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 200 200 0 0 "HEAD http://green-eggs.com:80/b.json?option=2 HTTP/1.1" "Amazon CloudFront" - -\n');
  child.stdin.write('\n');
  child.stdin.end();
});
