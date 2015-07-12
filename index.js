//#!/npa/index.js
var factory = require('./lib/managerFactory');

module.exports = function( options ) {
	if (!options) {
		options = {
			engine: 'mysql'
		};
	}

	return {
		factory: factory,
		
		getEntityManager: function( ) {
			return factory.getSchemaManager( options.engine );
		}
	}
}