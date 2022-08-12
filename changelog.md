# Change Log
All notable changes to this project will be documented in this file. For change log formatting, see http://keepachangelog.com/

## Unreleased

--

## 3.0.0 2022-08-11
- Include request method in stream when generating a path. This will introduce a breaking change. More info in the [#55](https://github.com/mapbox/aws-log-replay/pull/55) PR description 
- Request method will be used if passed to RequestStream. Only `GET` or `HEAD` requests are allowed to be replayed

## 2.6.1 2022-05-27
- Bumped `requestretry` from 2.0.0 to 7.1.0

## 2.6.0 2020-08-13

- Adds option to include referer in stream when generating a path
- If referer header is passed in to RequestStream, will include referer in request

## 2.4.1 2018-01-26

- Allow timestamps in url paths

## 2.4.0 2017-02-23

- RequestStream strictSSL option to optionally disable SSL cert checking
- RequestStream return all HTTP status codes

## 2.3.1 2016-12-08
- Last release without a changelog
