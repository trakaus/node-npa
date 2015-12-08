// lib/schema/managerFactory.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]

/**
 * The point of this class is to encapsulate common task that are completed 
 * repeatedly by several database objects. The notion is to provide a
 * base object like java's JPA library to handle most datbase operations
 * to eliminate hand-coding sql statements.
 */
if (!String.prototype.trim) {
   //code for trim
	String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
	String.prototype.ltrim=function(){return this.replace(/^\s+/,'');};
	String.prototype.rtrim=function(){return this.replace(/\s+$/,'');};
	String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');};
}

String.prototype.toCamelCase = function() {
    return this.replace(/^([A-Z])|\s(\w)/g, function(match, p1, p2, offset) {
        if (p2) return p2.toUpperCase();
        return p1.toLowerCase();        
    });
};
	
String.prototype.toInitialCase = function() {
	var parts = this.toLowerCase().split(' ').map(function(e) {
		return e.substr(0, 1).toUpperCase() + e.substr(1);
	});
	return parts.join(' ');
};

var ManagerForMysql 	= require('./managers/ManagerForMysql');
var ManagerForPostgress = require('./managers/ManagerForPostgress');
var config = require('config');
var dbparams = config.get('connectors.schema');
var Map = require('./tools/Map');

module.exports = {
	connectParams: {
		host: dbparams.host,
		user: dbparams.user,
		port: dbparams.port,
		password: dbparams.pwd,
		database: dbparams.db,
		useDebugMode: dbparams.debug
	},
	
	paths: {
		orm: {
			target: (config.get('paths.orm.target') ? 
					 	config.get('paths.orm.target') : 
					 	'/tmp/node-npa/schema')
		},
		
		routes: (config.get('paths.routes') ?
					config.get('paths.routes') :
					'/tmp/node-npa/routes')
	},
	
	engines: {
		mysql: 'mysql',
		postgress: 'postgress'
	},
	
	managers: new Map(),
	
	getSchemaManager: function( databaseEngine ) {
		var params = this.connectParams;
		if( arguments.length == 2 ) {
			params = arguments[1];
		}
		
		var manager = undefined;
		switch( databaseEngine ) {
			case this.engines.mysql: {
				manager = this.managers.get(this.engines.mysql);
				if (manager === undefined) {
					manager = new ManagerForMysql(params);
					this.managers.put( this.engines.mysql, manager );
				}
			} break;
			
			case this.engines.postrgress: {
				return new ManagerForPostgress(params);
				manager = this.managers.get(this.engines.postrgress);
				if (manager === undefined) {
					manager = new ManagerForPostgress(params);
					this.managers.put( this.engines.postrgress, manager );
				}
			} break;
			
			default: manager = undefined;
		}

		return manager;
	}	
};