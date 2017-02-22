// An object that encapsulates everything we need to run a 'find'
// operation, encoded in the REST API format.

var Parse = require('parse/node').Parse;
var SchemaController = require('./Controllers/SchemaController');

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
  }).then(() => {
    return this.runFind(executeOptions);
  }).then(() => {
    return this.runCount();
  }).then(() => {
    return this.handleInclude();
  }).then(() => {
    return this.runAfterFindTrigger();
  }).then(() => {
    return this.response;
  })
}


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


RestQuery.prototype.validateClientClassCreation = function() {
  if (this.config.allowClientClassCreation === false && !this.auth.isMaster && SchemaController.systemClasses.indexOf(this.className) === -1) {
    return this.config.database.loadSchema()
      .then(schemaController => schemaController.hasClass(this.className))
      .then(hasClass => {
        if (hasClass !== true) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,
                                'This user is not allowed to access ' +
                                'non-existent class: ' + this.className);
        }
      });
  } else {
    return Promise.resolve();
  }
}



function transformInQuery(inQueryObject, className, results) {
  var values = [];
  for (var result of results) {
    values.push({
      __type: 'Pointer',
      className: className,
      objectId: result.objectId
    });
  }

  delete inQueryObject['$inQuery'];
  if (Array.isArray(inQueryObject['$in'])) {
    inQueryObject['$in'] = inQueryObject['$in'].concat(values);
  } else {
    inQueryObject['$in'] = values;
  }
}

RestQuery.prototype.replaceInQuery = function() {
  var inQueryObject = findObjectWithKey(this.restWhere, '$inQuery');
  if (!inQueryObject) {
    return;
  }

  var inQueryValue = inQueryObject['$inQuery'];
  if (!inQueryValue.where || !inQueryValue.className) {    
    throw new Parse.Error(Parse.Error.INVALID_QUERY,
                          'improper usage of $inQuery');
  }

  const additionalOptions = {
    redirectClassNameForKey: inQueryValue.redirectClassNameForKey
  };

  var subquery = new RestQuery(
    this.config, this.auth, inQueryValue.className,
    inQueryValue.where, additionalOptions
  );

  return subquery.execute().then((response) => {
    transformInQuery(inQueryObject, subquery.className, response.results);

    return this.replaceInQuery();
  })
}

function transformNotInQuery(notInQueryObject, className, results) {
  var values = [];
  for (var result of results) {
    values.push({
      __type: 'Pointer',
      className: className,
      objectId: result.objectId
    });
  }
  delete notInQueryObject['$notInQuery'];
  if (Array.isArray(notInQueryObject['$nin'])) {
    notInQueryObject['$nin'] = notInQueryObject['$nin'].concat(values);
  } else {
    notInQueryObject['$nin'] = values;
  }
}

// Replaces a $notInQuery clause by running the subquery, if there is an
// $notInQuery clause.
// The $notInQuery clause turns into a $nin with values that are just
// pointers to the objects returned in the subquery.
RestQuery.prototype.replaceNotInQuery = function() {
  var notInQueryObject = findObjectWithKey(this.restWhere, '$notInQuery');
  if (!notInQueryObject) {
    return;
  }

  // The notInQuery value must have precisely two keys - where and className
  var notInQueryValue = notInQueryObject['$notInQuery'];
  if (!notInQueryValue.where || !notInQueryValue.className) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY,
                          'improper usage of $notInQuery');
  }

  const additionalOptions = {
    redirectClassNameForKey: notInQueryValue.redirectClassNameForKey
  };

  var subquery = new RestQuery(
    this.config, this.auth, notInQueryValue.className,
    notInQueryValue.where, additionalOptions);
  return subquery.execute().then((response) => {
    transformNotInQuery(notInQueryObject, subquery.className, response.results);
    // Recurse to repeat
    return this.replaceNotInQuery();
  });
};


const transformSelect = (selectObject, key, objects) => {
  var values = [];
  for (var result of objects) {
    values.push(result[key]);
  }

  delete selectObject['$select'];
  if (Array.isArray(selectObject['$in'])) {
    selectObject['$in'] = selectObject['$in'].concat(values);
  } else {
    selectObject['$in'] = values;
  }
}

RestQuery.prototype.replaceSelect = function() {
  var selectObject = findObjectWithKey(this.restWhere, '$select');
  if (!selectObject) {
    return;
  }

  var selectValue = selectObject['$select'];
  // iOS SDK don't send where if not set, let it pass
  if (!selectValue.query ||
      !selectValue.key ||
      typeof selectValue.query !== 'object' ||
      !selectValue.query.className ||
      Object.keys(selectValue).length !== 2
  ) {    
    throw new Parse.Error(Parse.Error.INVALID_QUERY,
                          'improper usage of $select');
  }

  const additionalOptions = {
    redirectClassNameForKey: selectValue.query.redirectClassNameForKey
  };

  var subquery = new RestQuery(
    this.config, this.auth, selectValue.query.className,
    selectValue.query.where, additionalOptions
  );

  return subquery.execute().then((response) => {
    transformSelect(selectObject, selectValue.key, response.results);

    // Keep replacing $select clauses
    return this.replaceSelect();
  })
};


