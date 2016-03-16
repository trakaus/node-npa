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

node-npa relies on node-config for the database parameter configurations. Setup your default.json, stage.json & production.json files with the following json layout:

```js
{
    // orm configs
    "connectors": {
        "schemas": [{
	        "name":"{config-name}",
	        "type":"mysql|postgress",
            "host":"{host}",
            "port":{port},
            "user":"{username}",
            "pwd":"{password}",
            "db":"{datbase-name}",
            "flags":"{connection-flags}",
            "debug":true|false
        }]
    },
    
    // orm & api builder params
    "paths": {
	    "orm": {
		    "base": "{root-path}",
		    "targets": [
			    "{one-for-each-schema}"
			]
		},
		"routes": {
			"base": "{root-path}",
			"targets": [
				"{one-for-each-schema}"
			]
		}
	}
}
```

node-npa will not make assumptions on these parameters.

Here is an example on how to use it:

```js
var npa 	= require('npa')();
var entityMngr  = npa.getEntityManager();
```
-- or --

```js
var npa 	= require('npa');
var entityMngr  = npa().getEntityManager('{optional-config-name}');
```

If the {optional-config-name} is not supplied, the first configuration is assumed.

## Todo

* Move all statements to a transaction model.
* Full node-mysql support in a JPA fashion.