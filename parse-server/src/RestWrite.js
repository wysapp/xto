// A RestWrite encapsulates everything we need to run an operation
// that writes to the database.
// This could be either a "create" or an "update".

var SchemaController = require('./Controllers/SchemaController');
var deepcopy = require('deepcopy');
var Parse = require('parse/node');
var ClientSDK = require('./ClientSDK');
var Auth = require('./Auth');
var cryptoUtils = require('./cryptoUtils');
var triggers = require('./triggers');

import _ from 'lodash';


// query and data are both provided in REST API format. So data
// types are encoded by plain old objects.
// If query is null, this is a "create" and the data in data should be
// created.
// Otherwise this is an "update" - the object matching the query
// should get updated with data.
// RestWrite will handle objectId, createdAt, and updatedAt for
// everything. It also knows to use triggers and special modifications
// for the _User class.
function RestWrite(config, auth, className, query, data, originalData, clientSDK) {
  this.config = config;
  this.auth = auth;
  this.className = className;
  this.clientSDK = clientSDK;
  this.storage = {};
  this.runOptions = {};
  if (!query && data.objectId) {
    throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, 'objectId is an invalid field name.');
  }

  this.response = null;

  this.query = deepcopy(query);
  this.data = deepcopy(data);
  this.originalData = originalData;

  this.updatedAt = Parse._encode(new Date()).iso;

}


RestWrite.prototype.execute = function() {
  return Promise.resolve().then(() => {
    return this.getUserAndRoleACL();
  }).then(() => {
    return this.validateClientClassCreation();
  }).then(() => {
    return this.handleInstallation();
  }).then(() => {
    return this.validateAuthData();
  }).then(() => {
    return this.runBeforeTrigger();
  }).then(() => {
    return this.validateSchema();
  }).then(() => {
    return this.setRequiredFieldsIfNeeded();
  }).then(() => {
    return this.transformUser();
  }).then(() => {
    return this.expandFilesForExistingObjects();
  }).then(() => {
    return this.runDatabaseOperation();
  }).then(() => {
    return this.createSessionTokenIfNeeded();
  }).then(() => {
    return this.handleFollowup();
  }).then(() => {
    return this.runAfterTrigger();
  }).then(() => {
    return this.clearUserAuthData();
  }).then(() => {
    return this.response;
  })
};


RestWrite.prototype.getUserAndRoleACL = function() {
  if (this.auth.isMaster) {
    return Promise.resolve();
  }

  this.runOptions.acl = ['*'];
  if (this.auth.user) {
    return this.auth.getUserRoles().then((roles) => {
      roles.push(this.auth.user.id);
      this.runOptions.acl = this.runOptions.acl.concat(roles);
      return;
    });
  } else {
    return Promise.resolve();
  }
};


RestWrite.prototype.validateClientClassCreation = function() {
  if (this.config.allowClientClassCreation === false && !this.auth.isMaster && SchemaController.systemClasses.indexOf(this.className) === -1) {
    return this.config.database.loadSchema()
      .then(schemaController => schemaController.hasClass(this.className))
      .then(hasClass => {
        if (hasClass !== true) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'This user is not allowed to access ' + 'non-existent class: ' + this.className);
        }
      });
  } else {
    return Promise.resolve();
  }
};


RestWrite.prototype.validateSchema = function() {
  return this.config.database.validateObject(this.className, this.data, this.query, this.runOptions);
}


RestWrite.prototype.runBeforeTrigger = function() {
  if (this.response) {
    return;
  }

  if (!triggers.triggerExists(this.className, triggers.Types.beforeSave, this.config.applicationId)) {
    return Promise.resolve();
  }

  var extraData = { className: this.className };
  if (this.query && this.query.objectId) {
    extraData.objectId = this.query.objectId;
  }

  let originalObject = null;
  const updatedObject = triggers.inflate(extraData, this.originalData);
  if (this.query && this.query.objectId) {
    originalObject = triggers.inflate(extraData, this.originalData);
  }

  updatedObject.set(this.sanitizedData());

  return Promise.resolve().then(() => {
    return triggers.maybeRunQueryTrigger(triggers.Types.beforeSave, this.auth, updatedObject, originalObject, this.config);
  }).then((response) => {
    if (response && response.object) {
      this.storage.fieldsChangedByTrigger = _.reduce(response.object, (result, value, key) => {
        if (!_.isEqual(this.data[key], value)) {
          result.push(key);
        }
        return result;
      }, []);
      this.data = response.object;

      if (this.query && this.query.objectId) {
        delete this.data.objectId;
      }
    }
  });
};


