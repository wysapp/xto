var Parse = require('parse/node').Parse;
var SchemaController = require('../Controllers/SchemaController');

import PromiseRouter from '../PromiseRouter';
import * as middlewares from '../middlewares';



function getAllSchemas(req) {
  return req.config.database.loadSchema({clearCache: true})
  .then(SchemaController => SchemaController.getAllClasses(true))
  .then(schemas => ({response: { results: schemas}}));
}

export class SchemasRouter extends PromiseRouter {
  mountRoutes() {
    this.route('GET', '/schemas', middlewares.promiseEnforceMasterKeyAccess, getAllSchemas);
  }
}