const transformDontSelect = (dontSelectObject, key, objects ) => {
  var values = [];
  for(var result of objects) {
    values.push(result[key]);
  }

  delete dontSelectObject['$dontSelect'];
  if (Array.isArray(dontSelectObject['$nin'])) {
    dontSelectObject['$nin'] = dontSelectObject['$nin'].concat(values);
  } else {
    dontSelectObject['$nin'] = values;
  }
}


// Replaces a $dontSelect clause by running the subquery, if there is a
// $dontSelect clause.
// The $dontSelect clause turns into an $nin with values selected out of
// the subquery.
// Returns a possible-promise.
RestQuery.prototype.replaceDontSelect = function() {
  var dontSelectObject = findObjectWithKey(this.restWhere, '$dontSelect');
  if (!dontSelectObject) {
    return;
  }

  var dontSelectValue = dontSelectObject['$dontSelect'];
  if (!dontSelectValue.query || 
      !dontSelectValue.key ||
      typeof dontSelectValue.query !== 'object' ||
      !dontSelectValue.query.className ||
      Object.keys(dontSelectValue).length !== 2
  ) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY,
                          'improper usage of $dontSelect');
  }

  const additionalOptions = {
    redirectClassNameForKey: dontSelectValue.query.redirectClassNameForKey
  };

  var subquery = new RestQuery(
    this.config, this.auth, dontSelectValue.query.className,
    dontSelectValue.query.where, additionalOptions
  );

  return subquery.execute().then((response) => {
    transformDontSelect(dontSelectObject, dontSelectValue.key, response.results);

    return this.replaceDontSelect();
  })
}


RestQuery.prototype.runFind = function(options = {}) {
  if (this.findOptions.limit === 0) {
    this.response = {results: []};
    return Promise.resolve();
  }

  const findOptions = Object.assign({}, this.findOptions);
  if (this.keys) {
    findOptions.keys = this.keys.map((key) => {
      return key.split('.')[0];
    });
  }

  if (options.op) {
    findOptions.op = options.op;
  }

  return this.config.database.find(
    this.className, this.restWhere, findOptions
  ).then((results) => {
    if (this.className === '_User') {
      for (var result of results) {
        cleanResultOfSensitiveUserInfo(result, this.auth, this.config);
        cleanResultAuthData(result);
      }
    }

    this.config.filesController.expandFilesInObject(this.config, results);

    if (this.redirectClassName) {
      for (var r of results) {
        r.className = this.redirectClassName;
      }
    }

    this.response = {results: results};
  });
}


RestQuery.prototype.runCount = function() {
  if (!this.doCount) {
    return;
  }

  this.findOptions.count = true;
  delete this.findOptions.skip;
  delete this.findOptions.limit;

  return this.config.database.find(
    this.className, this.restWhere, this.findOptions
  ).then((c) => {
    this.response.count = c;
  });
}


RestQuery.prototype.handleInclude = function() {
  if (this.include.length == 0) {
    return ;
  }

  var pathResponse = includePath(this.config, this.auth, this.response, this.include[0], this.restOptions);

  if (pathResponse.then) {
    return pathResponse.then((newResponse) => {
      this.response = newResponse;
      this.include = this.include.slice(1);
      return this.handleInclude();
    });
  } else if (this.include.length > 0) {
    this.include = this.include.slice(1);
    return this.handleInclude();
  }

  return pathResponse;
}


RestQuery.prototype.runAfterFindTrigger = function() {
  if (!this.response) {
    return;
  }

  const hasAfterFindHook = triggers.triggerExists(this.className, triggers.Types.afterFind, this.config.applicationId);

  if (!hasAfterFindHook) {
    return Promise.resolve();
  }

  return triggers.maybeRunAfterFindTrigger(triggers.Types.afterFind, this.auth, this.className, this.response.results, this.config).then((results) => {
    this.response.results = results;
  });
}


// Finds a subobject that has the given key, if there is one.
// Returns undefined otherwise.
function findObjectWithKey(root, key) {
  if (typeof root !== 'object') {
    return;
  }
  if (root instanceof Array) {
    for (var item of root) {
      const answer = findObjectWithKey(item, key);
      if (answer) {
        return answer;
      }
    }
  }
  if (root && root[key]) {
    return root;
  }
  for (var subkey in root) {
    const answer = findObjectWithKey(root[subkey], key);
    if (answer) {
      return answer;
    }
  }
}

module.exports = RestQuery;
