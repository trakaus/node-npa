//#!/builder.js
// See if the user has setup their configuration correctly.

// Notes:
// Working With Guid's: http://lakenine.com/guid-values-as-primary-keys/
//
var fs 		= require('fs');
var npa 	= require('npa')();
var mkdirp  = require('mkdirp');

var tableName = '';
var tableKeyName = '';
var resourceName = '';
var uriBase = '';
var filename = '';
var localpath = '';

function indent( tabCnt ) {
	var tabs = '';
	for(var ndx=0;ndx<tabCnt;ndx++) {tabs += '\t';}	
	return tabs;
}

function writeResourceUri( tabCnt, path, handler, params, version ) {
	var content = '';
	
	content += indent(tabCnt) + '{\n';
	content += indent(tabCnt+1) + 'uri: {path: "/' + path + '", version: "' + version + '"},\n';
	content += indent(tabCnt+1) + 'method:  "' + handler + '",\n';
	content += indent(tabCnt+1) + 'args: [' + (params.length > 0 ? '"' + params.join('","') + '"' : '') + ']\n';
	content += indent(tabCnt) + '}\n';
	
	return content;
}

function writeResourceGETHandler( tabCnt, handler ) {
	var content = '';
	
	content += indent(tabCnt) + handler + ': function(request, response, callback) {\n';
	content += indent(tabCnt+1) + 'var obj = new ' + tableName + '();\n';
	content += indent(tabCnt+1) + 'var em = npa.getEntityManager("'+factory.connectParams.name+'");\n\n';

	content += indent(tabCnt+1) + 'var sortOptions = "";\n';
	content += indent(tabCnt+1) + 'var criteria = [];\n';
	content += indent(tabCnt+1) + 'var values = ["ONLINE"];\n';
	content += indent(tabCnt+1) + 'criteria.push(new em.utils.Criterion("recordState","ONLINE"));\n\n';

	content += indent(tabCnt+1) + 'if(Object.keys(request.query).length) {\n';	
	
	content += indent(tabCnt+2) + 'for(var key in request.query) {\n';
	content += indent(tabCnt+3) + 'if(key.toLowerCase() == "sort") {\n';
	
	content += indent(tabCnt+4) + 'try {\n';
	
	content += indent(tabCnt+5) + 'var options = request.query[key].split(",");\n';
	content += indent(tabCnt+5) + 'if(options.length >= 1) {\n';
	content += indent(tabCnt+6) + 'for(var ndx=0;ndx<options.length;ndx++) {\n';
	content += indent(tabCnt+7) + 'var whichWay = (options[ndx].substr(0, 1) == "-" ? whichWay = " DESC" : ""); // default to ascending.\n';
	content += indent(tabCnt+7) + 'var objCol = obj.hasColumn(options[ndx].substring(1).trim());\n';
	content += indent(tabCnt+7) + 'if(objCol) {\n';
	content += indent(tabCnt+8) + 'sortOptions += (sortOptions.length > 0 ? ", ":"") + "t0." + objCol.name + whichWay;\n';
	content += indent(tabCnt+7) + '}\n';
	content += indent(tabCnt+6) + '}\n';
	content += indent(tabCnt+5) + '}\n';

	content += indent(tabCnt+4) + '} catch(exp) {\n';
	content += indent(tabCnt+5) + 'console.log("Unable to parse sort request:",exp,\n';
	content += indent(tabCnt+6) + '"\\n\\nFormat should be sort=+fieldOne,-fieldTwo,+fieldThree\\n\\tNote: (+/-) indicates ASC/DESC respectively.\\n\\n");\n';
	content += indent(tabCnt+4) + '}\n';
	
	content += indent(tabCnt+3) + '}\n\n';
	content += indent(tabCnt+3) + 'else {\n';
	content += indent(tabCnt+4) + 'var objCol = obj.hasColumn(key);\n';
	content += indent(tabCnt+4) + 'if(objCol) {\n';
	content += indent(tabCnt+5) + 'var qryEntry = (objCol.type.name == "Buffer" ? new em.utils.Criterion(objCol.name,new Buffer(request.query[key],"HEX")) : new em.utils.Criterion(objCol.name,"%"+request.query[key]+"%","AND","LIKE"));\n';
	content += indent(tabCnt+5) + 'values.push(qryEntry.value);\n';
	content += indent(tabCnt+5) + 'criteria.push(qryEntry);\n';
	content += indent(tabCnt+4) + '}\n';
	content += indent(tabCnt+3) + '}\n';
	content += indent(tabCnt+2) + '}\n\n';
	content += indent(tabCnt+1) + '}\n\n';

	content += indent(tabCnt+1) + 'else if(request.params.' + tableKeyName + ' !== undefined) {\n';
	content += indent(tabCnt+2) + 'var objCol = obj.hasColumn("' + tableKeyName + '");\n';
	content += indent(tabCnt+2) + 'if(objCol) {\n';
	content += indent(tabCnt+3) + 'var qryEntry = (objCol.type.name == "Buffer" ? new em.utils.Criterion(objCol.name,new Buffer(request.params.' + tableKeyName + ',"HEX")) : new em.utils.Criterion(objCol.name,request.params.' + tableKeyName + '));\n';
	content += indent(tabCnt+3) + 'values.push(qryEntry.value);\n';
	content += indent(tabCnt+3) + 'criteria.push(qryEntry);\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt+1) + '}\n\n';

	content += indent(tabCnt+1) + 'var query = em.utils.select(obj, "t0");\n';
	content += indent(tabCnt+1) + 'query += " " + em.utils.where(obj, "t0", criteria);\n';
	content += indent(tabCnt+1) + 'query += (sortOptions.length > 0 ? " order by " + sortOptions : "");\n';
	content += indent(tabCnt+1) + 'em.customQuery( query, values, function(err, results) {\n';
	content += indent(tabCnt+2) + 'response.contentType = \'json\';\n';
	content += indent(tabCnt+2) + 'if (err) {\n';
	content += indent(tabCnt+3) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+3) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to request resource '+tableName+'.","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'console.log("Results: " + JSON.stringify(results));\n';
	content += indent(tabCnt+2) + 'response.send(200, results);\n';
	content += indent(tabCnt+2) + 'return callback();\n';
	content += indent(tabCnt+1) + '});\n';

	content += indent(tabCnt) + '}\n';
	
	return content;
}

