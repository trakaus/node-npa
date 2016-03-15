// lib/tools/__schema_table.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
var SchemaColumn = require('./__schema_column');

function __schema_table() {
	this.name = (arguments.length >= 1 ? arguments[0] : '');
	this.keys = {
		primary: [],
		foreign: []
	};
	this.columns = [];
}

__schema_table.prototype = {
	constructor: __schema_table,
	
	addColumn: function( type, name, isPrimaryKey, foreignColumnSource, foreignColumn, enumValues, defaultValue ) {
		var schemaColumn = new SchemaColumn(type, name, isPrimaryKey, 
											foreignColumnSource, foreignColumn, 
											enumValues, defaultValue);
		
		this.columns.push(schemaColumn);
		if(isPrimaryKey) {
			this.keys.primary.push(name);
		}
		
		if(foreignColumn) {
			this.keys.foreign.push(foreignColumn);
		}
		
		return schemaColumn;
	},
	
	toString: function() {
		//
		// primary fields string.
		var primaryFlds = '';
		for(var ndx=0;ndx<this.keys.primary.length;ndx++) {
			primaryFlds+= (ndx > 0 ? ',\n' : '') + '\t\t\t"' + this.keys.primary[ndx] + '"';
		}
		primaryFlds+= (primaryFlds.length > 0 ? '\n' : '');
		
		//
		// foreign fields string.
		var foreignFlds = '';
		for(var ndx=0;ndx<this.keys.foreign.length;ndx++) {
			foreignFlds+= (ndx > 0 ? ',\n' : '') + '\t\t\t"' + this.keys.foreign[ndx] + '"';
		}
		foreignFlds+= (foreignFlds.length > 0 ? '\n' : '');
		
		//
		// column string
		var fields = '';
		for(var ndx=0;ndx<this.columns.length;ndx++) {
			fields+= (ndx > 0 ? ',' : '') + this.columns[ndx].toString();
		}
		fields+= (fields.length > 0 ? '\n' : '');
		
		return '{\n' +
			'\t"name": "' + this.name + '",\n' +
			'\t"keys": {\n' +
			'\t\t"primary": [\n' + 
			primaryFlds +
			'\t\t],\n' + 
			'\t\t"foreign": [\n' +
			foreignFlds +
			'\t\t]\n' + 
			'\t},\n' +
			'\t"columns": [\n' +
			fields +
			'\t]\n' +
			'}';
	}
}

module.exports = __schema_table;