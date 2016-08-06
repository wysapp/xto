
var SchemaController = require('./Controllers/SchemaController');
var Parse = require('parse/node').Parse;


import { default as FilesController } from './Controllers/FilesController';


function RestQuery(config, auth, className, restWhere = {}, restOptions = {}, clientSDK) {
  this.config = config;
  this.auth = auth;
  this.className = className;
  this.restWhere = restWhere;
  this.clientSDK = clientSDK;
  this.response = null;

  this.findOptions = {};

  if ( !this.auth.isMaster) {
    this.findOptions.act = this.auth.user ? [this.auth.user.id] : null;
    if(this.className == '_Session') {
      if (!this.findOptions.acl) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'This session token is invalid.');
      }

      this.restWhere = {
        '$and': [this.restWhere, {
          'user': {
            __type: 'Pointer',
            className: '_User',
            objectId: this.auth.user.id
          }
        }]
      };
    }
  }

  this.doCount = false;

  this.include = [];

  for (var option in restOptions) {
    switch(option) {
    case 'keys':
      this.keys = new Set(restOptions.keys.split(','));
      this.keys.add('objectId');
      this.keys.add('createdAt');
      this.keys.add('updatedAt');
      break;
    case 'count':
      this.doCount = true;
      break;
    case 'skip':
    case 'limit':
      this.findOptions[option] = restOptions[option];
      break;
    case 'order':
      var fields = restOptions.order.split(',');
      var sortMap = {};
      for (var field of fields ) {
        if ( field[0] == '-') {
          sortMap[field.slice(1)] = -1;
        } else {
          sortMap[field] = 1;
        }
      }
      this.findOptions.sort = sortMap;
      break;
    case 'include':
      var paths = restOptions.include.split(',');
      var pathSet = {};
      for (var path of paths) {
        var parts = path.split('.');
        for(var len = 1; len <= parts.length; len++) {
          pathSet[parts.slice(0, len).join('.')] = true;
        }
      }
      this.include = Object.keys(pathSet).sort((a, b) => {
        return a.length - b.length;
      }).map((s) => {
        return s.split('.');
      });
      break;
    case 'redirectClassNameForKey':
      this.redirectKey = restOptions.redirectClassNameForKey;
      this.redirectClassName = null;
      break;
    default:
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'bad option: ' + option);
    }
  }
}


RestQuery.prototype.execute = function() {
  return Promise.resolve().then(() => {
    return this.buildRestWhere();
  }).then(()=> {
    return this.runFind();
  }).then(() => {
    return this.runCount();
  }).then(() => {
    return this.handleInclude();
  }).then(() => {
    return this.response;
  });
};


RestQuery.prototype.buildRestWhere = function() {
  return Promise.resolve().then(() => {
    return this.getUserAndRoleACL();
  }).then(() => {
    return this.redirectClassNameForKey();
  }).then(() => {
    return this.validateClientClassCreation();
  }).then(() => {
    return this.replaceSelect();
  }).then(() => {
    return this.replaceDontSelect();
  }).then(() => {
    return this.replaceInQuery();
  }).then(() => {
    return this.replaceNotInQuery();
  });
};


module.exports = RestQuery;