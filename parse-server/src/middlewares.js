import AppCache from './cache';
import log from './logger';

var Parse = require('parse/node').Parse;
var auth = require('./Auth');
var Config = require('./Config');
var ClientSDK = require('./ClientSDK');


function handleParseHeaders(req, res, next) {
  var mountPathLength = req.originalUrl.length - req.url.length;
  var mountPath = req.originalUrl.slice(0, mountPathLength)

  var mount = req.protocol + '://' + req.get('host') + mountPath;

  var info = {
    appId: req.get('X-Parse-Application-Id'),
    sessionToken: req.get('X-Parse-Session-Token'),
    masterKey: req.get('X-Parse-Master-Key'),
    installationId: req.get('X-Parse-Installation-Id'),
    clientKey: req.get('X-Parse-Client-Key'),
    javascriptKey: req.get('X-Parse-Javascript-Key'),
    dotNetKey: req.get('X-Parse-Windows-Key'),
    restAPIKey: req.get('X-Parse-REST-API-Key'),
    clientVersion: req.get('X-Parse-Client-Version')
  };

  var basicAuth = httpAuth(req);

  if (basicAuth) {
    info.appId = basicAuth.appId;
    info.masterKey = basicAuth.masterKey || info.masterKey;
    info.javascriptKey = basicAuth.javascriptKey || info.javascriptKey;
  }
console.log('ssssssssssssssssssssssssssssssssssssssssssssssssssssss');
}



var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Parse-Master-Key, X-Parse-REST-API-Key, X-Parse-Javascript-Key, X-Parse-Application-Id, X-Parse-Client-Version, X-Parse-Session-Token, X-Requested-With, X-Parse-Revocable-Session, Content-Type');

  if ('OPTIONS' == req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
};


module.exports = {
  allowCrossDomain: allowCrossDomain,
};