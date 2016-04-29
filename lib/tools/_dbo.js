// lib/tools/_dbo.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
var utils = require('./_utils');

//
// define our constructor
function _dbo( tableName, fields, tablePrimaryKey ) {
	if( this instanceof _dbo ) {
		this.table = {
			name: tableName,
			keys: {
				primary: [tablePrimaryKey],
				foreign: []
			},
			columns: (function(cols) {
				// copy the field definitions
				if( !(cols instanceof Array) ) {
					return new Error('fields must exists as an array of _utils.column definitions!');
				} else {
					//
					// make a copy of the fields array, we do not want to link directly
					// to the same array.
					var rgcols = [];
					for(var ndx=0;ndx<fields.length;ndx++) {
						rgcols.push( new utils.Column(cols[ndx].type, cols[ndx].name, cols[ndx].primaryKey.isOne) );
					}
					
					return rgcols.sort(function(colOne, colTwo) {
									if (colOne.name > colTwo.name)
									  return 1;
									if (colOne.name < colTwo.name)
									  return -1;
									// colOne must be equal to colTwo
									return 0;
    							});
				}
			}(fields)),
		};
		
	} else {
		return new _dbo(tableName, fields, tablePrimaryKey);
	}
}

//
// now that we have our constructor, build our prototype
_dbo.prototype = {
	constructor: _dbo,
	
	init: function( tableAsGenericObject ) {
		// make sure the object that was passed in, has the same number of elements
		// as our table.columns Array.
		tableAsGenericObject = utils.canonicalize( tableAsGenericObject, this.table.columns );
		
		utils.bind( this, tableAsGenericObject, this.table.columns );
	},
	
	hasColumn: function( columnNameToFind ) {
		return utils.findColumnByName( columnNameToFind, this.table.columns );
	},
	
	//
	// validate that the source object is the same type this.
	mutate: function( srcObject ) {
		if( srcObject && srcObject.table && srcObject.table.name === this.table.name && srcObject.table.values ) {
			for(var property in srcObject.table.values) {
				switch(property) {
					case 'createdBy':
					case 'createdOn':
					case 'modifiedBy':
						continue;
						
					case 'modifiedOn':
						this.table.values[property] = new Date();
						break;
						
					case 'recordState':
						continue;
					
					default:
						this.table.values[property] = srcObject.table.values[property];
						break;
				}
			}
		}
	}, 
	
	toSimpleObject: function( ) {
		var object = {};
		for(var property in this) {
			if( typeof(this[property]) == 'number' ||
				typeof(this[property]) == 'string' ||
				typeof(this[property]) == 'boolean'||
				(this[property] instanceof Buffer) ||
				(this[property] instanceof Date)) {
				
				var objectValue = this[property];
				if( objectValue instanceof Buffer ) objectValue = this[property].toString('HEX');
				else if( objectValue instanceof Date ) objectValue = this[property].toMysqlDateTime();
				
				Object.defineProperty( object, property, {
					value: objectValue,
					writable : true,
					enumerable : true,
					configurable : true
				});
			}
		}
		
		return object;
	}
}

module.exports = _dbo;