RestWrite.prototype.setRequiredFieldsIfNeeded = function() {
  if (this.data) {
    this.data.updatedAt = this.updatedAt;
    if (!this.query) {
      this.data.createdAt = this.updatedAt;

      if (!this.data.objectId) {
        this.data.objectId = cryptoUtils.newObjectId();
      }
    }
  }
  return Promise.resolve();
}



// Transforms auth data for a user object.
// Does nothing if this isn't a user object.
// Returns a promise for when we're done if it can't finish this tick.
RestWrite.prototype.validateAuthData = function() {
  if (this.className !== '_User') {
    return;
  }

  if (!this.query && !this.data.authData) {
    if (typeof this.data.username !== 'string') {
      throw new Parse.Error(Parse.Error.USERNAME_MISSING, 'bad or missing username');
    }
    if (typeof this.data.password !== 'string') {
      throw new Parse.Error(Parse.Error.PASSWORD_MISSING, 'password is required');
    }
  }

  if (!this.data.authData || !Object.keys(this.data.authData).length) {
    return;
  }

  var authData = this.data.authData;
  var providers = Object.keys(authData);
  if (providers.length > 0) {
    const canHandleAuthData = providers.reduce((canHandle, provider) => {
      var providerAuthData = authData[provider];
      var hasToken = (providerAuthData && providerAuthData.id);
      return canHandle && (hasToken || providerAuthData == null);
    }, true);
    if (canHandleAuthData) {
      return this.handleAuthData(authData);
    }
  }
  throw new Parse.Error(Parse.Error.UNSUPPORTED_SERVICE, 'This authentication method is unsupported.');
}


RestWrite.prototype.transformUser = function() {
  var promise = Promise.resolve();

  if (this.className !== '_User') {
    return promise;
  }

  if (this.query) {
    promise = new RestQuery(this.config, Auth.master(this.config), '_Session', {
      user: {
        __type: 'Pointer',
        className: '_User',
        objectId: this.objectId(),
      }
    }).execute()
      .then(results => {
        results.results.forEach(session => this.config.cacheController.user.del(session.sessionToken));
      });
  }

  return promise.then(() => {
    if (!this.data.password) {
      return Promise.resolve();
    }

    if (this.query && !this.auth.isMaster) {
      this.storage['clearSessions'] = true;
      this.storage['generateNewSession'] = true;
    }

    return this._validatePasswordPolicy().then(() => {
      return passwordCrypto.hash(this.data.password).then((hashedPassword) => {
        this.data._hashed_password = hashedPassword;
        delete this.data.password;
      });
    });
  }).then(() => {
    return this._validateUserName();
  }).then(() => {
    return this._validateEmail();
  });
}


RestWrite.prototype.createSessionTokenIfNeeded = function() {
  if (this.className !== '_User') {
    return;
  }
  if (this.query) {
    return;
  }
  return this.createSessionToken();
}

// Handles any followup logic
RestWrite.prototype.handleFollowup = function() {
  if (this.storage && this.storage['clearSessions'] && this.config.revokeSessionOnPasswordReset) {
    var sessionQuery = {
      user: {
        __type: 'Pointer',
        className: '_User',
        objectId: this.objectId()
      }
    };
    delete this.storage['clearSessions'];
    return this.config.database.destroy('_Session', sessionQuery)
    .then(this.handleFollowup.bind(this));
  }

  if (this.storage && this.storage['generateNewSession']) {
    delete this.storage['generateNewSession'];
    return this.createSessionToken()
    .then(this.handleFollowup.bind(this));
  }

  if (this.storage && this.storage['sendVerificationEmail']) {
    delete this.storage['sendVerificationEmail'];

    this.config.userController.sendVerificationEmail(this.data);
    return this.handleFollowup.bind(this);
  }
}



// Handles the _Session class specialness.
// Does nothing if this isn't an installation object.
RestWrite.prototype.handleSession = function() {
  if (this.response || this.className !== '_Session') {
    return;
  }

  if (!this.auth.user && !this.auth.isMaster) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Session token required.');
  }

  if (this.data.ACL) {
    throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, 'Cannot set ' + 'ACL on a Session.');
  }

  if (!this.query && !this.auth.isMaster) {
    var token = 'r:' + cryptoUtils.newToken();
    var expiresAt = this.config.generateSessionExpiresAt();
    var sessionData = {
      sessionToken: token,
      user: {
        __type: 'Pointer',
        className: '_User',
        objectId: this.auth.user.id
      },
      createdWidth: {
        'action': 'create'
      },
      restricted: true,
      expiresAt: Parse._encode(expiresAt)
    };

    for (var key in this.data) {
      if (key == 'objectId') {
        continue;
      }
      sessionData[key] = this.data[key];
    }

    var create = new RestWrite(this.config, Auth.master(this.config), '_Session', null, sessionData);
    return create.execute().then((results) => {
      if (!results.response) {
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Error creating session.');
      }
      sessionData['objectId'] = results.response['objectId'];
      this.response = {
        status: 201,
        location: results.location,
        response: sessionData
      };
    });
  }
};



