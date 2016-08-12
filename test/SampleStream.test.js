var reader = require('..');
var tape = require('tape');
var fs = require('fs');
var split = require('split');
var path = require('path');

function testFunc(r, f, expected, t) {
    var sample = reader.SampleStream({rate: (r * 0.1), filter: f});

    var splitStream = split();
    var sampledStream = splitStream.pipe(sample);

    var count = 0;
    sample.on('data', function (data) {
        count++;
    });
    sample.on('finish', function () {
        t.equals(count, expected, 'got expected records (' + expected + ')');
        t.end();
    });

    for (var k = 0; k < 1000; k++) {
        // each of these is 9 records long
        splitStream.write(fs.readFileSync(path.join(__dirname + '/fixtures/AAAAAAAAAAAAAA.2015-10-19-17.e5b6526a'), 'utf8'));
    }
    splitStream.end();
}

var expectedUnfiltered = [949, 1879, 2820, 3728, 4592, 5449, 6323, 7220, 8136];
for (var rate = 1; rate < 10; rate++) {
    tape('unfiltered, sample rate ' + (rate * 0.1).toFixed(1), testFunc.bind(null, rate, false, expectedUnfiltered[rate - 1]));
}

var expectedFiltered = [299, 607, 904, 1218, 1509, 1788, 2085, 2384, 2716];
for (var rate = 1; rate < 10; rate++) {
    tape('filtered, sample rate ' + (rate * 0.1).toFixed(1), testFunc.bind(null, rate, 'a\.json', expectedFiltered[rate - 1]));
}

