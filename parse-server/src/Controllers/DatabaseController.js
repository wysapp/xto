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
    this.schemaPromise.then(() => {console.log('2222222222222222222222'); delete this.schemaPromise}, () => {console.log('2222222222222222223333333333'); delete this.schemaPromise});
  }
  console.log('2222222----------', this.schemaPromise);
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


// Runs a query on the database.
// Returns a promise that resolves to a list of items.
// Options:
//   skip    number of results to skip.
//   limit   limit to this number of results.
//   sort    an object where keys are the fields to sort by.
//           the value is +1 for ascending, -1 for descending.
//   count   run a count instead of returning results.
//   acl     restrict this operation with an ACL for the provided array
//           of user objectIds and roles. acl: null means no user.
//           when this field is not present, don't do anything regarding ACLs.
// TODO: make userIds not needed here. The db adapter shouldn't know
// anything about users, ideally. Then, improve the format of the ACL
// arg to work like the others.
DatabaseController.prototype.find = function(className, query, {
  skip,
  limit,
  acl,
  sort = {},
  count,
  keys,
  op
} = {}) {
  const isMaster = acl === undefined;
  const aclGroup = acl || [];
  op = op || (typeof query.objectId == 'string' && Object.keys(query).length === 1 ? 'get' : 'find');
  let classExists = true;

  return this.loadSchema()
  .then(schemaController => {
    console.log('1111111111111111111111111', schemaController);
  })
}


module.exports = DatabaseController;

