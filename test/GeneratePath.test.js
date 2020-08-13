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
    assert.equal(data[1], '/geocoding/v5/mapbox.places/2401%20Gw%20Loy%20Rd%20New%20Market%2C%20Tn%2037820.json?access_token=pk.abc.123');
    assert.equal(data.length, 2);
    assert.end();
  });
  generatePath.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n');
  generatePath.write('2016-04-14      02:40:16        DFW50   1771    108.223.176.206 GET     d3eju24r2ptc5d.cloudfront.net   /geocoding/v5/mapbox.places/2401%2520Gw%2520Loy%2520Rd%2520New%2520Market%252C%2520Tn%252037820.json        200     -       Mozilla/5.0%2520(iPhone;%2520CPU%2520iPhone%2520OS%25209_2%2520like%2520Mac%2520OS%2520X)%2520AppleWebKit/601.1.46%2520(KHTML,%2520like%2520Gecko)%2520Mobile/13C75 access_token=pk.abc.123       -       Miss    TbuZW6a2aUgeR9kBenr30jytUpJW5tSuv20Xv3n-smuTCqSdBjGpZQ==    a.tiles.mapbox.com      http    451     1.954   -       -       -       Miss\n');
  generatePath.write('\n');
  generatePath.end();
});

tape('GeneratePath with referer [cloudfront]', function(assert) {
  var data = [];
  var keepReferer = true;
  var generatePath = reader.GeneratePath('cloudfront', keepReferer);
  generatePath.on('data', function(d) {
    data.push(d);
  });
  generatePath.on('end', function() {
    assert.deepEqual(data[0], ['/a.json?option=1', 'https://www.mapbox.com/']);
    assert.equal(data[1], '/geocoding/v5/mapbox.places/2401%20Gw%20Loy%20Rd%20New%20Market%2C%20Tn%2037820.json?access_token=pk.abc.123');
    assert.equal(data.length, 2);
    assert.end();
  });
  generatePath.write('2014-09-05	12:48:00	IAD53	33125	54.236.254.12	GET	d3eju24r2ptc5d.cloudfront.net	/a.json	200	https://www.mapbox.com/	FakeAgent	option=1	-	Miss	FAKE==	example.com	http	784	0.314\n');
  generatePath.write('2016-04-14      02:40:16        DFW50   1771    108.223.176.206 GET     d3eju24r2ptc5d.cloudfront.net   /geocoding/v5/mapbox.places/2401%2520Gw%2520Loy%2520Rd%2520New%2520Market%252C%2520Tn%252037820.json        200     -       Mozilla/5.0%2520(iPhone;%2520CPU%2520iPhone%2520OS%25209_2%2520like%2520Mac%2520OS%2520X)%2520AppleWebKit/601.1.46%2520(KHTML,%2520like%2520Gecko)%2520Mobile/13C75 access_token=pk.abc.123       -       Miss    TbuZW6a2aUgeR9kBenr30jytUpJW5tSuv20Xv3n-smuTCqSdBjGpZQ==    a.tiles.mapbox.com      http    451     1.954   -       -       -       Miss\n');
  generatePath.write('\n');
  generatePath.end();
});

tape('GeneratePath [elb]', function(assert) {
  var data = [];
  var generatePath = reader.GeneratePath('lb');
  generatePath.on('data', function(d) {
    data.push(d);
  });
  generatePath.on('end', function() {
    assert.equal(data[0], '/a.json?option=1');
    assert.equal(data[1], '/b.json?option=1&other=2');
    assert.equal(data[2], '/ham/sam?iam');
    assert.equal(data[3], '/v1/thing/my.id?time=2017-05-31T22:05:32.562Z');
    assert.equal(data.length, 4);
    assert.end();
  });
  generatePath.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 304 304 0 0 "GET http://green-eggs.com:80/a.json?option=1 HTTP/1.1" "Amazon CloudFront" - -');
  generatePath.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 200 200 0 0 "GET http://green-eggs.com:666/b.json?option=1&other=2 HTTP/1.1" "Amazon CloudFront" - -');
  generatePath.write('us-east-1.elb.amazonaws.com:666/ HTTP/1.1" "Amazon Route 53 Health Check Service; ref:000-000-0000; report http://green.eggs" ABCD-EFGH TLSv1.2');
  generatePath.write('https 2016-09-25T07:15:01.253924Z app/api-green-eggs/1234 00.000.000.00:00000 00.0.0.000:00000 0.000 0.000 0.000 000 000 0000 000 "POST https://green.eggs.com:000/ham/sam?iam HTTP/1.1" "(null)/0.0.0/000 greeneggsandham/0.0" ABCDE-ABC-ABC000-ABC TLSv1 greeneggsandhamsamiam');
  generatePath.write('2016-02-01T19:04:59.488164Z eggs-VPC 000.000.000.00:00000 00.0.00.00:00 0.000024 0.006806 0.00002 304 304 0 0 "GET http://api.example.com:80/v1/thing/my.id?time=2017-05-31T22:05:32.562Z HTTP/1.1" "Amazon CloudFront" - -');
  generatePath.write('\n');
  generatePath.end();
});
