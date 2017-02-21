// A Config object provides information about how a specific app is
// configured.
// mount is the URL for the root of the API; includes http, domain, etc.

import AppCache from './cache';
import SchemaCache from './Controllers/SchemaCache';
import DatabaseController from './Controllers/DatabaseController';

function removeTrailingSlash(str) {
  if (!str) {
    return str;
  }
  if (str.endsWith('/')) {
    str = str.substr(0, str.length - 1);
  }
  return str;
}


export class Config {
  
  constructor(applicationId: string, mount: string) {
    const cacheInfo = AppCache.get(applicationId);
    if (!cacheInfo) {
      return;
    }

    this.applicationId = applicationId;
    this.jsonLogs = cacheInfo.jsonLogs;
    this.masterKey = cacheInfo.masterKey;
    this.clientKey = cacheInfo.clientKey;
    this.javascriptKey = cacheInfo.javascriptKey;
    this.dotNetKey = cacheInfo.dotNetKey;
    this.restAPIKey = cacheInfo.restAPIKey;
    this.webhookKey = cacheInfo.webhookKey;
    this.fileKey = cacheInfo.fileKey;
    this.allowClientClassCreation = cacheInfo.allowClientClassCreation;
    this.userSensitiveFields = cacheInfo.userSensitiveFields;

    // Create a new DatabaseController per request
    if (cacheInfo.databaseController) {
      const schemaCache = new SchemaCache(cacheInfo.cacheController, cacheInfo.schemaCacheTTL, cacheInfo.enableSingleSchemaCache);
      this.database = new DatabaseController(cacheInfo.databaseController.adapter, schemaCache);
    }

    this.schemaCacheTTL = cacheInfo.schemaCacheTTL;
    this.enableSingleSchemaCache = cacheInfo.enableSingleSchemaCache;

    this.serverURL = cacheInfo.serverURL;
    this.publicServerURL = removeTrailingSlash(cacheInfo.publicServerURL);
    this.verifyUserEmails = cacheInfo.verifyUserEmails;
    this.preventLoginWithUnverifiedEmail = cacheInfo.preventLoginWithUnverifiedEmail;
    this.emailVerifyTokenValidityDuration = cacheInfo.emailVerifyTokenValidityDuration;
    this.accountLockout = cacheInfo.accountLockout;
    this.passwordPolicy = cacheInfo.passwordPolicy;
    this.appName = cacheInfo.appName;

    this.analyticsController = cacheInfo.analyticsController;
    this.cacheController = cacheInfo.cacheController;
    this.hooksController = cacheInfo.hooksController;
    this.filesController = cacheInfo.filesController;
    this.pushController = cacheInfo.pushController;
    this.pushControllerQueue = cacheInfo.pushControllerQueue;
    this.pushWorker = cacheInfo.pushWorker;
    this.hasPushSupport = cacheInfo.hasPushSupport;
    this.loggerController = cacheInfo.loggerController;
    this.userController = cacheInfo.userController;
    this.authDataManager = cacheInfo.authDataManager;
    this.customPages = cacheInfo.customPages || {};
    this.mount = removeTrailingSlash(mount);
    this.liveQueryController = cacheInfo.liveQueryController;
    this.sessionLength = cacheInfo.sessionLength;
    this.expireInactiveSessions = cacheInfo.expireInactiveSessions;
    this.generateSessionExpiresAt = this.generateSessionExpiresAt.bind(this);
    this.generateEmailVerifyTokenExpiresAt = this.generateEmailVerifyTokenExpiresAt.bind(this);
    this.revokeSessionOnPasswordReset = cacheInfo.revokeSessionOnPasswordReset;
  }

