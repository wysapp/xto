// This file contains helpers for running operations in REST format.
// The goal is that handlers that explicitly handle an express route
// should just be shallow wrappers around things in this file, but
// these functions should not explicitly depend on the request
// object.
// This means that one of these handlers can support multiple
// routes. That's useful for the routes that do really similar
// things.

var Parse = require('parse/node').Parse;
import Auth from './Auth';

var RestQuery = require('./RestQuery');
var RestWrite = require('./RestWrite');
var triggers = require('./triggers');

function find(config, auth, className, restWhere, restOptions, clientSDK) {
  enforceRoleSecurity('find', className, auth);

  return triggers.maybeRunQueryTrigger(triggers.Types.beforeFind, className, restWhere, restOptions, config, auth).then((result) => {
    restWhere = result.restWhere || restWhere;
    restOptions = result.restOptions || restOptions;

    const query = new RestQuery(config, auth, className, restWhere, restOptions, clientSDK);
    return query.execute();
  });
}


function create(config, auth, className, restObject, clientSDK) {
  enforceRoleSecurity('create', className, auth);
  var write = new RestWrite(config, auth, className, null, restObject, null, clientSDK);
  return write.execute();
}



function update(config, auth, className, objectId, restObject, clientSDK) {
  enforceRoleSecurity('update', className, auth);

  return Promise.resolve().then(() => {
    if (triggers.getTrigger(className, triggers.Types.beforeSave, config.applicationId) ||
        triggers.getTrigger(className, triggers.Types.afterSave, config.applicationId) ||
        (config.liveQueryController && config.liveQueryController.hasLiveQuery(className))) {
      return find(config, Auth.master(config), className, {objectId: objectId});
    }
    return Promise.resolve({});
  }).then((response) => {
    var originalRestObject ;
    if (response && response.results && response.results.length) {
      originalRestObject = response.results[0];
    }

    var write = new RestWrite(config, auth, className, {objectId: objectId}, restObject, originalRestObject, clientSDK);
    return write.execute();
  });
}

// Disallowing access to the _Role collection except by master key
function enforceRoleSecurity(method, className, auth) {
  if (className === '_Installation' && !auth.isMaster) {
    if (method === 'delete' || method === 'find') {
      const error = `Clients aren't allowed to perform the ${method} operation on the installation collection.`;
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, error);
    }
  }
}


module.exports = {
  create,
  find,
  update,
};