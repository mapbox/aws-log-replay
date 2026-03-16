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
    reqstream.write({ path: '/a.json?option=1\n' });
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
  reqstream.write({ path: '/a.json?option=1\n' });
  reqstream.write({ path: '/b.json?option=2\n' });
  reqstream.write({ path: '/c.json?option=2\n' });
  reqstream.write({ path: '\n' });
  reqstream.end();
});

tape('RequestStream whitespace utf8 characters', function(assert) {
  server.reset();
  var logs = [];
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999',
    hwm: 3
  });
  reqstream.on('data', function(d) {
    logs.push(d.url);
  });
  reqstream.on('end', function() {
    assert.equal(count, 21);
    assert.deepEqual(logs, [
      'http://localhost:9999/a.json?q=12:30%20PM',
      'http://localhost:9999/a.json?q=12:30%20PM',
      'http://localhost:9999/a.json?q=12:30%C2%A0PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%AFPM',
      'http://localhost:9999/a.json?q=12:30%E2%80%AFPM',
      'http://localhost:9999/a.json?q=12:30%E1%9A%80PM',
      'http://localhost:9999/a.json?q=12:30%E1%A0%8EPM',
      'http://localhost:9999/a.json?q=12:30%E2%80%80PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%81PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%82PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%83PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%84PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%85PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%86PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%87PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%88PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%89PM',
      'http://localhost:9999/a.json?q=12:30%E2%80%8APM',
      'http://localhost:9999/a.json?q=12:30%E2%80%8BPM',
      'http://localhost:9999/a.json?q=12:30%E2%81%9FPM',
      'http://localhost:9999/a.json?q=12:30%EF%BB%BFPM'
    ]);
    assert.end();
  });

  // https://jkorpela.fi/chars/spaces.html
  reqstream.write({ path: '/a.json?q=12:30 PM\n' });      // space (visual)
  reqstream.write({ path: '/a.json?q=12:30\u0020PM\n' }); // space (utf8)
  reqstream.write({ path: '/a.json?q=12:30\u00A0PM\n' }); // no-break space
  reqstream.write({ path: '/a.json?q=12:30 PM\n' });      // narrow no-break space (visual)
  reqstream.write({ path: '/a.json?q=12:30\u202FPM\n' }); // narrow no-break space (utf8)
  reqstream.write({ path: '/a.json?q=12:30\u1680PM\n' }); // ogham space mark
  reqstream.write({ path: '/a.json?q=12:30\u180EPM\n' }); // mongolian vowel separator
  reqstream.write({ path: '/a.json?q=12:30\u2000PM\n' }); // en quad
  reqstream.write({ path: '/a.json?q=12:30\u2001PM\n' }); // em quad
  reqstream.write({ path: '/a.json?q=12:30\u2002PM\n' }); // en space
  reqstream.write({ path: '/a.json?q=12:30\u2003PM\n' }); // em space
  reqstream.write({ path: '/a.json?q=12:30\u2004PM\n' }); // three-per-em space
  reqstream.write({ path: '/a.json?q=12:30\u2005PM\n' }); // four-per-em space
  reqstream.write({ path: '/a.json?q=12:30\u2006PM\n' }); // six-per-em space
  reqstream.write({ path: '/a.json?q=12:30\u2007PM\n' }); // figure space
  reqstream.write({ path: '/a.json?q=12:30\u2008PM\n' }); // punctuation space
  reqstream.write({ path: '/a.json?q=12:30\u2009PM\n' }); // thin space
  reqstream.write({ path: '/a.json?q=12:30\u200APM\n' }); // hair space
  reqstream.write({ path: '/a.json?q=12:30\u200BPM\n' }); // zero width space
  reqstream.write({ path: '/a.json?q=12:30\u205FPM\n' }); // medium mathematical space
  reqstream.write({ path: '/a.json?q=12:30\uFEFFPM\n' }); // zero width no-break space
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
  reqstream.write({ path: '/a.json?option=1\n' });
  reqstream.write({ path: '/b.json?option=2\n' });
  reqstream.write({ path: '/c.json?option=2\n' });
  reqstream.write({ path: '\n' });
  reqstream.end();
});

tape('RequestStream SSRF protection - protocol-relative URLs', function(assert) {
  server.reset();
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999'
  });

  reqstream.on('data', function() {
    assert.fail('should not make any requests for protocol-relative URLs');
  });

  reqstream.on('finish', function() {
    assert.equal(count, 0, 'no requests were made for protocol-relative URLs');
    assert.end();
  });

  // These should all be rejected
  reqstream.write({ path: '//attacker.com/exfil' });
  reqstream.write({ path: '//evil.example.com/steal' });
  reqstream.write({ path: '//169.254.169.254/latest/meta-data/iam/security-credentials/' });
  reqstream.end();
});

tape('RequestStream SSRF protection - absolute URLs', function(assert) {
  server.reset();
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999'
  });

  reqstream.on('data', function() {
    assert.fail('should not make any requests for absolute URLs');
  });

  reqstream.on('finish', function() {
    assert.equal(count, 0, 'no requests were made for absolute URLs');
    assert.end();
  });

  // These should all be rejected
  reqstream.write({ path: 'http://attacker.com/exfil' });
  reqstream.write({ path: 'https://evil.example.com/steal' });
  reqstream.write({ path: 'http://169.254.169.254/latest/meta-data/' });
  reqstream.end();
});

tape('RequestStream SSRF protection - valid relative paths still work', function(assert) {
  server.reset();
  var reqstream = reader.RequestStream({
    baseurl: 'http://localhost:9999'
  });

  var received = 0;
  reqstream.on('data', function(d) {
    received++;
    assert.equal(d.statusCode, 200, 'valid relative paths still work');
    assert.ok(/http:\/\/localhost:9999\//.test(d.url), 'URL is localhost as expected');
  });

  reqstream.on('finish', function() {
    assert.equal(received, 4, 'received 4 valid responses');
    assert.equal(count, 4, '4 requests were made for valid relative paths');
    assert.end();
  });

  // These should all work normally
  reqstream.write({ path: '/api/v1/test' });
  reqstream.write({ path: '/path/to/resource?query=param' });
  reqstream.write({ path: '/another/valid/path' });
  // Query param with URL should work (same origin)
  reqstream.write({ path: '/api?next=https://example.com&foo=bar' });
  reqstream.end();
});

tape('teardown', function(assert) {
  server.close(assert.end);
});