function writeResourcePOSTHandler( tabCnt, handler ) {
	var content = '';
	
	content += indent(tabCnt) + handler + ': function(request, response, callback) {\n';
	content += indent(tabCnt+1) + 'var obj = new ' + tableName + '(request.body);\n';
	content += indent(tabCnt+1) + 'obj.createdOn = new Date();\n';
	content += indent(tabCnt+1) + 'obj.modifiedOn = new Date();\n';
	content += indent(tabCnt+1) + 'obj.recordState = "ONLINE";\n';
	content += indent(tabCnt+1) + 'var em = npa.getEntityManager("'+factory.connectParams.name+'");\n\n';
	
	content += indent(tabCnt+1) + 'em.persist( new '+tableName+'(), obj, function(err, results) {\n';
	content += indent(tabCnt+2) + 'response.contentType = \'json\';\n';
	content += indent(tabCnt+2) + 'if (err) {\n';
	content += indent(tabCnt+3) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+3) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to persist resource '+tableName+'.","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'console.log("Results: " + JSON.stringify(results));\n';
	content += indent(tabCnt+2) + 'response.send(200, results);\n';
	content += indent(tabCnt+2) + 'return callback();\n';
	content += indent(tabCnt+1) + '});\n';
	
	content += indent(tabCnt) + '}\n';
	
	return content;
}

