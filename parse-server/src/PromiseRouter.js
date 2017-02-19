// A router that is based on promises rather than req/res/next.
// This is intended to replace the use of express.Router to handle
// subsections of the API surface.
// This will make it easier to have methods like 'batch' that
// themselves use our routing information, without disturbing express
// components that external developers may be modifying.

import Parse from 'parse/node';
import express from 'express';
import log from './logger';
import {inspect} from 'util';

const Layer = require('express/lib/router/layer');

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

    if (handlers.length > 1) {
      handler = function(req) {
        return handlers.reduce((promise, handler) => {
          return promise.then(() => {
            return handler(req);
          })
        }, Promise.resolve());
      }
    }

    this.routes.push({
      path: path,
      method: method,
      handler: handler,
      layer: new Layer(path, null, handler)
    });
  }

  mountOnto(expressApp) {
    this.routes.forEach((route) => {
      const method = route.method.toLowerCase();
      const handler = makeExpressHandler(this.appId, route.handler);
      expressApp[method].call(expressApp, route.path, handler);
    });

    return expressApp;
  }


  expressRouter() {
    return this.mountOnto(express.Router());
  }

}

// A helper function to make an express handler out of a a promise
// handler.
// Express handlers should never throw; if a promise handler throws we
// just treat it like it resolved to an error.
function makeExpressHandler(appId, promiseHandler) {
  return function(req, res, next) {
    try {
      const url = maskSensitiveUrl(req);
      const body = Object.assign({}, req.body);
      const stringifiedBody = JSON.stringify(body, null, 2);

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

        const stringifiedResponse = JSON.stringify(result, null, 2);
        log.verbose(
          `RESPONSE from [${req.method}] ${url}: ${stringifiedResponse}`,
          {result: result}
        );

        var status = result.status || 200;
        res.status(status);

        if (result.text) {
          res.send(result.text);
          return;
        }

        if (result.location) {
          res.set('Location', result.location);
          // Override the default expressjs response
          // as it double encodes %encoded chars in URL
          if (!result.response) {
            res.send('Found. Redirecting to ' + result.location);
            return;
          }
        }

        if (result.headers) {
          Object.keys(result.headers).forEach((header) => {
            res.set(header, result.headers[header]);
          })
        }
        res.json(result.response);
      }, (e) => {
        log.error(`Error generating response. ${inspect(e)}`, {error: e});
        next(e);
      });

    } catch(e) {
      log.error(`Error handling request: ${inspect(e)}`, {error: e});
      next(e);
    }
  }
}

function maskSensitiveUrl(req) {
  let maskUrl = req.originalUrl.toString();
  const shouldMaskUrl = req.method === 'GET' && req.originalUrl.includes('/login') && !req.originalUrl.includes('classes');

  if (shouldMaskUrl) {
    maskUrl = log.maskSensitiveUrl(maskUrl);
  }
  return maskUrl;
}



