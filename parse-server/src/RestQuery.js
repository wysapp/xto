// An object that encapsulates everything we need to run a 'find'
// operation, encoded in the REST API format.

var Parse = require('parse/node').Parse;
const triggers = require('./triggers');

const AlwaysSelectedKeys = ['objectId', 'createdAt', 'updateAt'];

// restOptions can include:
//   skip
//   limit
//   order
//   count
//   include
//   keys
//   redirectClassNameForKey
function RestQuery(config, auth, className, restWhere = {}, restOptions = {}, clientSDK) {
  this.config = config;
  this.auth = auth;
  this.className = className;
  this.restWhere = restWhere;
  this.restOptions = restOptions;
  this.clientSDK = clientSDK;
  this.response = null;

  this.findOptions = {};

  if (!this.auth.isMaster) {
    this.findOptions.acl = this.auth.user ? [this.auth.user.id] : null;
    if (this.className == '_Sessino') {
      if (!this.findOptions.acl) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN,
                              'This session token is invalid.');
      }
      this.restWhere = {
        '$and': [this.restWhere, {
          'user': {
            __type: 'Pointer',
            className: '_User',
            objectId:  this.auth.user.id
          }
        }]
      };
    }
  }

  this.doCount = false;
  this.include = [];
  if (restOptions.hasOwnProperty('keys')) {
    const keysForInclude = restOptions.keys.split(',').filter((key) => {
      return key.split('.').length > 1;
    }).map((key) => {
      return key.slice(0, key.lastIndexOf('.'));
    }).join(',');

    if (keysForInclude.length > 0) {
      if (!restOptions.include || restOptions.include.length === 0) {
        restOptions.include = keysForInclude;
      } else {
        restOptions.include += ',' + keysForInclude;
      }
    }
  }

  for (var option in restOptions){
    switch(option) {
    case 'keys': {
      const keys = restOptions.keys.split(',').concat(AlwaysSelectedKeys);
      this.keys = Array.from(new Set(keys));
      break;
    }
    case 'count':
      this.doCount = true;
      break;
    case 'skip':
    case 'limit':
      this.findOptions[option] = restOptions[option];
      break;
    case 'order':
      var fields = restOptions.order.split(',');
      this.findOptions.sort = fields.reduce((sortMap, field) => {
        field = field.trim();
        if(field[0] == '-') {
          sortMap[field.slice(1)] = -1;
        } else {
          sortMap[field] = 1;
        }
        return sortMap;
      }, {});
      break;
    case 'include': {
      const paths = restOptions.include.split(',');
      const pathSet = paths.reduce((memo, path) => {
        // Split each paths on . (a.b.c -> [a,b,c])
        // reduce to create all paths
        // ([a,b,c] -> {a: true, 'a.b': true, 'a.b.c': true})
        return path.split('.').reduce((memo, path, index, parts) =>{
          memo[parts.slice(0, index + 1).join('.')] = true;
          return memo;
        }, memo);
      }, {});

      this.include = Object.keys(pathSet).map((s) => {
        return s.split('.');
      }).sort((a, b) => {
        return a.length - b.length;
      });
      break;
    }
    case 'redirectClassNameForKey':
      this.redirectKey = restOptions.redirectClassNameForKey;
      this.redirectClassName = null;
      break;
    default:
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'bad option: ' + option);
    }
  }
}


// A convenient method to perform all the steps of processing a query
// in order.
// Returns a promise for the response - an object with optional keys
// 'results' and 'count'.
// TODO: consolidate the replaceX functions
RestQuery.prototype.execute = function(executeOptions) {
  return Promise.resolve().then(() => {
    return this.buildRestWhere();
  })
}


RestQuery.prototype.buildRestWhere = function() {
  return Promise.resolve().then(() => {
    return this.getUserAndRoleACL();
  }).then(() => {
    return this.redirectClassNameForKey();
  })
}

RestQuery.prototype.getUserAndRoleACL = function() {
  if (this.auth.isMaster || !this.auth.user) {
    return Promise.resolve();
  }

  return this.auth.getUserRoles().then((roles) => {
    const aclSet = new Set([].concat(this.findOptions.acl, roles));
    this.findOptions.acl = Array.from(aclSet);
    return Promise.resolve();
  });
}


RestQuery.prototype.redirectClassNameForKey = function() {
  if (!this.redirectKey) {
    return Promise.resolve();
  }

  return this.config.database.redirectClassNameForKey(
    this.className, this.redirectKey
  ).then((newClassName) => {
    this.className = newClassName;
    this.redirectClassName = newClassName;
  });
}