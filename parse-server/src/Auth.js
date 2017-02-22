var Parse = require('parse/node').Parse;

// An Auth object tells you who is requesting something and whether
// the master key was used.
// userObject is a Parse.User and can be null if there's no user.
function Auth({config, isMaster = false, user, installationId} = {}) {
  this.config = config;
  this.installationId = installationId;
  this.isMaster = isMaster;
  this.user = user;

  this.userRoles = [];
  this.fetchedRoles = false;
  this.rolePromise = null;
}



// A helper to get a master-level Auth object
function master(config) {
  return new Auth({config, isMaster: true});
}


// A helper to get a nobody-level Auth object
function nobody(config) {
  return new Auth({config, isMaster: false});
}


Auth.prototype.getUserRoles = function(){
  if (this.isMaster || !this.user) {
    return Promise.resolve([]);
  }

  if (this.fetchedRoles) {
    return Promise.resolve(this.userRoles);
  }

  if (this.rolePromise) {
    return this.rolePromise;
  }

  this.rolePromise = this._loadRoles();
  return this.rolePromise;

}



module.exports = {
  Auth,
  master,
  nobody
};