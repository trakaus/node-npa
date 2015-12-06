// lib/managers/ManagerForMysql.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]

var pool = null;
var mysql = require('mysql');
var utils = require('../tools/_utils');
var inDebugMode = false;

function SchemaManagerForMysql( connParams ) {
	if(null == pool) {
		pool = mysql.createPool({
			host: connParams.host,
			user: connParams.user,
			port: connParams.port,
			password: connParams.password,
			database: connParams.database
		});
		
		inDebugMode = connParams.useDebugMode;
	}
}

function displaySQLSyntax( syntax, values ) {
	if( inDebugMode ) {
		console.log('\nexecuting query:\n------------------------');
		console.log(syntax);
		if (values !== undefined && values !== null) console.log(values);
		console.log('------------------------\n\n');
	}
}

SchemaManagerForMysql.prototype = {
	utils: utils,
	
	release: function( ) {
		if(null != pool) {
			pool.end(function(err) {
				if( err ) {
					console.error('ManagerForMysql::release:Error - ',err);
				}
				
				pool = null;
			});		
		}
	},
	
	fetch: function( type, id, callback ) {
		pool.getConnection(function(err, conn) {
			if(err) {
				if(!callback) {
					console.error('ManagerForMysql::fetch:Error - ',err);
				} else {
					callback(err);
				}
				
				return;
			}
			
			var syntax = utils.select(type, 't0') + ' ' +			
						 utils.where(type, 't0', [new utils.Criterion(type.table.keys.primary[0], id)]);
			displaySQLSyntax( syntax );
			
			conn.query(syntax, [id], function(err, rows) {
				conn.release();
				
				callback(err, rows);
			});
		});
	},
	
	fetchAll: function( type, callback ) {
		pool.getConnection(function(err, conn) {
			if(err) {
				if(!callback) {
					console.error('ManagerForMysql::fetchAll:Error - ',err);
				} else {
					callback(err);
				}
				
				return;
			}
			
			var syntax = utils.select(type, 't0');
			displaySQLSyntax( syntax );
			
			conn.query(syntax, null, function(err, rows) {
				conn.release();
				
				callback(err, rows);
			});
		});
	},
	
	persist: function( type, object, callback ) {
		pool.getConnection(function(err, conn) {
			if(err) {
				if(!callback) {
					console.error('ManagerForMysql::persist:Error - ',err);
				} else {
					callback(err);
				}
				
				return;
			}
			
			var values = [];
			for(var key in object) {
				// if the object has a table definition or function, ignore the key.
				if(key == 'table') continue;
				if(typeof object[key] == 'function') continue;
				values.push(object[key]);
			}
			
			var syntax = utils.insert(type);
			displaySQLSyntax( syntax, values );
			
			conn.query(syntax, values, function(err, rows) {
				conn.release();
				
				callback(err, rows);
			});
		});
	},
	
	merge: function( type, object, callback ) {
		pool.getConnection(function(err, conn) {
			if(err) {
				if(!callback) {
					console.error('ManagerForMysql::merge:Error - ',err);
				} else {
					callback(err);
				}
				
				return;
			}
			
			var criteria = [];
			for(var key in object) {
				// if the object has a table definition or function or is null, ignore the key.
				if(key == 'table') continue;
				if(typeof object[key] == 'function') continue;
				if(object[key] == null) continue;

				criteria.push(new utils.Criterion(key, object[key]));
			}
			
			var syntax = utils.update(type, 't0', criteria);
			// now pull the values from the final criteria array
			var values = [];
			var keyValues = [];
			for(var ndx=0;ndx<criteria.length;ndx++) {
				if(type.table.keys.primary[0] == criteria[ndx].name)
					keyValues.push(criteria[ndx].value);
				else
					values.push(criteria[ndx].value);
			}
			
			if(keyValues.length > 0)
				values = values.concat(keyValues);
			
			displaySQLSyntax( syntax, values );
			
			conn.query(syntax, values, function(err, rows) {
				conn.release();
				
				callback(err, rows);
			});
		});
	},

	customQuery: function( syntax, values, callback ) {
		pool.getConnection(function(err, conn) {
			if(err) {
				if(!callback) {
					console.error('ManagerForMysql::customQuery:Error - ',err);
				} else {
					callback(err);
				}
				
				return;
			}
			
			displaySQLSyntax( syntax );
			
			conn.query(syntax, values, function(err, rows) {
				conn.release();
				
				callback(err, rows);
			});
		});
	}
};

module.exports = SchemaManagerForMysql;