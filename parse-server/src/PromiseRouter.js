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
  };


}