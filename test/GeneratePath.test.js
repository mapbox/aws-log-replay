var fs = require('fs');
var reader = require('../index.js');
var tape = require('tape');

tape('GeneratePath [cloudfront]', function(assert) {
    var data = [];
    var generatePath = reader.GeneratePath('cloudfront');
    generatePath.on('data', function(d) {
        data.push(d);
    });
    generatePath.on('end', function() {
        assert.equal(data[0], '/a.json?option=1');
        assert.equal(data.length, 1);
        assert.end();
    });
    generatePath.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n');
    generatePath.write('\n');
    generatePath.end();
});

tape('GeneratePath [elb]', function(assert) {
    var data = [];
    var generatePath = reader.GeneratePath('elb');
    generatePath.on('data', function(d) {
        data.push(d);
    });
    generatePath.on('end', function() {
        assert.equal(data[0], '/a.json?option=1');
        assert.equal(data[1], '/b.json?option=1&other=2');
        assert.equal(data.length, 2);
        assert.end();
    });
    generatePath.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 304 304 0 0 "GET http://green-eggs.com:80/a.json?option=1 HTTP/1.1" "Amazon CloudFront" - -');
    generatePath.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 200 200 0 0 "GET http://green-eggs.com:666/b.json?option=1&other=2 HTTP/1.1" "Amazon CloudFront" - -');
    generatePath.write('us-east-1.elb.amazonaws.com:666/ HTTP/1.1" "Amazon Route 53 Health Check Service; ref:000-000-0000; report http://green.eggs" ABCD-EFGH TLSv1.2');
    generatePath.write('\n');
    generatePath.end();
});
