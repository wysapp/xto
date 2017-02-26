var Parse = require('parse/node').Parse;
var SchemaController = require('../Controllers/SchemaController');

import PromiseRouter from '../PromiseRouter';
import * as middleware from '../middlewares';



function getAllSchemas(req) {
  return req.config.database.loadSchema({clearCache: true})
  .then(SchemaController => SchemaController.getAllClasses(true))
  .then(schemas => ({response: { results: schemas}}));
}


function createSchema(req) {
  if (req.params.className && req.body.className) {
    if (req.params.className != req.body.className) {
      return classNameMismatchResponse(req.body.className, req.params.className);
    }
  }

  const className = req.params.className || req.body.className;
  if (!className) {
    throw new Parse.Error(135, `POST ${req.path} needs a class name.`);
  }

  return req.config.database.loadSchema({clearCache: true})
    .then(schema => schema.addClassIfNotExists(className, req.body.fields, req.body.classLevelPermissions))
    .then(schema => {
      console.log('22222222222222222222222', schema);
      return {response: schema};
    });
}

export class SchemasRouter extends PromiseRouter {
  mountRoutes() {
    this.route('GET', '/schemas', middleware.promiseEnforceMasterKeyAccess, getAllSchemas);

    this.route('POST', '/schemas/:className', middleware.promiseEnforceMasterKeyAccess, createSchema);
  }
}