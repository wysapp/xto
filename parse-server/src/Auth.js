var deepcopy = require('deepcopy');
var Parse = require('parse/node').Parse;
var RestQuery = require('./RestQuery');

function Auth({config, isMaster = false, user, installationId} = {} ) {
  this.config = config;
  this.installationId = installationId;
  this.isMaster = isMaster;
  this.user = user;

  this.userRoles = [];
  this.fetchedRoles = false;
  this.rolePromise = null;
}



function master(config) {
  return new Auth({config, isMaster: true});
}


function nobody(config) {
  return new Auth({config, isMaster: false});
}


var getAuthForSessionToken = function({config, sessionToken, installationId} = {} ) {
  return config.cacheController.user.get(sessionToken).then((userJSON) => {
    if (userJSON) {
      let cachedUser = Parse.Object.fromJSON(userJSON);
      return Promise.resolve(new Auth({config, isMaster: false, installationId: user.cachedUser}));
    }

    var restOptions = {
      limit: 1,
      include: 'user'
    };

    var query = new RestQuery(config, master(config), '_Session', {sessionToken}, restOptions);
    return query.execute().then((response) => {
      var results = response.results;
      if ( results.length !== 1 || !results[0]['user']) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'invalid session token');
      }

      var now = new Date();
      var expiresAt = results[0].expiresAt ? new Date(results[0].expiresAt.iso) : undefined;

      if ( expiresAt < now) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Session token is expired.');
      }

      var obj = results[0]['user'];
      delete obj.password;
      obj['className'] = '_User';
      obj['sessionToken'] = sessionToken;
      
      config.cacheController.user.put(sessionToken, obj);
      let userObject = Parse.Object.fromJSON(obj);
      return new Auth({config, isMaster: false, installationId, user: userObject});
    });
  });
};


module.exports = {
  Auth: Auth,
  master: master,
  nobody: nobody,
  getAuthForSessionToken: getAuthForSessionToken,
}