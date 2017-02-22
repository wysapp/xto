// A database adapter that works with data exported from the hosted
// Parse database.

import { Parse } from 'parse/node';
import _ from 'lodash';
import intersect from 'intersect';
import deepcopy from 'deepcopy';
import logger from '../logger';
import * as SchemaController from './SchemaController';



function DatabaseController(adapter, schemaCache) {
  this.adapter = adapter;
  this.schemaCache = schemaCache;

  this.schemaPromise = null;
}


DatabaseController.prototype.loadSchema = function(options = {clearCache: false}) {
  if (!this.schemaPromise) {
    this.schemaPromise = SchemaController.load(this.adapter, this.schemaCache, options);
    this.schemaPromise.then(() => delete this.schemaPromise, () => delete this.schemaPromise);
  }
  return this.schemaPromise;
}

// Returns a promise for the classname that is related to the given
// classname through the key.
// TODO: make this not in the DatabaseController interface
DatabaseController.prototype.redirectClassNameForKey = function(className, key) {
  return this.loadSchema().then((schema) => {
    var t = schema.getExpectedType(className, key);
    if (t && t.type == 'Relation') {
      return t.targetClass;
    } else {
      return className;
    }
  });
}


module.exports = DatabaseController;