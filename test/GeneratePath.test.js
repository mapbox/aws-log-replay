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
        assert.equal(data.length, 1);
        assert.end();
    });
    generatePath.write('\n');
    generatePath.write('\n');
    generatePath.end();
});