function writeResourcePUTHandler( tabCnt, handler ) {
	var content = '';
	
	content += indent(tabCnt) + handler + ': function(request, response, callback) {\n';
	content += indent(tabCnt+1) + 'var objDelta = new ' + tableName + '(request.body);\n';
	content += indent(tabCnt+1) + 'var em = npa.getEntityManager("'+factory.connectParams.name+'");\n\n';
	
	content += indent(tabCnt+1) + 'em.fetch( new '+tableName+'(), request.params.'+tableKeyName+', function(err, results) {\n';
	content += indent(tabCnt+2) + 'response.contentType = \'json\';\n';
	content += indent(tabCnt+2) + 'if (err) {\n';
	content += indent(tabCnt+3) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+3) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to persist resource '+tableName+'.","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'else if (!results || results.length == 0) {\n';
	content += indent(tabCnt+3) + 'response.send(404, {"error":{"apiError":"Unable to locate '+tableName+'.'+tableKeyName+' with a value of "+request.params.'+tableKeyName+',"verboseError":"Unable to locate resource '+tableName+' with '+tableKeyName+' equal to "+request.params.'+tableKeyName+'+".","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'else {\n';
	content += indent(tabCnt+3) + 'var objOriginal = new ' + tableName + '(results[0]);\n'
	content += indent(tabCnt+3) + 'objOriginal.mutate(objDelta);\n'
	content += indent(tabCnt+3) + 'em.merge(new '+tableName+'(), objOriginal, function(err, results) {\n';
	content += indent(tabCnt+4) + 'if (err) {\n';
	content += indent(tabCnt+5) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+5) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to merge changes resource '+tableName+' with '+tableKeyName+' of "+request.params.'+tableKeyName+'+".","uri":request.path()}});\n';
	content += indent(tabCnt+5) + 'return callback();\n';
	content += indent(tabCnt+4) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+4) + 'console.log("Results: " + JSON.stringify(results));\n';
	content += indent(tabCnt+4) + 'response.send(200, results);\n';
	content += indent(tabCnt+4) + 'return callback();\n';
	content += indent(tabCnt+3) + '});\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt+1) + '});\n';
	
	content += indent(tabCnt) + '}\n';
	
	return content;
}

function writeResourceDELETEHandler( tabCnt, handler ) {
	var content = '';
	
	content += indent(tabCnt) + handler + ': function(request, response, callback) {\n';
	content += indent(tabCnt+1) + 'var em = npa.getEntityManager("'+factory.connectParams.name+'");\n\n';
	
	content += indent(tabCnt+1) + 'em.fetch( new '+tableName+'(), request.params.'+tableKeyName+', function(err, results) {\n';
	content += indent(tabCnt+2) + 'response.contentType = \'json\';\n';
	content += indent(tabCnt+2) + 'if (err) {\n';
	content += indent(tabCnt+3) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+3) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to persist resource '+tableName+'.","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'else if (!results || results.length == 0) {\n';
	content += indent(tabCnt+3) + 'response.send(404, {"error":{"apiError":"Unable to locate '+tableName+'.'+tableKeyName+' with a value of "+request.params.'+tableKeyName+',"verboseError":"Unable to locate resource '+tableName+' with '+tableKeyName+' equal to "+request.params.'+tableKeyName+'+".","uri":request.path()}});\n';
	content += indent(tabCnt+3) + 'return callback();\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+2) + 'else {\n';
	content += indent(tabCnt+3) + 'var objOriginal = new ' + tableName + '(results[0]);\n';
	content += indent(tabCnt+3) + 'objOriginal.modifiedOn = new Date();\n';
	content += indent(tabCnt+3) + 'objOriginal.recordState= "ARCHIVED";\n';
	content += indent(tabCnt+3) + 'em.merge(new '+tableName+'(), objOriginal, function(err, results) {\n';
	content += indent(tabCnt+4) + 'if (err) {\n';
	content += indent(tabCnt+5) + 'console.log("Error: ",err);\n';
	content += indent(tabCnt+5) + 'response.send(422, {"error":{"apiError":err,"verboseError":"Unable to merge changes resource '+tableName+' with '+tableKeyName+' of "+request.params.'+tableKeyName+'+".","uri":request.path()}});\n';
	content += indent(tabCnt+5) + 'return callback();\n';
	content += indent(tabCnt+4) + '}\n';
	content += indent(tabCnt) + '\n';
	content += indent(tabCnt+4) + 'console.log("Results: " + JSON.stringify(results));\n';
	content += indent(tabCnt+4) + 'response.send(200, results);\n';
	content += indent(tabCnt+4) + 'return callback();\n';
	content += indent(tabCnt+3) + '});\n';
	content += indent(tabCnt+2) + '}\n';
	content += indent(tabCnt+1) + '});\n';
	
	content += indent(tabCnt) + '}\n';
	
	return content;
}

