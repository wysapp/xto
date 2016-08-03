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
    })
  })
}


module.exports = {
  Auth: Auth,
  getAuthForSessionToken: getAuthForSessionToken,
}