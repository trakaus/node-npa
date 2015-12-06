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

var ManagerForMysql 	= require('./managers/ManagerForMysql');
var ManagerForPostgress = require('./managers/ManagerForPostgress');
var config = require('config').get('connectors.schema');

module.exports = {
	connectParams: {
		host: config.host,
		user: config.user,
		port: config.port,
		password: config.pwd,
		database: config.db,
		useDebugMode: config.debug
	},
	
	paths: {
		orm: {
			target: (config.paths && 
					 config.paths.orm && 
					 config.paths.orm.target ? 
					 	config.paths.orm.target : 
					 	'/tmp/node-npa/schema')
		}
	},
	
	engines: {
		mysql: 'mysql',
		postgress: 'postgress'
	},
	
	getSchemaManager: function( databaseEngine ) {
		var params = this.connectParams;
		if( arguments.length == 2 ) {
			params = arguments[1];
		}
		
		switch( databaseEngine ) {
			case this.engines.mysql: {
				return new ManagerForMysql(params);
			} break;
			
			case this.engines.postrgress: {
				return new ManagerForPostgress(params);
			} break;
			
			default: return undefined;
		}
	}	
};