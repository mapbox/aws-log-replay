cloudfront-log-reader
---------------------
Exposes AWS CloudFront logs from S3 as a node.js readable stream and provides additional tools for working with CF logs. See `api.md` for JS API.

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

Takes different types of logs as input and streams paths to `stdout`.

```sh
Usage: generatepath <type>
```

### cflogreplay

Makes replay requests to the `baseurl`. Expects CF log lines to be piped to `stdin`. (Optional) Control concurrency of replay requests with `--concurrency` flag. Default is 100.

```sh
Usage: cflogreplay <baseurl> [--concurrency=<n>]
```

### pathreplay

Makes replay requests to the `baseurl`. Expects paths to be piped to `stdin`. (Optional) Control concurrency of replay requests with `--concurrency` flag. Default is 100.

```sh
Usage: pathreplay <baseurl> [--concurrency=<n>]
```
