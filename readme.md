# aws-log-replay

[![Build Status](https://travis-ci.com/mapbox/aws-log-replay.svg?branch=master)](https://travis-ci.com/mapbox/aws-log-replay)

```
npm i @mapbox/aws-log-replay
```

Transform and replay a stream of AWS CloudFront, ELB Classic, or ALB logs. You can use [s3scan](https://github.com/mapbox/s3scan) to easily stream logs into these tools.

This project uses the AWS JavaScript SDK: you will need to [configure your own credentials](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html).

## generatepath

Takes different types of logs as input and streams  an object to `stdout`. Format of the output:
```js
{
  "path": "/a.json?option=1", 
  "method": "GET", // can be GET or HEAD
  "referer": "Referer" // for 'cloudfront' type only
}
```
Supported types include "cloudfront" for CloudFront logs and "lb" for ELB Classic or ALB logs.

```sh
Usage: generatepath <type>
```

## pathreplay

Makes replay requests to the `baseurl`. Expects paths to be piped to `stdin`. (Optional) Control concurrency of replay requests with `--concurrency` flag. Default is 100.

```sh
Usage: pathreplay <baseurl> [--concurrency=<n>]
```

## sample

Emits a repeatable set of input lines piped to `stdin` at a given sampling rate. The number of lines emitted will approach the specific rate over sufficiently large samples, but may diverge for small sample sizes. Sampling rates should be specified as a decimal number between zero and one. Optionally accepts a `filter` argument that restricts the sampled set to lines matching the specified regular expression.

```sh
Usage: sample --rate=<rate> [--filter=<filter>]
```
