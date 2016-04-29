// lib/managers/ManagerForMysql.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]

var mysql = require('mysql');
var dbo = require('../tools/_dbo');
var utils = require('../tools/_utils');


function SchemaManagerForMysql( connParams ) {
	if( this instanceof SchemaManagerForMysql ) {
		if(null == this.pool) {
			this.pool = mysql.createPool({
				host: connParams.host,
				user: connParams.user,
				port: connParams.port,
				password: connParams.password,
				database: connParams.database,
				timezone: 'UTC',
				dateStrings: true
			});
			
		}
		
		this.inDebugMode = connParams.useDebugMode;
	}
	
	else {
		return new SchemaManagerForMysql(connParams);
	}
}

SchemaManagerForMysql.prototype = Object.create(Object.prototype, {
	constructor: {
		configurable: true,
		enumerable: true,
		value: SchemaManagerForMysql,
		writable: true
	}
})

SchemaManagerForMysql.prototype.core = { dbo:dbo }
SchemaManagerForMysql.prototype.utils = utils;

SchemaManagerForMysql.prototype.displaySQLSyntax = function ( syntax, values ) {
	if( this.inDebugMode ) {
		console.log('\nexecuting query:\n------------------------');
		console.log(syntax);
		if (values !== undefined && values !== null) console.log(values);
		console.log('------------------------\n\n');
	}
}
		
SchemaManagerForMysql.prototype.release = function( ) {
	var closure = this;
	if(null != this.pool) {
		this.pool.end(function(err) {
			if( err ) {
				console.error('ManagerForMysql::release:Error - ',err);
			}
			
			closure.pool = null;
		});		
	}
}
	
SchemaManagerForMysql.prototype.fetch = function( type, id, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::fetch:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		var column = utils.findColumnByName(type.table.keys.primary[0], type.table.columns);
		var syntax = utils.select(type, 't0') + ' ' +			
					 utils.where(type, 't0', [new utils.Criterion(type.table.keys.primary[0], (column && column.type.name == 'Buffer' ? new Buffer(id,'HEX') : id))]);
		closure.displaySQLSyntax( syntax );
		
		conn.query(syntax, [id], function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
}
	
SchemaManagerForMysql.prototype.fetchByParams = function( type, params, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::fetchByParams:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		var criteria = [];
		var values = [];

		if(Object.keys(params).length) {
			for(var key in params) {
				var objCol = type.hasColumn(key);
				if(objCol) {
					var qryEntry = (objCol.type.name == "Buffer" ? 
						new utils.Criterion(objCol.name, new Buffer(params[key],"HEX")) : 
						(params[key].indexOf('%') > -1 ? 
							new utils.Criterion(objCol.name, "%"+params[key]+"%","AND","LIKE") :
							new utils.Criterion(objCol.name, params[key])));
					values.push(qryEntry.value);
					criteria.push(qryEntry);
				}
			}

		}

		var syntax = utils.select(type, 't0');
		if(criteria.length)
			syntax += " " + utils.where(type, "t0", criteria);
		// syntax += (sortOptions.length > 0 ? " order by " + sortOptions : "");
		closure.displaySQLSyntax( syntax );
		
		conn.query(syntax, values, function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
}
	
SchemaManagerForMysql.prototype.fetchAll = function( type, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::fetchAll:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		var syntax = utils.select(type, 't0');
		closure.displaySQLSyntax( syntax );
		
		conn.query(syntax, null, function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
}
	
SchemaManagerForMysql.prototype.persist = function( type, object, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::persist:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		var keyInfo = {
			hasPrimaryKey: false,
			columnDefn: null,
			columnValue: null
		};
		
		//
		// autogenerate a unique identifier for the user.
		var values = [];
	    type.table.columns.forEach(function(currentValue, index, source) {
			if(currentValue) {

				if(currentValue.name == type.table.keys.primary[0] && 
					(object[currentValue.name] === null || object[currentValue.name] === undefined) &&
					currentValue.type.name == 'Buffer') {

					object[type.table.keys.primary[0]] = (new Buffer(utils.generateUUID().replace(/\-/g,''),"HEX")).toString('hex')

					keyInfo.hasPrimaryKey = true;
					keyInfo.columnDefn = currentValue;
					keyInfo.columnValue = object[type.table.keys.primary[0]];
				}
				
				//
				// process the data value into expected format.
				values.push((new utils.Criterion(currentValue.name, object[currentValue.name])).value);
			}
		});
		
		var syntax = utils.insert(object);
		closure.displaySQLSyntax( syntax, values );
		
		conn.query(syntax, values, function(err, rows) {
			if(!err && keyInfo.columnDefn) {
				if(keyInfo.columnDefn.type.name == 'Buffer')
					rows.insertId = keyInfo.columnValue;
			}
						
			conn.release();
			
			callback(err, rows);
		});
	});
}

SchemaManagerForMysql.prototype.merge = function( type, object, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
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
		
		closure.displaySQLSyntax( syntax, values );
		
		conn.query(syntax, values, function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
}
	
SchemaManagerForMysql.prototype.purge = function( type, id, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::purge:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		var syntax = 'DELETE FROM ' + type.table.name + ' ';
		syntax += utils.where(type, type.table.name, [new utils.Criterion(type.table.keys.primary[0], id)]);
		var values = [id];
		
		closure.displaySQLSyntax( syntax, values );
		
		conn.query(syntax, values, function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
	
}

SchemaManagerForMysql.prototype.customQuery = function( syntax, values, callback ) {
	var closure = this;
	this.pool.getConnection(function(err, conn) {
		if(err) {
			if(!callback) {
				console.error('ManagerForMysql::customQuery:Error - ',err);
			} else {
				callback(err);
			}
			
			return;
		}
		
		closure.displaySQLSyntax( syntax, values );
		
		conn.query(syntax, values, function(err, rows) {
			conn.release();
			
			callback(err, rows);
		});
	});
};

module.exports = SchemaManagerForMysql;