// Handles the _Installation class specialness.
// Does nothing if this isn't an installation object.
// If an installation is found, this can mutate this.query and turn a create
// into an update.
// Returns a promise for when we're done if it can't finish this tick.
RestWrite.prototype.handleInstallation = function() {
  if (this.response || this.className !== '_Installation') {
    return;
  }

  if (!this.query && !this.data.deviceToken && !this.data.installationId && !this.auth.installationId) {
    throw new Parse.Error(135,
                          'at least one ID field (deviceToken, installationId) ' +
                          'must be specified in this operation');
  }

  // If the device token is 64 characters long, we assume it is for iOS
  // and lowercase it.
  if (this.data.deviceToken && this.data.deviceToken.length == 64) {
    this.data.deviceToken = this.data.deviceToken.toLowerCase();
  }

  // We lowercase the installationId if present
  if (this.data.installationId) {
    this.data.installationId = this.data.installationId.toLowerCase();
  }

  let installationId = this.data.installationId;

  // If data.installationId is not set and we're not master, we can lookup in auth
  if (!installationId && !this.auth.isMaster) {
    installationId = this.auth.installationId;
  }

  if (installationId) {
    installationId = installationId.toLowerCase();
  }

  // Updating _Installation but not updating anything critical
  if (this.query && !this.data.deviceToken
                  && !installationId && !this.data.deviceType) {
    return;
  }

  var promise = Promise.resolve();

  var idMatch; // Will be a match on either objectId or installationId
  var objectIdMatch;
  var installationIdMatch;
  var deviceTokenMatches = [];

  // Instead of issuing 3 reads, let's do it with one OR.
  const orQueries = [];
  if (this.query && this.query.objectId) {
    orQueries.push({
      objectId: this.query.objectId
    });
  }
  if (installationId) {
    orQueries.push({
      'installationId': installationId
    });
  }
  if (this.data.deviceToken) {
    orQueries.push({'deviceToken': this.data.deviceToken});
  }

  if (orQueries.length == 0) {
    return;
  }

  promise = promise.then(() => {
    return this.config.database.find('_Installation', {
      '$or': orQueries
    }, {});
  }).then((results) => {
    results.forEach((result) => {
      if (this.query && this.query.objectId && result.objectId == this.query.objectId) {
        objectIdMatch = result;
      }
      if (result.installationId == installationId) {
        installationIdMatch = result;
      }
      if (result.deviceToken == this.data.deviceToken) {
        deviceTokenMatches.push(result);
      }
    });

    // Sanity checks when running a query
    if (this.query && this.query.objectId) {
      if (!objectIdMatch) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,
                                'Object not found for update.');
      }
      if (this.data.installationId && objectIdMatch.installationId &&
          this.data.installationId !== objectIdMatch.installationId) {
        throw new Parse.Error(136,
                                'installationId may not be changed in this ' +
                                'operation');
      }
      if (this.data.deviceToken && objectIdMatch.deviceToken &&
          this.data.deviceToken !== objectIdMatch.deviceToken &&
          !this.data.installationId && !objectIdMatch.installationId) {
        throw new Parse.Error(136,
                                'deviceToken may not be changed in this ' +
                                'operation');
      }
      if (this.data.deviceType && this.data.deviceType &&
          this.data.deviceType !== objectIdMatch.deviceType) {
        throw new Parse.Error(136,
                                'deviceType may not be changed in this ' +
                                'operation');
      }
    }

    if (this.query && this.query.objectId && objectIdMatch) {
      idMatch = objectIdMatch;
    }

    if (installationId && installationIdMatch) {
      idMatch = installationIdMatch;
    }
    // need to specify deviceType only if it's new
    if (!this.query && !this.data.deviceType && !idMatch) {
      throw new Parse.Error(135,
                            'deviceType must be specified in this operation');
    }

  }).then(() => {
    if (!idMatch) {
      if (!deviceTokenMatches.length) {
        return;
      } else if (deviceTokenMatches.length == 1 &&
        (!deviceTokenMatches[0]['installationId'] || !installationId)
      ) {
        // Single match on device token but none on installationId, and either
        // the passed object or the match is missing an installationId, so we
        // can just return the match.
        return deviceTokenMatches[0]['objectId'];
      } else if (!this.data.installationId) {
        throw new Parse.Error(132,
                              'Must specify installationId when deviceToken ' +
                              'matches multiple Installation objects');
      } else {
        // Multiple device token matches and we specified an installation ID,
        // or a single match where both the passed and matching objects have
        // an installation ID. Try cleaning out old installations that match
        // the deviceToken, and return nil to signal that a new object should
        // be created.
        var delQuery = {
          'deviceToken': this.data.deviceToken,
          'installationId': {
            '$ne': installationId
          }
        };
        if (this.data.appIdentifier) {
          delQuery['appIdentifier'] = this.data.appIdentifier;
        }
        this.config.database.destroy('_Installation', delQuery);
        return;
      }
    } else {
      if (deviceTokenMatches.length == 1 &&
        !deviceTokenMatches[0]['installationId']) {
        // Exactly one device token match and it doesn't have an installation
        // ID. This is the one case where we want to merge with the existing
        // object.
        const delQuery = {objectId: idMatch.objectId};
        return this.config.database.destroy('_Installation', delQuery)
          .then(() => {
            return deviceTokenMatches[0]['objectId'];
          });
      } else {
        if (this.data.deviceToken &&
          idMatch.deviceToken != this.data.deviceToken) {
          // We're setting the device token on an existing installation, so
          // we should try cleaning out old installations that match this
          // device token.
          const delQuery = {
            'deviceToken': this.data.deviceToken,
          };
          // We have a unique install Id, use that to preserve
          // the interesting installation
          if (this.data.installationId) {
            delQuery['installationId'] = {
              '$ne': this.data.installationId
            }
          } else if (idMatch.objectId && this.data.objectId
                    && idMatch.objectId == this.data.objectId) {
            // we passed an objectId, preserve that instalation
            delQuery['objectId'] = {
              '$ne': idMatch.objectId
            }
          } else {
            // What to do here? can't really clean up everything...
            return idMatch.objectId;
          }
          if (this.data.appIdentifier) {
            delQuery['appIdentifier'] = this.data.appIdentifier;
          }
          this.config.database.destroy('_Installation', delQuery);
        }
        // In non-merge scenarios, just return the installation match id
        return idMatch.objectId;
      }
    }
  }).then((objId) => {
    if (objId) {
      this.query = {objectId: objId};
      delete this.data.objectId;
      delete this.data.createdAt;
    }
    // TODO: Validate ops (add/remove on channels, $inc on badge, etc.)
  });
  return promise;
};


