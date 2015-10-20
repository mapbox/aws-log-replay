var fs = require('fs');
var reader = require('../index.js');
var tape = require('tape');

tape('getPath', function(assert) {
    assert.deepEqual(reader.getPath('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n'), '/a.json?option=1');
    assert.deepEqual(reader.getPath('\n'), undefined);
    assert.end();
});

