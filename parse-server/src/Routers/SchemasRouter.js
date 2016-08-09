
var express = require('express'),
    Parse = require('parse/node').Parse,
    SchemaController = require('../Controllers/SchemaController');
  
import PromiseRouter from '../PromiseRouter';
import * as middleware from '../middlewares';



export class SchemasRouter extends PromiseRouter {
  mountRoutes() {
    this.route('GET', '/schemas', middleware.promiseEnforceMasterKeyAccess, getAllSchemas);
    this.route('GET', '/schemas/:className', middleware.promiseEnforceMasterKeyAccess, getOneSchema);
    this.route('POST', '/schemas', middleware.promiseEnforceMasterKeyAccess, createSchema);
    this.route('POST', '/schemas/:className', middleware.promiseEnforceMasterKeyAccess, createSchema);
    this.route('PUT', '/schemas/:className', middleware.promiseEnforceMasterKeyAccess, modifySchema);
    this.route('DELETE', '/schemas/:className', middleware.promiseEnforceMasterKeyAccess, deleteSchema);
  }
}

