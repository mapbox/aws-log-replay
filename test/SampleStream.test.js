var reader = require('..');
var tape = require('tape');
var fs = require('fs');
var split = require('split');

function testFunc(r, f, expected, t) {
    var sample = reader.SampleStream({ rate: (r * 0.1), filter: f });
    var scanGunzip = reader.ScanGunzip();

    var count = 0;
    sample.on('data', function(data) {
        count++;
    });
    sample.on('finish', function() {
        t.equals(count, expected[r - 1], 'got expected records (' + expected[r - 1] + ')');
        t.end();
    });

    scanGunzip
        .pipe(split())
        .pipe(sample);

    for (var k = 0; k < 1000; k++) {
        // each of these is 9 records long
        scanGunzip.write({
            Body: fs.readFileSync(__dirname + '/fixtures/AAAAAAAAAAAAAA.2015-10-19-17.e5b6526a.gz')
        });
    }
    scanGunzip.end();
}

var expectedUnfiltered = [949, 1879, 2820, 3728, 4592, 5449, 6323, 7220, 8136];
for (var rate = 1; rate < 10; rate++) {
    tape('unfiltered, sample rate ' + (rate * 0.1).toFixed(1), testFunc.bind(null, rate, false, expectedUnfiltered));
}

var expectedFiltered = [299, 607, 904, 1218, 1509, 1788, 2085, 2384, 2716];
for (var rate = 1; rate < 10; rate++) {
    tape('filtered, sample rate ' + (rate * 0.1).toFixed(1), testFunc.bind(null, rate, 'a\.json', expectedFiltered));
}

