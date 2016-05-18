// lib/tools/_utils.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
require('./_ecma262_Array_from_Polyfill');

Date.prototype.toMysqlDateTime = function() {
	return this.toISOString().slice(0, 19).replace('T', ' ');
}

var columnClass = require('./__schema_column');

var uuid = null;

function extractValue( column, value ) {
	switch(column.type.name) {
		case 'Buffer': {
			return (value !== null ? new Buffer(value, 'HEX') : null);
		} break;
		
		case 'Date': {
			return (value !== null ? 
					(typeof value === 'string' ? value : value.toMysqlDateTime()) : 
					null);
		} break;
		
		case 'Number':
		case 'String':
		case 'Boolean': {
			return value;
		} break;
		
		default: {
			throw new Error('Invalid argument[' + value + '] assigned to ' + column.name + ' of type ' + column.type.name);
		}
	}
}
	
var __utils = {
	Column: columnClass,
	
	Item: function( column, value ) {
		this.column = column;
		this.value = extractValue( column, value );
	},
	
	Row: function( index, items ) {
		this.index = index;
		if( !(items instanceof Array) )
			throw new Error('Invalid argument[' + items + '] passed to row. Expected an Item[]!');
		this.items = items;
	},
	
	Criterion: function( name, value ) {
		this.name = name;
		if (Object.prototype.toString.call(value) === '[object Date]') {
			this.value = value.toMysqlDateTime();
		} else if(value instanceof Buffer) {
			this.value = value.toString('HEX');
		} else {
			this.value = value;
		}
		
		this.compare = (arguments.length < 3 ? 'AND' : arguments[2]);
		this.operator = (arguments.length < 4 ? '=' : arguments[3]);
	},
	
	// Functions =-=-=-=-=-=-=-=-
	generateUUID: function( ) {
		if(!uuid) {
			uuid = require('uuid');
		}
		
		return uuid.v1().toUpperCase();
	},
	
	findColumnByName: function( columnName, columns ) {
		for(var ndx=0;ndx<columns.length;ndx++) {
			if(columns[ndx].name === columnName) {
				return columns[ndx];
			}
		}
		
		return null;
	},
	
	sortObjectKeys: function( object ) {
		var sorted = {},
		key, properties = [];
		
		for (key in object) {
			if (object.hasOwnProperty(key)) {
				properties.push(key);
			}
		}
		
		properties.sort();
		
		for (key = 0; key < properties.length; key++) {
			sorted[properties[key]] = object[properties[key]];
		}
		
		return sorted;
	},
	
	canonicalize: function( data, columns ) {
		for(var ndx=0;ndx<columns.length;ndx++) {
			var column = columns[ndx];
			var wasFound = false;
			for(var property in data) {
				if(property === column.name) {
					wasFound = true;
					break;
				}
			}
			
			if( !wasFound ) {
				Object.defineProperty( data, column.name, { 
					value: (column.type == Number ? 0 : null),
					writable : true,
					enumerable : true,
					configurable : true
				});
			}
		}

		return __utils.sortObjectKeys(data);
	},
	
	bind: function( object, data, columns ) {
		var items = [];
		for(var property in data) {
			var column = __utils.findColumnByName( property, columns );
			if( column != null ) {
				var columnData = data[property];
				if (column.type && (column.type.name === 'Buffer') && columnData) {
					columnData = new Buffer(columnData, 'HEX');
				}
				
				// keep track of the item...
				items.push(new __utils.Item(column, columnData));
				
				// directly bind the value to the object.
				Object.defineProperty( object, property, {
					value: columnData,
					writable : true,
					enumerable : true,
					configurable : true
				});
			}
		}
		
		//
		// bind to the objects table namespace
		Object.defineProperty( object.table, 'values', {
			value: items,
			writable : true,
			enumerable : true,
			configurable : true
		});
		
		return object;
	},
	
	// Helper Functions =-=-=-=-=-
	// type is assumed to match the prototype of _dbo
	select: function( type, tbl_abbrev ) {
		var tbl = type.table.name;
		var cols = type.table.columns;
		var pkeys = type.table.keys.primary;
		var fkeys = type.table.keys.foreign;
		
		var syntax = 'SELECT ';
		for(var cndx=0;cndx<cols.length;cndx++) {
			syntax += (cndx > 0 ? ', ':'');

			var col = tbl_abbrev + '.' + 
					  cols[cndx].name ;

			syntax += (cols[cndx].type.name === 'Buffer' ?
						'HEX(' + col + ') AS ' + cols[cndx].name :
						col);
		}
		
		return syntax + ' FROM ' + tbl + ' ' + tbl_abbrev;
	},
	
	insert: function( type ) {
		var tbl = type.table.name;
		var cols = type.table.columns;
		var pkeys = type.table.keys.primary;
		var fkeys = type.table.keys.foreign;

		var values = 'VALUES(';
		var syntax = 'INSERT INTO ' + tbl + '(';
		for(var cndx=0;cndx<cols.length;cndx++) {
			syntax += (cndx > 0 ? ', ':'') + 
					  cols[cndx].name;
			values += (cndx > 0 ? ', ':'') +
						(cols[cndx].type.name === 'Buffer' ? ' UNHEX(?)' : ' ?');
		}
		
		return syntax + ') ' + values + ')';
	},
	
	update: function( type, tbl_abbrev, criteria ) {
		var tbl = type.table.name;
		var cols = type.table.columns;
		var pkeys = type.table.keys.primary;
		var fkeys = type.table.keys.foreign;
		
		var hasAtLeastOne = false;
		var syntax = 'UPDATE ' + tbl + ' ' + tbl_abbrev + ' SET ';
		for(var cndx=0;cndx<criteria.length;cndx++) {
			var column = __utils.findColumnByName(criteria[cndx].name, cols);
			if( column.primaryKey.isOne ) continue;

			syntax += (hasAtLeastOne ? ', ':'') + 
					  tbl_abbrev + '.' + 
					  criteria[cndx].name + ' ' +
					  criteria[cndx].operator + 
					  (column.type && column.type.name === 'Buffer' ? ' UNHEX(?)' : ' ?');
			hasAtLeastOne = true;
		}
		
		
		return syntax + ' ' + __utils.where(type, tbl_abbrev, criteria, true);
	},
	
	where: function( type, tbl_abbrev, criteria ) {
		if( !(criteria instanceof Array) ) {
			throw new Error('The criteria provided must be an Array of elments in the form {name:"name",value:"value"}.');
		}
		
		var keysOnly = false;
		if( arguments.length == 4 ) {
			keysOnly = arguments[3];
		}
		
		var isFirst = true;
		var syntax = 'WHERE ';
		var cols = type.table.columns;
		for(var ndx=0;ndx<criteria.length;ndx++) {
			var criterion = criteria[ndx];
			var fldFound = false;
			var fldNdx = 0;
			for(var cndx=0;cndx<cols.length;cndx++) {
				if(cols[cndx].name === criterion.name) {
					fldFound = true;
					fldNdx = cndx;
					break;
				}
			}
			
			if(!fldFound) {
				throw new Error('[' + criterion.name + '] is not apart of ' + type.table.name + '.');
			}
			
			if(keysOnly && !cols[fldNdx].primaryKey.isOne) continue;
			
			syntax += (isFirst ? '':' ' + criterion.compare + ' ') + 
						tbl_abbrev + '.' + cols[fldNdx].name + ' ' + criterion.operator + 
						(cols[fldNdx].type.name === 'Buffer' ? ' UNHEX(?)' : ' ?');
			isFirst = false;
		}

		return syntax;
	},
	
	join: {
		Builder: function() {
			var syntax = "";
			var tables =  	[];	// table entry {type, tbl_abbrev}
			var unions = 	[]; // linker entry {join_type, tbl_1_abbrev, tbl_1_column_name, tbl_2_abbrev, tbl_2_column_name}
								// join_type: JOIN, LEFT JOIN, ...
								// see mysql reference: http://dev.mysql.com/doc/refman/4.1/en/join.html
			var columns = 	[];	// column entry {tbl_abbrev, column_name, position}
			var criteria = 	[]; // criteria entry === Criterion (see above)
			
			function typeEntry( type, alias ) {
				this.type = type;
				this.alias = alias;
			}
			
			function unionEntry( joinType, aliasOne, aliasColOne, aliasTwo, aliasColTwo ) {
				this.join = joinType;
				
				this.left = {
					alias:aliasOne,
					column: aliasColOne
				};
				
				this.right = {
					alias: aliasTwo,
					column: aliasColTwo
				}
			}
			
			function selectEntry( alias, columnName, position ) {
				this.alias = alias;
				this.columnName = columnName;
				this.position = position;
			}
			
			return {
				addType: function( type, alias ) {
					tables[alias] = type;
				},
				
				addUsingCriteria: function( joinType, aliasOne, aliasColOne, aliasTwo, aliasColTwo ) {
					unions.push( new unionEntry(joinType, aliasOne, aliasColOne, aliasTwo, aliasColTwo))
				},
				
				addSelectColumn: function( alias, columnName ) {
					var position = (arguments.length == 3 && !isNaN(arguments[2]) ? 
						Number(arguments[2]) : columns.length);
					columns.push( new selectEntry(alias, columnName, position) );
				},
				
				addCriterion: function( alias, criterion ) {
					// need to move the utils based objects to their own files in order for this to work.
					// if( typeof criterion === this.Criterion ) {
						// add the alias that this criterion belongs to
						// remember this object is mutable!
						criterion.alias = alias; 

						criteria.push( criterion );
					// } else
					// 	throw new Error('InvalidArgument: join.addCriterion accepts objects of type utils.Criterion');
				},
				
				build: function() {
					// make sure we select the fields in the order the user
					// wants them to appear.
					columns.sort(function( ele1, ele2 ) {
						if(ele1.position > ele2.position)
							return -1;
						if(ele1.position < ele2.position)
							return 1;
						return 0;
					});
					
					syntax = 'SELECT ';
					for(var ndx=0;ndx<columns.length;ndx++) {
						syntax += (ndx > 0 ? ', ' : '') +
								  columns[ndx].alias + '.' + 
								  columns[ndx].columnName;
					}
					
					ndx = 0;
					syntax += ' FROM';
					var usedTables = [];
					for(ndx=0;ndx<unions.length;ndx++) {
						var wasLeftTableUsed = (usedTables.indexOf(tables[unions[ndx].left.alias].table.name.toLowerCase()) !== -1);
						var wasRightTableUsed = (usedTables.indexOf(tables[unions[ndx].right.alias].table.name.toLowerCase()) !== -1);
						
						syntax += ' ';
						
						// if neither table has been used, we are at
						// the beginning of the * Join statement.
						// therefore, use them both.
						if(!wasLeftTableUsed && !wasRightTableUsed) {
							syntax += tables[unions[ndx].left.alias].table.name  + ' ' + unions[ndx].left.alias  + ' ' + 
								unions[ndx].join + ' ' +
								tables[unions[ndx].right.alias].table.name + ' ' + unions[ndx].right.alias + ' ';
							
							usedTables.push(tables[unions[ndx].left.alias].table.name.toLowerCase());
							usedTables.push(tables[unions[ndx].right.alias].table.name.toLowerCase());
						}
						
						else if(!wasLeftTableUsed) {
							syntax += unions[ndx].join + ' ' +
								tables[unions[ndx].left.alias].table.name  + ' ' + unions[ndx].left.alias  + ' ';

							usedTables.push(tables[unions[ndx].left.alias].table.name.toLowerCase());
						}
						
						else if(!wasRightTableUsed) {
							syntax += unions[ndx].join + ' ' +
								tables[unions[ndx].right.alias].table.name + ' ' + unions[ndx].right.alias + ' ';

							usedTables.push(tables[unions[ndx].right.alias].table.name.toLowerCase());
						}

						syntax += 'ON ' + 
							unions[ndx].left.alias  + '.' + unions[ndx].left.column + 
							'=' +
							unions[ndx].right.alias + '.' + unions[ndx].right.column;
					}
					
					var values = [];
					var isFirst = true;
					if (criteria.length > 0) {
						syntax += ' WHERE ';
						for(var ndx=0;ndx<criteria.length;ndx++) {
							var column = __utils.findColumnByName( criteria[ndx].name, tables[criteria[ndx].alias].table.columns );
							if(column) {
								syntax += (isFirst ? '':' ' + criteria[ndx].compare + ' ') + 
									criteria[ndx].alias + '.' +
									criteria[ndx].name + ' ' +
									criteria[ndx].operator + ' ';
								
								if(criteria[ndx].operator === 'IN' && Array.isArray(criteria[ndx].value)) {
									syntax += '(';
									var wasFirst = true;
									for(var entry of criteria[ndx].value) {
										syntax += (wasFirst ? '' : ',');
										syntax += (column.type.name === 'Buffer' ?
											"UNHEX('" + entry.toString('HEX') + "')" : 
											(column.type.name === 'String' ?
												"'" + entry + "'" :
												entry));
										wasFirst = false;
									}
									syntax += ')';
								}
								
								else {
									syntax += (column.type.name === 'Buffer' ? 'UNHEX(?)' : '?');
									
									// format the value
									var value = extractValue(column, criteria[ndx].value);
									if(value instanceof Buffer) value = value.toString('HEX');
									values.push(value);
								}

								isFirst = false;
							}
						}
					}
					
					return { 'syntax': syntax, 'values': values };
				}
			};
			
		}
	}
};

module.exports = __utils;