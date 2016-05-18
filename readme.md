cloudfront-log-reader
---------------------
Exposes AWS CloudFront logs from S3 as a node.js readable stream and provides additional tools for working with CF logs. See `api.md` for JS API. This project uses the AWS JavaScript SDK: you will need to [configure your own credentials](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html).

```
var reader = require('cloudfront-log-reader');
var logStream = reader.LogStream('s3://mybucket/cf-logs/');
logStream.pipe(process.stdout);
```

This module also provides two small wrapper commands for usings its functionality from the commandline.

### cflogreader

Streams CF log lines to `stdout`.

``` sh
Usage: cflogreader <s3url>
```

### generatepath

Takes different types of logs as input and streams paths to `stdout`. Supported types include "cloudfront" and "elb".

```sh
Usage: generatepath <type>
```

### pathreplay

Makes replay requests to the `baseurl`. Expects paths to be piped to `stdin`. (Optional) Control concurrency of replay requests with `--concurrency` flag. Default is 100.

```sh
Usage: pathreplay <baseurl> [--concurrency=<n>]
```

### sample

Emits a repeatable set of input lines piped to `stdin` at a given sampling rate. The number of lines emitted will approach the specific rate over sufficiently large samples, but may diverge for small sample sizes. Sampling rates should be specified as a decimal number between zero and one. Optionally accepts a `filter` argument that restricts the sampled set to lines matching the specified regular expression.

```sh
Usage: sample --rate=<rate> [--filter=<filter>]
```
