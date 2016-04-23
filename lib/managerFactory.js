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

var path = require('path');
var mkdirp = require('mkdirp');
var config = require('config');
var Map = require(path.join(__dirname,'tools','Map'));

var ManagerForMysql 	= require(path.join(__dirname,'managers','ManagerForMysql'));
var ManagerForPostgress = require(path.join(__dirname,'managers','ManagerForPostgress'));

function NpaException(message) {
	this.message = message;
	this.name = 'NpaException';
}

function confirmPathExistsOrCreate( requestedPath ) {
	if(requestedPath && requestedPath.length) {
		mkdirp(requestedPath);
	}
	
	else {
		throw new NpaException('The given path [' + requestedPath + '] could not be created.');
	}
}

function ConnectionParams( databaseConnectParams ) {
	this.name = databaseConnectParams.name,
	this.type = databaseConnectParams.type,
	this.host = databaseConnectParams.host,
	this.user = databaseConnectParams.user,
	this.port = databaseConnectParams.port,
	this.password = databaseConnectParams.pwd,
	this.database = databaseConnectParams.db,
	this.useDebugMode = databaseConnectParams.debug
}

module.exports = {
	configurations: config.get('connectors.schemas'),
	
	connectParams: null,
	
	paths: {
		orm: {
			target: null
		},
		
		routes: null
	},
	
	swapConfig: function( configNameOrIndex ) {

		var connectors = config.get('connectors.schemas');
		var targetConfig = null;
		var targetIndex = -1;
		if(isNaN(parseInt(configNameOrIndex))) {
			for(var ndx=0;ndx < connectors.length;ndx++) {
				if(connectors[ndx].name == configNameOrIndex) {
					targetIndex = ndx;
					targetConfig = connectors[ndx];
					break;
				}
			}
		}
		
		else if(parseInt(configNameOrIndex) < connectors.length) {
			targetIndex = parseInt(configNameOrIndex);
			targetConfig = connectors[configNameOrIndex];
		}
		
		if(targetIndex < 0) {
			throw new NpaException('Configuration [' + configNameOrIndex + '] could not be found.');
		}

		
		//
		// load the paths and targets
		this.paths.orm.target = path.join(config.get('paths.orm.base'), 
							(config.get('paths.orm.targets')[targetIndex] ? 
								config.get('paths.orm.targets')[targetIndex] : 
								confirmPathExistsOrCreate( path.join(process.cwd(), new String(targetIndex), 'schema' ))));
		
		this.paths.routes = path.join(config.get('paths.routes.base'), 
							(config.get('paths.routes.targets')[targetIndex] ?
								config.get('paths.routes.targets')[targetIndex] :
								confirmPathExistsOrCreate( path.join(process.cwd(), new String(targetIndex), 'routes' ))));
								
		this.connectParams = new ConnectionParams( targetConfig );
		

		//
		// return the manager
		var manager = this.managers.get(targetConfig.name);
		if(manager)
			return manager;
		
		//
		// create the new managed connection and return it.
		return this.factory( );
	},
	
	engines: {
		mysql: 'mysql',
		postgress: 'postgress'
	},
	
	managers: new Map(),
	
	factory: function( ) {
		var manager = this.managers.get(this.connectParams.name);
		if(manager === undefined) {
			switch( this.connectParams.type ) {
				case this.engines.mysql: {
					manager = new ManagerForMysql(this.connectParams);
					this.managers.put( this.connectParams.name, manager );
				} break;
				
				case this.engines.postrgress: {
					manager = new ManagerForPostgress(this.connectParams);
					this.managers.put( this.connectParams.name, manager );
				} break;
				
				default: manager = undefined;
			}
		}

		return manager;
	},
	
	getSchemaManager: function( ) {
		var params = 0;
		if( arguments.length >= 1 ) {
			params = arguments[0];
		}

		if(params !== undefined)
			return this.swapConfig( params );
		else
			return this.swapConfig( 0 );
	},
};