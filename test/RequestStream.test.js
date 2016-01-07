var fs = require('fs');
var reader = require('../index.js');
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

tape('RequestStream', function(assert) {
    var data = [];
    var reqstream = reader.RequestStream({
        baseurl: 'http://localhost:9999'
    });
    reqstream.on('data', function(d) {
        assert.deepEqual(/http:\/\/localhost:9999\/(a|b)\.json/.test(d.url), true, 'data.url is object url');
        assert.deepEqual(Buffer.isBuffer(d.body), true, 'data.body is buffer');
        data.push(JSON.parse(d.body));
    });
    reqstream.on('end', function() {
        assert.deepEqual(data.length, 2, 'emits 2 objects');
        assert.deepEqual(data.map(function(d) { return d.obj }).sort(), ['a', 'b'], 'emits objects a, b');
        assert.end();
    });
    reqstream.write('/a.json?option=1\n');
    reqstream.write('/b.json?option=2\n');
    reqstream.write('/c.json?option=2\n');
    reqstream.write('\n');
    reqstream.end();
});

tape('teardown', function(assert) {
    server.close(assert.end);
});

