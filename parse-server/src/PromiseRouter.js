import AppCache from './cache';
import express from 'express';
import url from 'url';
import log from './logger';
import { inspect } from 'util';

export default class PromiseRouter {

  constructor(routes = [], appId) {
    this.routes = routes;
    this.appId = appId;
    this.mountRoutes();
  }

  mountRoutes() {}


  route(method, path, ...handlers) {
    switch(method) {
    case 'POST':
    case 'GET':
    case 'PUT':
    case 'DELETE':
      break;
    default: 
      throw 'cannot route method: ' + method;
    }

    let handler = handlers[0];
    if(handlers.length > 1) {
      const length = handlers.length;
      handler = function(req) {
        return handlers.reduce((promise, handler) => {
          return promise.then((result) => {
            return handler(req);
          });
        }, Promise.resolve());
      }
    }

    this.routes.push({
      path: path,
      method: method,
      handler: handler
    });
  }

  match(method, path) {
    for (var route of this.routes) {
      if(route.method != method) {
        continue;
      }

      var pattern = '^' + route.path + '$';
      pattern = pattern.replace(':className','(_?[A-Za-z][A-Za-z_0-9]*)');
      pattern = pattern.replace(':objectId', '([A-Za-z0-9]+)');

      var re = new RegExp(pattern);
      var m = path.match(re);
      if(!m) {
        continue;
      }
      var params = {};
      if (m[1]) {
        params.className = m[1];
      }
      if (m[2]) {
        params.objectId = m[2];
      }

      return {params: params, handler: route.handler};
    }
  }

  expressApp() {
    var expressApp = express();
    for (var route of this.routes) {
      switch(route.method) {
      case 'POST':
        expressApp.post(route.path, makeExpressHandler(this.appId, route.handler));
        break;
      case 'GET':
        expressApp.get(route.path, makeExpressHandler(this.appId, route.handler));
        break;
      case 'PUT':
        expressApp.get(route.path, makeExpressHandler(this.appId, route.handler));
        break;
      case 'DELETE':
        expressApp.get(route.path, makeExpressHandler(this.appId, route.handler));
        break;
      default:
        throw 'unexpected code branch';
      }
    }

    return expressApp;
  }

}

function makeExpressHandler(appId, promiseHandler) {
  let config = AppCache.get(appId);
  return function(req, res, next) {
    try {
      let url = maskSensitiveUrl(req);
      let body = maskSensitiveBody(req);
      let stringifiedBody = JSON.stringify(body, null, 2);
      log.verbose(`REQUEST for [${req.method}] ${url}: ${stringifiedBody}`, {
        method: req.method,
        url: url,
        headers: req.headers,
        body: body
      });

      promiseHandler(req).then((result) => {
        if (!result.response && !result.location && !result.text) {
          log.error('the handler did not include a "response" or a "location" field');
          throw 'control should not get here';
        }

        let stringifiedResponse = JSON.stringify(result, null, 2);
        log.verbose(
          `RESPONSE from [${req.method}] ${url}: ${stringifiedResponse}`, {result: result}
        );

        var status = result.status || 200;
        res.status(status);
        if(result.text) {
          res.send(result.text);
          return next();
        }

        if(result.location) {
          res.set('Location', result.location);

          if(!result.response) {
            res.send('Found . Redirecting to ' + result.location);
            return next();
          }
        }

        if(result.headers) {
          Object.keys(result.headers).forEach((header) => {
            res.set(header, result.headers[header]);
          })
        }

        res.json(result.response);
        next();
      }, (e) => {
        log.error(`Error generating response . ${inspect(e)}`, {error: e});
        next();
      });
    } catch(e) {
      log.error(`Error handling request: ${inspect(e)}`, {error: e});
      next();
    }
  }
}


function maskSensitiveBody(req) {
  let maskBody = Object.assign({}, req.body);
  let shouldMaskBody = (req.method === 'POST' && req.originalUrl.endsWith('/users')
                       && !req.originalUrl.includes('classes')) ||
                       (req.method === 'PUT' && /users\/\w+$/.test(req.originalUrl)
                       && !req.originalUrl.includes('classes')) ||
                       (req.originalUrl.includes('classes/_User'));

  if ( shouldMaskBody) {
    for (let key of Object.keys(maskBody)) {
      if ( key == 'password') {
        maskBody[key] = '********';
        break;
      }
    }
  }
  return maskBody;
}


function maskSensitiveUrl(req) {
  let maskUrl = req.originalUrl.toString();
  let shouldMaskUrl = req.method === 'GET' && req.originalUrl.includes('/login') && !req.originalUrl.includes('classes');

  if(shouldMaskUrl) {
    let password = url.parse(req.originalUrl, true).query.password;
    if(password) {
      maskUrl = maskUrl.replace('password=' + password, 'password=********');
    }
  }

  return maskUrl;
}