var nxtConfigNdx = 0;
var apiVersion = '0.9.0';

var fs = require('fs');
var path = require('path');
var factory = require('../managerFactory');

function nextConfiguration( ) {
	console.log('Index: ', nxtConfigNdx+1, ' of ', factory.configurations.length);
	
	if(factory.configurations && 
	   factory.configurations.length && 
	   (factory.configurations.length > nxtConfigNdx)) {

		var jsFiles = [];
		var resources = [];
		
		factory.swapConfig( nxtConfigNdx++ );
		try {
		    // Query the entry
		    stats = fs.lstatSync(factory.paths.routes);
		
		    // Is it a directory?
		    if (stats.isDirectory()) {
		        // Yes it is
		    }
		} catch (e) {
		    // ...
		    console.log('Path exception: assumed path does not exist.\nAttempting to create ['+factory.paths.routes+']...\n');
		    mkdirp(factory.paths.routes);
		}
		
console.log('Config Index: ', nxtConfigNdx, ' orm targets: ', factory.paths.orm.target, ' routes: ', factory.paths.routes);

		var files = fs.readdirSync(factory.paths.orm.target);
		for(var pos=0;pos<files.length;pos++) {
			var stat = fs.lstatSync(path.join('.', factory.paths.orm.target, files[pos]));
			if(stat.isFile()) {
				if(path.extname(files[pos]) == '.js') {
					jsFiles.push(files[pos]);
				}
			}
		}
		
		var tableEntryLoop = 0;
		var maxTableEntries = jsFiles.length;
		for(var nxt=0;nxt<jsFiles.length;nxt++) {
			var resourceObject = require(path.join(process.cwd(),factory.paths.orm.target, jsFiles[nxt]));
			var obj = new resourceObject();
			
			tableName = obj.table.name;
			tableKeyName = obj.table.keys.primary[0];
			resourceName = tableName.toCamelCase();
			uriBase = resourceName.toLowerCase();

			resources.push('require("./'+resourceName+'")');
			filename = path.join(factory.paths.routes, resourceName + '.js');
			localpath = (filename.lastIndexOf('lib') > 0 ? filename.substr( filename.lastIndexOf('lib') - 1 ) : filename);
			
			var fileContents = '// ' + localpath + '\n';
			fileContents += '// @author: Lazarus Software NodeJS API Generator\n\n';
			fileContents += 'var path = require("path");\n';
			fileContents += 'var npa = require("npa")();\n';
			fileContents += 'var ' + tableName + ' = require(path.join(process.cwd(), "' + factory.paths.orm.target + '", "' + tableName + '"));\n\n';
			fileContents += 'module.exports = {\n';
			
			fileContents += indent(1) + 'name: "' + resourceName + '",\n';
			
			// -- handlers
			fileContents += indent(1) + 'handlers: {\n';
			fileContents += indent(2) + '// ## - GET Handlers\n';
			fileContents += writeResourceGETHandler( 2, 'get'+tableName+'s' );
			fileContents += indent(2) + ',// ## - POST Handlers\n';
			fileContents += writeResourcePOSTHandler( 2, 'create'+tableName );
			fileContents += indent(2) + ',// ## - PUT Handlers\n';
			fileContents += writeResourcePUTHandler( 2, 'update'+tableName );
			fileContents += indent(2) + ',// ## - DELETE Handlers\n';
			fileContents += writeResourceDELETEHandler( 2, 'archive'+tableName );
			fileContents += indent(1) + '},\n';
			
			// -- resources
			fileContents += indent(1) + 'resources: [\n';
			// -- GET resources
			fileContents += indent(2) + '{\n';
			fileContents += indent(3) + 'httpMethod: "GET",\n';
			fileContents += indent(3) + 'uris: [\n';
			fileContents += writeResourceUri( 4, uriBase+'s', 'get'+tableName+'s', [], apiVersion );
			fileContents += indent(4) + ',\n';
			fileContents += writeResourceUri( 4, uriBase+'s/:' + tableKeyName, 'get'+tableName+'s', [tableKeyName], apiVersion );
			fileContents += indent(3) + ']\n';
			fileContents += indent(2) + '},\n';
			// -- POST resources
			fileContents += indent(2) + '{\n';
			fileContents += indent(3) + 'httpMethod: "POST",\n';
			fileContents += indent(3) + 'uris: [\n';
			fileContents += writeResourceUri( 4, uriBase+'s', 'create'+tableName, [], apiVersion );
			fileContents += indent(3) + ']\n';
			fileContents += indent(2) + '},\n';
			// -- PUT resources
			fileContents += indent(2) + '{\n';
			fileContents += indent(3) + 'httpMethod: "PUT",\n';
			fileContents += indent(3) + 'uris: [\n';
			fileContents += writeResourceUri( 4, uriBase+'s/:' + tableKeyName, 'update'+tableName, [tableKeyName], apiVersion );
			fileContents += indent(3) + ']\n';
			fileContents += indent(2) + '},\n';
			// -- POST resources
			fileContents += indent(2) + '{\n';
			fileContents += indent(3) + 'httpMethod: "DELETE",\n';
			fileContents += indent(3) + 'uris: [\n';
			fileContents += writeResourceUri( 4, uriBase+'s/:' + tableKeyName, 'archive'+tableName, [tableKeyName], apiVersion );
			fileContents += indent(3) + ']\n';
			fileContents += indent(2) + '}\n';
			
			fileContents += indent(1) + ']\n';
			
			fileContents += '};\n';
	
	// ----- 
			fs.writeFileSync( filename, fileContents, {encoding:'utf8',mode:438,flag:'w'});
			console.log(filename + ' was written.');
	
			tableEntryLoop++;
			if(tableEntryLoop == maxTableEntries) {
				// ee.emit('factory.orm.done',true);
				filename = path.join(factory.paths.routes, 'index.js');
				localpath = (filename.lastIndexOf('lib') > 0 ? filename.substr( filename.lastIndexOf('lib') - 1 ) : filename);
				
				var fileContents4Index = '// ' + localpath + '\n';
				fileContents4Index += '// @author: Lazarus Software NodeJS API Loader Generator\n\n';
				fileContents4Index += 'var resources = [];\n';
				for(var ndx=0;ndx<resources.length;ndx++) {
					fileContents4Index += 'resources.push('+resources[ndx]+');\n';
				}
				fileContents4Index += 'module.exports = resources;\n';
	
				fs.writeFile(filename, fileContents4Index, {encoding:'utf8',mode:438,flag:'w'}, function(err) {
					if(err) console.error(err);
					else console.log(filename + ' was written.');
					
					if(!nextConfiguration())
						process.exit(0);
				});
			}
	// -----
		}
	}
	
	else {
		return null;
	}
}

nextConfiguration( );