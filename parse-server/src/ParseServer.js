var batch = require('./batch'),
    bodyParser = require('body-parser'),
    express = require('express'),
    multer = require('multer'),
    Parse = require('parse/node').Parse,
    path = require('path');

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

import {logger, configureLogger} from './logger';
import AppCache from './cache';
import Config from './Config';

import requiredParameter from './requiredParameter';

import MongoStorageAdapter from './Adapters/Storage/Mongo/MongoStorageAdapter';


class ParseServer {
  constructor({
    appId = requiredParameter('You must provide an appId!'),
    masterKey = requiredParameter('You must provide a masterKey!'),
    appName,
    analyticsAdapter = undefined,
    filesAdapter,
    push,
    loggerAdapter,
    jsonLogs,
    logsFolder,
    databaseURI,
    databaseOptions,
    databaseAdapter,
    cloud,
    collectionPrefix = '',
    clientKey,
    javascriptKey,
    dotNetKey,
    restAPIKey,
    webhookKey,
    fileKey = undefined,
    facebookAppIds = [],
    enableAnonymousUsers = true,
    allowClientClassCreation = true,
    oauth = {},
    serverURL = requiredParameter('You must provide a serverURL!'),
    maxUploadSize = '20mb',
    verifyUserEmails = false,
    preventLoginWithUnverifiedEmail = false,
    emailVerifyTokenValidityDuration,
    cacheAdapter,
    emailAdapter,
    publicServerURL,
    customPages = {
      invalidLink: undefined,
      verifyEmailSuccess: undefined,
      choosePassword: undefined,
      passwordResetSuccess: undefined
    },
    liveQuery = {},
    sessionLength = 31536000, // 1 Year in seconds
    expireInactiveSessions = true,
    verbose = false,
    revokeSessionOnPasswordReset = true,
    __indexBuildCompletionCallbackForTests = () => {},
  }) {
    
    Parse.initialize(appId, javascriptKey || 'unused', masterKey);
    Parse.serverURL = serverURL;
    if ( (databaseOptions || databaseURI || collectionPrefix !== '' ) && databaseAdapter) {
      throw 'You cannot specify both a databaseAdapter and a databaseURI/databaseOptions/connectionPrefix.';
    } else if (!databaseAdapter) {
      databaseAdapter = new MongoStorageAdapter({
        uri: databaseURI,
        collectionPrefix,
        mongoOptions: databaseOptions,
      });
    } else {
      databaseAdapter = loadAdapter(databaseAdapter);
    }

    if(!filesAdapter && !databaseURI) {
      throw 'When using an explicit database adapter, you must also use and explicit filesAdapter.';
    }

    if(logsFolder) {
      configureLogger({logsFolder, jsonLogs});
    }
    
    AppCache.put(appId, {
      appId ,
      masterKey ,
      serverURL,
      javascriptKey,
      maxUploadSize
    });

    Config.validate(AppCache.get(appId));
    this.config = AppCache.get(appId);
  }

  get app() {
    return ParseServer.app(this.config);
  }

  static app({maxUploadSize = '20mb', appId}) {
    var api = express();

    api.use('/', bodyParser.urlencoded({extended: false}) );

    if (process.env.TESTING == 1) {
      api.use('/', require('./testing-routes').router);
    }

    let routers = [];

    api.use(bodyParser.json({'type': '*/*', limit: maxUploadSize}));

    if (process.env.PARSE_EXPERIMENTAL_HOOKS_ENABLED || process.env.TESTING) {
      
    }

    return api;

  }
}


export default ParseServer;