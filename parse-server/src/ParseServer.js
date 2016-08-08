var batch = require('./batch'),
    bodyParser = require('body-parser'),
    express = require('express'),
    middlewares = require('./middlewares'),
    multer = require('multer'),
    Parse = require('parse/node').Parse,
    path = require('path');

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

import {logger, configureLogger} from './logger';
import AppCache from './cache';
import Config from './Config';


import { FilesRouter } from './Routers/FilesRouter';

import { GridStoreAdapter } from './Adapters/Files/GridStoreAdapter';
import { loadAdapter } from './Adapters/AdapterLoader';

import PromiseRouter from './PromiseRouter';
import requiredParameter from './requiredParameter';
import { ClassesRouter } from './Routers/ClassesRouter';
import { FeaturesRouter } from './Routers/FeaturesRouter';

import { PushController } from './Controllers/PushController';

import DatabaseController from './Controllers/DatabaseController';
const SchemaController = require('./Controllers/SchemaController');
import ParsePushAdapter from 'parse-server-push-adapter';
import MongoStorageAdapter from './Adapters/Storage/Mongo/MongoStorageAdapter';


const requiredUserFields = {
  fields: {
    ...SchemaController.defaultColumns._Default,
    ...SchemaController.defaultColumns._User
  }
};

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

    if (verbose || process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER) {
      configureLogger({level: 'silly', jsonLogs});
    }

    const fileControllerAdapter = loadAdapter(filesAdapter, () => {
      return new GridStoreAdapter(databaseURI);
    });

    const pushControllerAdapter = loadAdapter(push && push.adapter, ParsePushAdapter, push || {});


    const pushController = new PushController(pushControllerAdapter, appId, push);
    const databaseController = new DatabaseController(databaseAdapter);

    let userClassPromise = databaseController.loadSchema()
    .then(schema => schema.enforceClassExists('_User'));
    
    let usernameUniqueness = userClassPromise
    .then(() => databaseController.adapter.ensureUniqueness('_User', requiredUserFields, ['username']))
    .catch(error => {
      logger.warn('Unable to ensure uniqueness for useranems: ', error);
    });

    let emailUniqueness = userClassPromise
    .then(() => databaseController.adapter.ensureUniqueness('_User', requiredUserFields, ['email']))
    .catch(error => {
      logger.warn('Unabled to ensure uniqueness for user email addresses: ', error);
      return Promise.reject(error);
    });

    
    AppCache.put(appId, {
      appId ,
      masterKey ,
      serverURL,
      javascriptKey,

      pushController: pushController,

      maxUploadSize,
      databaseController
    });

    Config.validate(AppCache.get(appId));
    this.config = AppCache.get(appId);

    if (process.env.TESTING) {
      __indexBuildCompletionCallbackForTests(Promise.all([usernameUniqueness, emailUniqueness]));
    }
  }

  get app() {
    return ParseServer.app(this.config);
  }

  static app({maxUploadSize = '20mb', appId}) {
    var api = express();

    api.use(function(req,res,next){
      console.log(req.method + ' : ' , req.originalUrl);
      next();
    })

    api.use('/', middlewares.allowCrossDomain, new FilesRouter().getExpressRouter({maxUploadSize: maxUploadSize}));

    api.use('/', bodyParser.urlencoded({extended: false}) );

    if (process.env.TESTING == 1) {
      api.use('/', require('./testing-routes').router);
    }
  

    api.use(bodyParser.json({'type': '*/*', limit: maxUploadSize}));
    api.use(middlewares.allowCrossDomain);
    api.use(middlewares.allowMethodOverride);
    api.use(middlewares.handleParseHeaders);


    let routers = [
      new ClassesRouter(),
      new FeaturesRouter()
    ];

    if (process.env.PARSE_EXPERIMENTAL_HOOKS_ENABLED || process.env.TESTING) {
      routers.push(new HooksRouter());
    }

    let routes = routers.reduce((memo, router) => {
      return memo.concat(router.routes);
    },[]);

    let appRouter = new PromiseRouter(routes, appId);
    batch.mountOnto(appRouter);
    api.use(appRouter.expressApp());

    api.use(middlewares.handleParseErrors);

    if(!process.env.TESTING) {
      process.on('uncaughtException', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Unable to listen on port ${err.port}. the port is already in use.`);
          process.exit(0);
        } else {
          throw err;
        }
      });
    }

    return api;

  }
}


export default ParseServer;