  static validate({
    verifyUserEmails,
    userController,
    appName,
    publicServerURL,
    revokeSessionOnPasswordReset,
    expireInactiveSessions,
    sessionLength,
    emailVerifyTokenValidityDuration,
    accountLockout,
    passwordPolicy
  }) {    
    
    const emailAdapter = userController.adapter;

    if (verifyUserEmails){
      this.validateEmailConfiguration({emailAdapter, appName, publicServerURL, emailVerifyTokenValidityDuration});
    }

    this.validateAccountLockoutPolicy(accountLockout);

    this.validatePasswordPolicy(passwordPolicy);

    if (typeof revokeSessionOnPasswordReset !== 'boolean') {
      throw 'revokeSessionOnPasswordReset must be a boolean value';
    }

    if (publicServerURL) {
      if (!publicServerURL.startsWith("http://") && !publicServerURL.startsWith("https://")) {        
        throw "publicServerURL should be a valid HTTPS URL starting with https://"
      }
    }

    this.validateSessionConfiguration(sessionLength, expireInactiveSessions);
  }

  static validateAccountLockoutPolicy(accountLockout) {
    if (accountLockout) {
      if (typeof accountLockout.duration !== 'number' || accountLockout.duration <= 0 || accountLockout.duration > 99999) {
        throw 'Account lockout duration should be greater than 0 and less than 100000';
      }

      if (!Number.isInteger(accountLockout.threshold) || accountLockout.threshold < 1 || accountLockout.threshold > 999 ) {
        throw 'Account lockout threshold should be an integer greater than 0 and less than 1000';
      }
    }
  }

  static validatePasswordPolicy(passwordPolicy) {
    if (passwordPolicy) {
      if (passwordPolicy.maxPasswordAge !== undefined && (typeof passwordPolicy.maxPasswordAge !== 'number' || passwordPolicy.maxPasswordAge < 0)) {
        throw 'passwordPolicy.maxPasswordAge must be a positive number';
      }

      if (passwordPolicy.resetTokenValidityDuration !== undefined && (typeof passwordPolicy.resetTokenValidityDuration !== 'number' || passwordPolicy.resetTokenValidityDuration <= 0)) {
        throw 'passwordPolicy.resetTokenValidityDuration must be a positive number';
      }

      if(passwordPolicy.validatorPattern){
        if(typeof(passwordPolicy.validatorPattern) === 'string') {
          passwordPolicy.validatorPattern = new RegExp(passwordPolicy.validatorPattern);
        }
        else if(!(passwordPolicy.validatorPattern instanceof RegExp)){
          throw 'passwordPolicy.validatorPattern must be a regex string or RegExp object.';
        }
      }


      if(passwordPolicy.validatorCallback && typeof passwordPolicy.validatorCallback !== 'function') {
        throw 'passwordPolicy.validatorCallback must be a function.';
      }

      if(passwordPolicy.doNotAllowUsername && typeof passwordPolicy.doNotAllowUsername !== 'boolean') {
        throw 'passwordPolicy.doNotAllowUsername must be a boolean value.';
      }

      if (passwordPolicy.maxPasswordHistory && (!Number.isInteger(passwordPolicy.maxPasswordHistory) || passwordPolicy.maxPasswordHistory <= 0 || passwordPolicy.maxPasswordHistory > 20)) {
        throw 'passwordPolicy.maxPasswordHistory must be an integer ranging 0 - 20';
      }
    }
  }


  // if the passwordPolicy.validatorPattern is configured then setup a callback to process the pattern
  static setupPasswordValidator(passwordPolicy) {
    if (passwordPolicy && passwordPolicy.validatorPattern) {
      passwordPolicy.patternValidator = (value) => {
        return passwordPolicy.validatorPattern.test(value);
      }
    }
  }


  static validateSessionConfiguration(sessionLength, expireInactiveSessions) {
    if (expireInactiveSessions) {
      if (isNaN(sessionLength)) {
        throw 'Session length must be a valid number.';
      } else if (sessionLength <= 0) {
        throw 'Session length must be a value greater than 0.'
      }
    }
  }

  generateEmailVerifyTokenExpiresAt(){
    if (!this.verifyUserEmails || !this.emailVerifyTokenValidityDuration) {
      return undefined;
    }
    var now = new Date();
    return new Date(now.getTime() + (this.emailVerifyTokenValidityDuration * 1000));
  }

  


  generateSessionExpiresAt() {
    if (!this.expireInactiveSessions) {
      return undefined;
    }

    var now = new Date();
    return new Date(now.getTime() + (this.sessionLength * 1000));
  }

}

export default Config;
module.exports = Config;