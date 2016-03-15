// lib/tools/__schema_column.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
require('./_ecma262_Array_from_Polyfill');

function newOperator() {
	var userDefinedObject = null;
	if (arguments.length >= 1) {
		userDefinedObject = arguments[0];
	}
	
	else {
		return null;
	}
	
	return new (Function.prototype.bind.apply(userDefinedObject, (arguments.length > 1 ? Array.from(arguments).slice(1) : [])));
    // or even
    // return new (Cls.bind.apply(Cls, arguments));
    // if you know that Cls.bind has not been overwritten
}

function ForeignKey( ) {
	if( this instanceof ForeignKey ) {
		this.isLinked = (arguments.length == 2 && 
					arguments[0] !== null && arguments[0] !== undefined && 
					arguments[1] !== null && arguments[1] !== undefined );
		this.sourceTable = {
			name: (arguments.length >= 1 ? arguments[0] : null), // -- sourceTableName,
			column: (arguments.length >= 2 ? arguments[1] : null) // -- sourceColumnName
		}
	}
	
	else {
		return newOperator(ForeignKey, arguments);
	}
}

function PrimaryKey( ) {
	if( this instanceof PrimaryKey ) {
		this.isOne = (arguments.length >= 1 ? arguments[0] : false);
		this.autoGenerate = (arguments.length >= 2 ? arguments[1] : this.isOne);
	}
	
	else {
		return newOperator(PrimaryKey, arguments);
	}
}

function __schema_column( type, name ) {
	this.type = type;
	this.name = name;
	this.primaryKey = new PrimaryKey(arguments.length == 2 ? false : arguments[2]); // -- param should be a single boolean.
	this.foreignKey = ForeignKey.apply(this, (arguments.length <= 3 ? [] : Array.from(arguments).slice(3))); // -- should have two(2) string params.
	this.enumValues = (arguments.length <= 6 ? [] : arguments[5]); // - param should be an array of string values.
	this.default = (arguments.length <= 7 ? null : arguments[6]); // - param should be a single object/value.
}

__schema_column.prototype = {
	constructor: __schema_column,
	
	toString: function() {
		return '' +
			'{\n' +
			'\t"name":"' + this.name + '",\n' +
			'\t"type":"' + this.type.name + '",\n' +
			'\t"primaryKey": {\n' +
			'\t\t"isOne": ' + (this.primaryKey.isOne ? 'true' : 'false') + ',\n' + 
			'\t\t"autoGenerate": ' + (this.primaryKey.autoGenerate ? 'true' : 'false') + ',\n' + 
			'\t},\n' +
			'\t"foreignKey": {\n' +
			'\t\t"isLinked": ' + (this.foreignKey.isLinked ? 'true' : 'false') + ',\n' + 
			'\t\t"sourceTable":{\n' + 
			'\t\t\t"name": "' + (this.foreignKey.sourceTable.name ? this.foreignKey.sourceTable.name : '') + '",\n' + 
			'\t\t\t"column": "' + (this.foreignKey.sourceTable.column ? this.foreignKey.sourceTable.column : '') + '"\n' + 
			'\t\t}\n' +
			'\t}\n' +
			'}';
	}
}

module.exports = __schema_column;