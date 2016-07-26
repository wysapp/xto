var batch = require('./batch'),
    bodyParser = require('body-parser'),
    express = require('express'),
    multer = require('multer'),
    Parse = require('parse/node').Parse,
    path = require('path');

if (!global._babelPolyfill) {
  require('babel-polyfill');
}


class ParseServer {
  constructor({
    appId,
    masterKey,
    javascriptKey,
    serverURL,
    maxUploadSize = '20mb'
  }) {
    
    Parse.initialize(appId, javascriptKey || 'unused', masterKey);
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