RestWrite.prototype.expandFilesForExistingObjects = function() {
  // Check whether we have a short-circuited response - only then run expansion.
  if (this.response && this.response.response) {
    this.config.filesController.expandFilesInObject(this.config, this.response.response);
  }
}


RestWrite.prototype.runDatabaseOperation = function() {
  if (this.response) {
    return;
  }

  if (this.className === '_Role') {
    this.config.cacheController.role.clear();
  }

  if (this.className === '_User' && this.query && !this.auth.couldUpdateUserId(this.query.objectId)) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, `Cannot modify user ${this.query.objectId}.`);
  }

  if (this.className === '_Product' && this.data.download){
    this.data.downloadName = this.data.download.name;
  }

  if (this.data.ACL && this.data.ACL['*unresolved']) {
    throw new Parse.Error(Parse.Error.INVALID_ACL, 'Invalid ACL.');
  }

  if(this.query) {
    if (this.className === '_User' && this.data.ACL) {
      this.data.ACL[this.query.objectId] = { read: true, write: true };
    }

    if (this.className === '_User' && this.data._hashed_password && this.config.passwordPolicy && this.config.passwordPolicy.maxPasswordAge) {
      this.data._password_changed_at = Parse._encode(new Date());
    }

    delete this.data.createdAt;

    let defer = Promise.resolve();
    
    if (this.className === '_User' && this.data._hashed_password && this.config.passwordPolicy && this.config.passwordPolicy.maxPasswordHistory) {
      defer = this.config.database.find('_User', { objectId: this.objectId()}, {keys: ["_password_history", "_hashed_password"]}).then(results => {
        if (results.length != 1) {
          throw undefined;
        }

        const user = results[0];
        let oldPasswords = [];
        if (user._password_history) {
          oldPasswords = _.take(user._password_history, this.config.passwordPolicy.maxPasswordHistory);
        }

        //n-1 passwords go into history including last password
        while(oldPasswords.length > this.config.passwordPolicy.maxPasswordHistory - 2) {
          oldPasswords.shift();
        }
        oldPasswords.push(user.password);
        this.data._password_history = oldPasswords;
      });
    }

    return defer.then(() => {
      return this.config.database.update(this.className, this.query, this.data, this.runOptions)
      .then(response => {
        response.updatedAt = this.updatedAt;
        this._updateResponseWithData(response, this.data);
        this.response = { response };
      });
    });
  } else {
    if (this.className === '_User') {
      var ACL  = this.data.ACL;
      if (!ACL) {
        ACL = {};
        ACL['*'] = { read: true, write: false };
      }

      ACL[this.data.objectId] = { read: true, write: true };
      this.data.ACL = ACL;

      if (this.config.passwordPolicy && this.config.passwordPolicy.maxPasswordAge) {
        this.data._password_changed_at = Parse._encode(new Date());
      }
    }

    return this.config.database.create(this.className, this.data, this.runOptions)
    .catch(error => {
      if (this.className !== '_User' || error.code !== Parse.Error.DUPLICATE_VALUE) {
        throw error;
      }

      return this.config.database.find(
        this.className,
        { username: this.data.username, objectId: {'$ne': this.objectId() }},
        { limit: 1 }
      ).then(results => {
        if (results.length > 0) {
          throw new Parse.Error(Parse.Error.USERNAME_TAKEN, 'Account already exists for this username.');
        }

        return this.config.database.find(
          this.className,
          { email: this.data.email, objectId: {'$ne': this.objectId()}},
          { limit: 1 }
        );
      }).then(results => {
        if (results.length > 0) {
          throw new Parse.Error(Parse.Error.EMAIL_TAKEN, 'Account already exists for this email address.');
        }
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A duplicate value for a field with unique values was provided');
      });
    })
    .then(response => {
      response.objectId = this.data.objectId;
      response.createdAt = this.data.createdAt;

      if(this.responseShouldHaveUsername) {
        response.username = this.data.username;
      }
      this._updateResponseWithData(response, this.data);
      this.response = {
        status: 201,
        response,
        location: this.location()
      };
    });
  }
};


