var reader = require('../index.js');
var tape = require('tape');
var http = require('http');
var server;
var count = 0;

tape('setup', function(assert) {
  server = http.createServer(function(req, res) {
    count++;
    if (/\/c\.json/.test(req.url)) {
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
    assert.deepEqual(/http:\/\/localhost:9999\/(a|b)\.json/.test(d.url), true, 'data.url is object url');
    assert.deepEqual(!isNaN(d.elapsedTime), true, 'data.elapsedTime is a number');
    assert.deepEqual(!isNaN(d.statusCode), true, 'data.statusCode is a number');
    assert.deepEqual(Buffer.isBuffer(d.body), true, 'data.body is buffer');
    data.push(JSON.parse(d.body));
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
