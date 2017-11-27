var reader = require('../index.js');
var tape = require('tape');
var http = require('http');
var server;
var count = 0;
var requireFooHeader = false;

tape('setup', function(assert) {
  server = http.createServer(function(req, res) {
    count++;
    if (requireFooHeader && !req.headers['foo']) {
      res.writeHead(403);
    } else if (/\/c\.json/.test(req.url)) {
      res.writeHead(404);
    } else {
      res.writeHead(200);
      res.write(JSON.stringify({ obj: req.url.split('/')[1].split('.')[0] }));
    }
    setTimeout(function() {
      res.end();
    }, 1000);
  });
  server.reset = function() { count = 0; };
  server.listen(9999, assert.end);
});

tape('RequestStream [concurrency]', function(assert) {
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999',
    hwm: 3
  });
  reqstream.on('data', function() {
  });
  reqstream.on('end', function() {
    assert.end();
  });
  var req = 0;
  var j = setInterval(function() {
    req = req + 3;
    assert.equal(req, count);
  }, 1000);
  for (var i = 0; i < 10; i++) {
    reqstream.write('/a.json?option=1\n');
  }
  setTimeout(function() {
    clearInterval(j);
    reqstream.end();
  }, 3500);
});

tape('RequestStream', function(assert) {
  var data = [];
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999'
  });
  reqstream.on('data', function(d) {
    switch (d.statusCode) {
    case 200:
      assert.deepEqual(/http:\/\/localhost:9999\/(a|b)\.json/.test(d.url), true, 'data.url is object url');
      data.push(JSON.parse(d.body));
      break;
    case 404:
      assert.deepEqual(/http:\/\/localhost:9999\/c\.json/.test(d.url), true, 'data.url is object url');
      break;
    default:
      assert.fail('Invalid statusCode ' + d.statusCode);
      return;
    }

    assert.deepEqual(Buffer.isBuffer(d.body), true, 'data.body is buffer');
    assert.deepEqual(!isNaN(d.elapsedTime), true, 'data.elapsedTime is a number');
  });
  reqstream.on('end', function() {
    assert.deepEqual(data.length, 2, 'emits 2 objects');
    assert.deepEqual(data.map(function(d) { return d.obj; }).sort(), ['a', 'b'], 'emits objects a, b');
    assert.end();
  });
  reqstream.write('/a.json?option=1\n');
  reqstream.write('/b.json?option=2\n');
  reqstream.write('/c.json?option=2\n');
  reqstream.write('\n');
  reqstream.end();
});

tape('RequestStream (without required headers)', function(assert) {
  var data = [];
  requireFooHeader = true;
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999'
  });
  reqstream.on('data', function(d) {
    switch (d.statusCode) {
    case 200:
      assert.fail('shouldn\'t succeed without required header');
      data.push(JSON.parse(d.body));
      break;
    case 403:
      assert.deepEqual(/http:\/\/localhost:9999\/.\.json/.test(d.url), true, 'data.url is object url');
      break;
    default:
      assert.fail('Invalid statusCode ' + d.statusCode);
      return;
    }

    assert.deepEqual(Buffer.isBuffer(d.body), true, 'data.body is buffer');
    assert.deepEqual(!isNaN(d.elapsedTime), true, 'data.elapsedTime is a number');
  });
  reqstream.on('end', function() {
    assert.deepEqual(data.length, 0, 'emits 0 objects');
    requireFooHeader = false;
    assert.end();
  });
  reqstream.write('/a.json?option=1\n');
  reqstream.write('/b.json?option=2\n');
  reqstream.write('/c.json?option=2\n');
  reqstream.write('\n');
  reqstream.end();
});

tape('RequestStream (with required headers)', function(assert) {
  var data = [];
  requireFooHeader = true;
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999',
    headers: {
      foo: 'bar'
    }
  });
  reqstream.on('data', function(d) {
    switch (d.statusCode) {
    case 200:
      assert.deepEqual(/http:\/\/localhost:9999\/(a|b)\.json/.test(d.url), true, 'data.url is object url');
      data.push(JSON.parse(d.body));
      break;
    case 403:
      assert.fail('should not return 403');
      break;
    case 404:
      assert.deepEqual(/http:\/\/localhost:9999\/c\.json/.test(d.url), true, 'data.url is object url');
      break;
    default:
      assert.fail('Invalid statusCode ' + d.statusCode);
      return;
    }

    assert.deepEqual(Buffer.isBuffer(d.body), true, 'data.body is buffer');
    assert.deepEqual(!isNaN(d.elapsedTime), true, 'data.elapsedTime is a number');
  });
  reqstream.on('end', function() {
    assert.deepEqual(data.length, 2, 'emits 2 objects');
    assert.deepEqual(data.map(function(d) { return d.obj; }).sort(), ['a', 'b'], 'emits objects a, b');
    requireFooHeader = false;
    assert.end();
  });
  reqstream.write('/a.json?option=1\n');
  reqstream.write('/b.json?option=2\n');
  reqstream.write('/c.json?option=2\n');
  reqstream.write('\n');
  reqstream.end();
});

tape('RequestStream close', function(assert) {
  server.reset();
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:8888' // all requests ought to fail
  });

  reqstream.on('error', function(err) { assert.ifError(err, 'should not fail'); });
  reqstream.on('finish', function() {
    assert.equal(count, 0, 'no requests were made');
    assert.end();
  });

  reqstream.close();
  assert.ok(reqstream._closed, 'marked stream as closed');
  reqstream.write('/a.json?option=1\n');
  reqstream.write('/b.json?option=2\n');
  reqstream.write('/c.json?option=2\n');
  reqstream.write('\n');
  reqstream.end();
});

tape('teardown', function(assert) {
  server.close(assert.end);
});
