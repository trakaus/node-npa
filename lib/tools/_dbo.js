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
						rgcols.push( new utils.Column(cols[ndx].type, cols[ndx].name, cols[ndx].isKey) );
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
		
		this.init = function( tableAsGenericObject ) {
			// make sure the object that was passed in, has the same number of elements
			// as our table.columns Array.
			tableAsGenericObject = utils.canonicalize( tableAsGenericObject, this.table.columns );
			
			utils.bind( this, tableAsGenericObject, this.table.columns );
		}
	} else {
		return new _dbo(tableName, fields, tablePrimaryKey);
	}
}

//
// now that we have our constructor, build our prototype
_dbo.prototype = {
	constructor: _dbo,
	
	toSimpleObject: function( ) {
		var object = {};
		for(var property in this) {
			if( typeof(this[property]) == 'number' ||
				typeof(this[property]) == 'string' ||
				typeof(this[property]) == 'boolean'||
				typeof(this[property]) == 'object') {
				Object.defineProperty( object, property, {
					value: this[property],
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