RestWrite.prototype.runAfterTrigger = function() {
  if (!this.response || !this.response.response) {
    return;
  }

  const hasAfterSaveHook = triggers.triggerExists(this.className, triggers.Types.afterSave, this.config.applicationId);
  const hasLiveQuery = this.config.liveQueryController.hasLiveQuery(this.className);
  if (!hasAfterSaveHook && !hasLiveQuery) {
    return Promise.resolve();
  }

  var extraData = { className: this.className };
  if (this.query && this.query.objectId) {
    extraData.objectId = this.query.objectId;
  }

  let originalObject;
  if (this.query && this.query.objectId) {
    originalObject = triggers.inflate(extraData, this.originalData);
  }

  const updatedObject = triggers.inflate(extraData, this.originalData);
  updatedObject.set(this.sanitizedData());
  updatedObject._handleSaveResponse(this.response.response, this.response.status || 200);

  this.config.liveQueryController.onAfterSave(updatedObject.className, updatedObject, originalObject);

  return triggers.maybeRunQueryTrigger(triggers.Types.afterSave, this.auth, updatedObject, originalObject, this.config);
}


RestWrite.prototype.location = function() {
  var middle = (this.className === '_User' ? '/users/' : '/classes/' + this.className + '/');

  return this.config.mount + middle + this.data.objectId;
}


RestWrite.prototype.objectId = function(){
  return this.data.objectId || this.query.objectId;
}

RestWrite.prototype.sanitizedData = function() {
  const data = Object.keys(this.data).reduce((data, key) => {
    // Regexp comes from Parse.Object.prototype.validate
    if (!(/^[A-Za-z][0-9A-Za-z_]*$/).test(key)) {
      delete data[key];
    }
    return data;
  }, deepcopy(this.data));
  return Parse._decode(undefined, data);
}

RestWrite.prototype.clearUserAuthData = function() {
  if (this.response && this.response.response && this.className === '_User') {
    const user = this.response.response;
    if (user.authData) {
      Object.keys(user.authData).forEach((provider) => {
        if (user.authData[provider] === null) {
          delete user.authData[provider];
        }
      });
      if (Object.keys(user.authData).length === 0) {
        delete user.authData;
      }
    }
  }
};

export default RestWrite;
module.exports = RestWrite;

