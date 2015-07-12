## Install

```sh
$ npm install npa
```
Node Persistence API; A data management model for nodejs inspired by the Java Persistence API.

Latest development builds.

```sh
$ npm install trakaus/node-npa
```

[v0.2 branch]: https://github.com/felixge/node-mysql/tree/v0.2

## Introduction

This is a research project for node.js to create a universal persistence api that attempts to standardize the access to databases inspired by the Java Persistence API.
It is written in JavaScript, does not require compiling, and is GNU v3.0 licensed.

Note: Current build only supports MySQL 5.x but will be adding support for other RDBMS in the near future.

Here is an example on how to use it:

```js
var factory 	= require('npa');
var entityMngr  = factory.getSchemaManager(factory.engines.mysql);

// more coming soon...
```
