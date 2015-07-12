//#!/test.js
// See if the user has setup their configuration correctly.
var npa 	= require('npa')();
var entityMngr  = npa.getEntityManager();

entityMngr.release();
