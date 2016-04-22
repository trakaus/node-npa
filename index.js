//#!/npa/index.js
var factory = require('./lib/managerFactory');

module.exports = function( options ) {
	if (!options) {
		options = {
			engine: 'mysql'
		};
	}

	return {
		paths: factory.paths,
		
		getEntityManager: function( ) {
			return factory.getSchemaManager( );
		}
	}
}