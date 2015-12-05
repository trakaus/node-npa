// lib/generators/orm-mysql.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
/**
 * orm-mysql:
 *
 * constructs an object that represents a given set of tables defined
 * within the specified database.
 *
 * usage:
 * node npa-mysql/lib/generators/orm-mysql.js
 *
 * released: 04/20/2014 @ 20:15
 */
var factory = require('../managerFactory');
var em = factory.getSchemaManager(factory.engines.mysql);

function jsType( mySqlType ) {
	mySqlType = mySqlType.replace(/[^a-z]/g,'');
	switch(mySqlType) {
		
		case 'bit': {
			return 'Boolean';
		}
		
		case 'int':
		case 'bigint':
		case 'tinyint':
		case 'smallint':
		case 'mediumint':
		case 'integer':
		case 'decimal':
		case 'numeric':
		case 'float':
		case 'double': {
			return 'Number';
		}
		
		case 'date':
		case 'datetime':
		case 'timestamp': {
			return 'Date';
		}
		
		case /^enum*/.test(mySqlType): {
			return 'String';
		}

		default: {
			return 'String';
		}
	}
}

function OrmEntry( filename, contents ) {
	this.filename = filename;
	this.content = contents;
}

var maxTableEntries = 0;
var tableEntryLoop = 0;
var EventEmitter = require('events').EventEmitter;
var ee = new EventEmitter();
ee.on('npa.orm.file.ready', function( ormEntry ) {
	var fs = require('fs');
	fs.writeFile( ormEntry.filename,
				ormEntry.content,
				{encoding:'utf8',mode:438,flag:'w'},
				function(err) {
					if(err) console.error(err);
					else console.log(ormEntry.filename + ' was written.');
					
					tableEntryLoop++;
					if(tableEntryLoop == maxTableEntries) {
						ee.emit('npa.orm.done',true);
					}
				});
});

ee.on('npa.orm.file.create', function( tableName ) {
	em.customQuery("show columns from " + tableName, null, function(err, fields) {
		if(err) console.error(err);
		else {
			var path = require('path');
			var filename = path.join(__dirname, '../..', 'tables') + '/' + tableName + '.js';
			var localpath = (filename.lastIndexOf('lib') > 0 ? filename.substr( filename.lastIndexOf('lib') - 1 ) : filename);
			
			var fileContents = '// ' + localpath + '\n';
			fileContents += '// @author: Lazarus Software NodeJS ORM Generator\n';
			fileContents += 'var dbo = require(\'../managers/_dbo\');\n';
			fileContents += 'var utils = require(\'../managers/_utils\');\n\n';
			fileContents += 'function ' + tableName + '( ) {\n';

			fileContents += '\tdbo.call(this, \'' + tableName + '\',\n';
			var keys = [];
			for(var fndx=0;fndx<fields.length;fndx++) {
				var prefix = '\t\t ';
				if(fndx == 0) prefix = '\t\t[';
				
				if(fields[fndx].Key == 'PRI')
					keys.push(fields[fndx].Field);
				
				fileContents += prefix + 'new utils.Column(' + jsType(fields[fndx].Type) + ', ' +
							'\'' + fields[fndx].Field + '\'' + 
							(fields[fndx].Key == 'PRI' ? ',true),':'),') + '\n';
			}
			
			fileContents += '\t\t],\n\t\t\'' + keys[0] + '\');\n';
			fileContents += '\tthis.init((arguments.length == 1 ? arguments[0] : {}));\n';
			fileContents += '}\n\n' + tableName + '.prototype = Object.create(dbo.prototype, {\n';
			fileContents += '\tconstructor: {\n';
			fileContents += '\t\tconfigurable: true,\n';
			fileContents += '\t\tenumerable: true,\n';
			fileContents += '\t\tvalue: ' + tableName + ',\n';
			fileContents += '\t\twritable: false\n';
			fileContents += '\t}\n});\n\nmodule.exports = ' + tableName + ';\n';
			
			ee.emit( 'npa.orm.file.ready', new OrmEntry(filename, fileContents) );
		}
	});
});

ee.on('npa.orm.done', function( hasCompleted ) {
	process.exit(0);
});

em.customQuery("show tables;", null, function(err, results) {
	if(err) console.error(err);
	else {
		maxTableEntries = results.length;
		for(var ndx=0;ndx<results.length;ndx++) {
			var tbldefn = results[ndx];
			for(var key in tbldefn) {
				ee.emit('npa.orm.file.create', tbldefn[key]);
				break;
			}
		}
	}
});