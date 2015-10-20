## `LogStream`

Create a readable line-oriented stream of CF logs.

### Parameters

* `uri` **`string`** An s3 url with prefix to CF logs. Example: 's3://mybucket/cf-logs/'
* `options` **`object`** 
  * `options.agent` **`object`** Optional. An http agent to use when requesting logs




## `RequestStream`

Transform stream for replaying requests from a CF log against a specified
host. LH side expects a line-oriented stream of CF log lines.

### Parameters

* `options` **`object`** 
  * `options.baseurl` **`string`** Required. An http or https url prepended to paths when making requests.




## `ScanGunzip`

Transform stream for converting gzipped CF logs from an s3scan Scan stream
to line log text.





## `getPath`

Convert a CF log line into a path and querystring.

### Parameters

* `line` **`string`** 




