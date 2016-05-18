// lib/generators/orm-mysql.js
// @author: Ryan Walker [ryan.walker@lazarussoftware.com]
/**
 * orm-mysql:
 *
 * constructs an object that represents a given set of tables defined
 * within the specified database.
 *
 * usage:
 * node npa/lib/generators/orm-mysql.js
 *
 * released: 04/20/2014 @ 20:15
 */
var fs = require('fs');
var mkdirp = require('mkdirp');
var factory = require('../managerFactory');
var SchemaTable = require('../tools/__schema_table');
var schemaTables = [];
var tblNdx = -1;

var em = null;
var nxtConfigNdx = 0;
var nxtTableNdx = 0;
var tableEntryLoop = 0;
var maxTableEntries = 0;
var tables = [];
function nextConfiguration( ) {
	console.log('Index: ', nxtConfigNdx+1, ' of ', factory.configurations.length);
	
	if(factory.configurations && 
	   factory.configurations.length && 
	   (factory.configurations.length > nxtConfigNdx)) {

		em = factory.getSchemaManager( nxtConfigNdx++ );
		em.customQuery("show tables;", null, function(err, results) {
			if(err) console.error(err);
			else {
				tableEntryLoop = 0;
				maxTableEntries = results.length;
				tables = results;
				nxtTableNdx = 0;
				ee.emit('npa.orm.next');
			}
		});
	}

	else {
		em = null;
	}
	
	return em;
}

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

		case 'blob':
		case 'longblob':
		case 'mediumblob':
		case 'tinyblob': 
		case 'varbinary': {
			return 'Buffer';
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

var EventEmitter = require('events').EventEmitter;
var ee = new EventEmitter();
ee.on('npa.orm.next', function( ) {
	var tbldefn = tables[nxtTableNdx++];
	for(var key in tbldefn) {
		ee.emit('npa.orm.file.create', tbldefn[key]);
		break;
	}
});

ee.on('npa.orm.file.ready', function( ormEntry ) {
	fs.writeFile( ormEntry.filename,
				ormEntry.content,
				{encoding:'utf8',mode:438,flag:'w'},
				function(err) {
					if(err) console.error(err);
					else console.log(ormEntry.filename + ' was written.');
					
					tableEntryLoop++;
					if(tableEntryLoop == maxTableEntries) {
						ee.emit('npa.orm.done');
					}
					
					else {
						ee.emit('npa.orm.next');
					}
				});
});

ee.on('npa.orm.file.create', function( tableName ) {
	var fs = require('fs');
	try {
	    // Query the entry
	    stats = fs.lstatSync(factory.paths.orm.target);
	
	    // Is it a directory?
	    if (stats.isDirectory()) {
	        // Yes it is
	    }
	} catch (e) {
	    // ...
	    console.log('Path exception: assumed path does not exist.\nAttempting to create ['+factory.paths.orm.target+']...\n');
	    mkdirp(factory.paths.orm.target);
	}

	em.customQuery("show columns from " + tableName, null, function(err, fields) {
		if(err) console.error(err);
		else {
			schemaTables.push( new SchemaTable(tableName) );
			tblNdx+= 1;
			
			var path = require('path');
			var filename = path.join(factory.paths.orm.target, tableName.toInitialCaps() + '.js');
			var localpath = (filename.lastIndexOf('lib') > 0 ? filename.substr( filename.lastIndexOf('lib') - 1 ) : filename);
			
			var fileContents = '// ' + localpath + '\n';
			fileContents += '// @author: Lazarus Software NodeJS ORM Generator\n';
			fileContents += 'var em = require(\'npa\')().getEntityManager("'+factory.connectParams.name+'");\n';
			fileContents += 'var dbo = em.core.dbo;\n';
			fileContents += 'var utils = em.utils;\n\n';
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
							(fields[fndx].Key == 'PRI' ? ', true),':'),') + '\n';
				
				var hasEnumValues = false;
				var enumValues = [];
				if(/^enum*/.test(fields[fndx].Type)) {
					enumValues = fields[fndx].Type.replace('enum(\'','').replace('\')','').split("','");
				}
				
				schemaTables[tblNdx].addColumn( jsType(fields[fndx].Type), 		// - field type
												fields[fndx].Field, 			// - field name
												(fields[fndx].Key == 'PRI' ? true : false), // - field is primary key
												'', // - field foreign key table
												'', // - field foreign key column
												enumValues, // - field has enum values
												fields[fndx].Default			// - field's default value
												);
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

ee.on('npa.orm.done', function( ) {
	var schemaFile = {
		"schema" : {
			"name": factory.connectParams.database,
			"tables": []
		}
	}
	
	for(var ndx=0;ndx<schemaTables.length;ndx++) {
		schemaFile.schema.tables.push(schemaTables[ndx]);
	}
	
	//
	// -- write the schema in json form for managing other items.
	var path = require('path');
	var filename = path.join(factory.paths.orm.target, 'schema.json');
	var localpath = (filename.lastIndexOf('lib') > 0 ? filename.substr( filename.lastIndexOf('lib') - 1 ) : filename);
	fs.writeFileSync( filename, JSON.stringify(schemaFile,null,'\t'), {encoding:'utf8',mode:438,flag:'w'} );
	console.log('Schema ' + filename + ' was written.');
	
	if(!nextConfiguration( )) {
		console.log('All configurations have been processed.');
		
		process.exit(0);
	}
});

nextConfiguration();
