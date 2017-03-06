// A database adapter that works with data exported from the hosted
// Parse database.

import { Parse } from 'parse/node';
import _ from 'lodash';
import intersect from 'intersect';
import deepcopy from 'deepcopy';
import logger from '../logger';
import * as SchemaController from './SchemaController';

function addReadACL(query, acl) {
  const newQuery = _.cloneDeep(query);

  if (newQuery.hasOwnProperty('$or')){
    newQuery.$or = newQuery.$or.map(function(qobj) {
      qobj._rperm = {'$in': [null, '*', ...acl]};
      return qobj;
    });
  } else {
    newQuery._rperm = {'$in':[null, '*', ...acl]};
  }

  return newQuery;
}


const transformObjectACL = ({ACL, ...result}) => {
  if (!ACL) {
    return result;
  }

  result._wperm = [];
  result._rperm = [];

  for (const entry in ACL) {
    if (ACL[entry].read) {
      result._rperm.push(entry);
    }
    if (ACL[entry].write) {
      result._wperm.push(entry);
    }
  }
  return result;
}


const specialQuerykeys = ['$and', '$or', '_rperm', '_wperm', '_perishable_token', '_email_verify_token', '_email_verify_token_expires_at', '_account_lockout_expires_at', '_failed_login_count'];

const isSpecialQueryKey = key => {
  return specialQuerykeys.indexOf(key) >= 0;
}





const validateQuery = query => {
  if (query.ACL) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Cannot query on ACL.');
  }

  if (query.$or) {
    if (query.$or instanceof Array){
      query.$or.forEach(validateQuery);
    } else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bad $or format - use an array value.');
    }
  }

  if (query.$and){
    if (query.$and instanceof Array) {
      query.$and.forEach(validateQuery);
    }else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bad $and format - use an array value.');
    }
  }

  Object.keys(query).forEach(key => {
    if (query && query[key] && query[key].$regex) {
      if (typeof query[key].$options === 'string') {
        if (!query[key].$options.match(/^[imxs]+$/)) {
          throw new Parse.Error(Parse.Error.INVALID_QUERY, `Bad $options value for query: ${query[key].$options}`);
        }
      }
    }

    if (!isSpecialQueryKey(key) && !key.match(/^[a-zA-Z][a-zA-Z0-9_\.]*$/)) {
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid key name: ${key}`);
    }
  });
}

function DatabaseController(adapter, schemaCache) {
  this.adapter = adapter;
  this.schemaCache = schemaCache;

  this.schemaPromise = null;
}


DatabaseController.prototype.collectionExists = function(className) {
  return this.adapter.classExists(className);
}


DatabaseController.prototype.validateClassName = function(className) {
  if (!SchemaController.classNameIsValid(className)) {
    return Promise.reject(new Parse.Error(Parse.Error.INVALID_CLASS_NAME, 'invalid className: '+ className));
  }
  return Promise.resolve();
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


DatabaseController.prototype.validateObject = function(className, object, query, { acl }) {
  let schema;
  const isMaster = acl === undefined;
  var aclGroup = acl || [];
  return this.loadSchema().then(s => {
    schema = s;
    if (isMaster) {
      return Promise.resolve();
    }
    return this.canAddField(schema, className, object, aclGroup);
  }).then(() => {
    return schema.validateObject(className, object, query);
  })
}


function sanitizeDatabaseResult(originalObject, result) {
  
  const response = {};
  if (!result){
    return Promise.resolve(response);
  }

  Object.keys(originalObject).forEach(key => {
    const keyUpdate = originalObject[key];

    if (keyUpdate && typeof keyUpdate === 'object' && keyUpdate.__op && ['Add', 'AddUnique', 'Remove', 'Increment'].indexOf(keyUpdate.__op) > -1) {
      response[key] = result[key];
    }
  });
  return Promise.resolve(response);
}


DatabaseController.prototype.handleRelationUpdates = function(className, objectId, update) {
  var pending = [];
  var deleteMe = [];
  objectId = update.objectId || objectId;

  var process = (op, key) => {
    if (!op) {
      return;
    }
    if (op.__op == 'AddRelation') {
      for (const object of op.objects) {
        pending.push(this.addRelation(key, className, objectId, object.objectId));
      }
      deleteMe.push(key);
    }

    if (op.__op == 'RemoveRelation') {
      for (const object of op.objects) {
        pending.push(this.removeRelation(key, className, objectId, object.objectId));
      }
      deleteMe.push(key);
    }

    if (op.__op == 'Batch') {
      for (var x of op.ops) {
        process(x, key);
      }
    }
  };

  for (const key in update) {
    process(update[key], key);
  }

  for (const key of deleteMe) {
    delete update[key];
  }
  return Promise.all(pending);
}

// Adds a relation.
// Returns a promise that resolves successfully iff the add was successful.
const relationSchema = { fields: { relatedId: { type: 'String'}, owningId: {type: 'String'}}};


const flattenUpdateOperatorsForCreate = object => {
  for (const key in object) {
    if (object[key] && object[key].__op) {
      switch(object[key].__op) {
      case 'Increment':
        if (typeof object[key].amount !== 'number') {
          throw new Parse.Error(Parse.Error.INVALID_JSON, 'objects to add must be an array');
        }
        object[key] = object[key].amount;
        break;
      case 'Add':
        if (!(object[key].objects instanceof Array)) {
          throw new Parse.Error(Parse.Error.INVALID_JSON, 'objects to add must be an array');
        }
        object[key] = object[key].objects;
        break;
      case 'AddUnique':
        if (!(object[key].objects instanceof Array)) {
          throw new Parse.Error(Parse.Error.INVALID_JSON, 'objects to add must be an array');
        }
        object[key] = object[key].objects;
        break;
      case 'Remove':
        if (!(object[key].objects instanceof Array)) {
          throw new Parse.Error(Parse.Error.INVALID_JSON, 'objects to add must be an array');          
        }
        object[key] = [];
        break;
      case 'Delete':
        delete object[key];
        break;
      default:
        throw new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE, `The ${object[key].__op} operator is not supported yet.`);
      }
    }
  }
}

const transformAuthData = function(className, object, schema) {
  if (object.authData && className === '_User') {
    Object.keys(object.authData).forEach(provider => {
      const providerData = object.authData[provider];
      const fieldName = `_auth_data_${provider}`;
      if (providerData == null) {
        object[fieldName] = {
          __op: 'Delete'
        }
      } else {
        object[fieldName] = providerData;
        schema.fields[fieldName] = { type: 'Object' };
      }
    });
    delete object.authData;
  }
}


DatabaseController.prototype.create = function(className, object, { acl } = {}) {
  const originalObject = object;
  object = transformObjectACL(object);

  object.createdAt = { iso: object.createdAt, __type: 'Date' };
  object.updatedAt = { iso: object.updatedAt, __type: 'Date' };

  var isMaster = acl === undefined;
  var aclGroup = acl || [];

  return this.validateClassName(className)
  .then(() => this.loadSchema())
  .then(schemaController => {
    return (isMaster ? Promise.resolve() : schemaController.validatePermission(className, aclGroup, 'create'))
    .then(() => this.handleRelationUpdates(className, null, object))
    .then(() => schemaController.enforceClassExists(className))
    .then(() => schemaController.reloadData())
    .then(() => schemaController.getOneSchema(className, true))
    .then(schema => {
      transformAuthData(className, object, schema);
      flattenUpdateOperatorsForCreate(object);
      return this.adapter.createObject(className, SchemaController.convertSchemaToAdapterSchema(schema), object);
    })
    .then(result => sanitizeDatabaseResult(originalObject, result.ops[0]));
  })
}


DatabaseController.prototype.relatedIds = function(className, key, owningId) {
  return this.adapter.find(joinTableName(className, key), relationSchema, {owningId}, {})
    .then(results => results.map(result => result.relatedId));
}


DatabaseController.prototype.owningIds = function(className, key, relatedIds) {
  return this.adapter.find(joinTableName(className, key), relationSchema, {
    relatedId: {'$in': relatedIds}
  }, {})
  .then(results => results.map(result => result.owningId));
}


DatabaseController.prototype.reduceInRelation = function(className, query, schema) {
  if (query['$or']) {
    const ors = query['$or'];
    return Promise.all(ors.map((aQuery, index) => {
      return this.reduceInRelation(className, aQuery, schema).then((aQuery) => {
        query['$or'][index] = aQuery;
      });
    })).then(() => {
      return Promise.resolve(query);
    });
  }

  const promises = Object.keys(query).map((key) => {
    if (query[key] && (query[key]['$in'] || query[key]['$ne'] || query[key]['$nin'] || query[key].__type == 'Pointer')) {
      const t = schema.getExpectedType(className, key);
      if (!t || t.type !== 'Relation') {
        return Promise.resolve(query);
      }

      const queries = Object.keys(query[key]).map((constraintKey) => {
        let relatedIds;
        let isNegation = false;
        if (constraintKey === 'objectId') {
          relatedIds = [query[key].objectId];
        } else if (constraintKey == '$in') {
          relatedIds = query[key]['$in'].map(r => r.objectId);
        } else if (constraintKey == '$nin') {
          isNegation = true;
          relatedIds = query[key]['$nin'].map(r => r.objectId);
        } else if (constraintKey == '$ne') {
          isNegation = true;
          relatedIds = [query[key]['$ne'].objectId];
        } else {
          return;
        }
        return {
          isNegation,
          relatedIds
        }
      });

      delete query[key];

      const promises = queries.map((q) => {
        if (!q) {
          return Promise.resolve();
        }
        return this.owningIds(className, key, q.relatedIds).then((ids)=> {
          if (q.isNegation) {
            this.addNotInObjectIdsIds(ids, query);
          } else {
            this.addInObjectIdsIds(ids, query);
          }
          return Promise.resolve();
        });
      });

      return Promise.all(promises).then(() => {
        return Promise.resolve();
      })
    }

    return Promise.resolve();
  })

  return Promise.all(promises).then(() => {
    return Promise.resolve(query);
  })
}


DatabaseController.prototype.reduceRelationKeys = function(className, query) {
  if (query['$or']) {
    return Promise.all(query['$or'].map((aQuery) => {
      return this.reduceRelationKeys(className, aQuery);
    }));
  }

  var relatedTo = query['$relatedTo'];
  if (relatedTo) {
    return this.relatedIds(
      relatedTo.object.className,
      relatedTo.key,
      relatedTo.object.objectId
    ).then((ids) => {
      delete query['$relatedTo'];
      this.addInObjectIdsIds(ids, query);
      return this.reduceRelationKeys(className, query);
    })
  }
}


DatabaseController.prototype.addInObjectIdsIds = function(ids = null, query) {
  const idsFromString = typeof query.objectId === 'string' ? [query.objectId] : null;

  const idsFromEq = query.objectId && query.objectId['$eq'] ? [query.objectId['$eq']] : null;
  const idsFromIn = query.objectId && query.objectId['$in'] ? query.objectId['$in'] : null;

  const allIds = [idsFromString, idsFromEq, idsFromIn, ids].filter(list => list !== null);

  const totalLength = allIds.reduce((memo, list) => memo + list.length, 0);

  let idsIntersection = [];
  if (totalLength > 125) {
    idsIntersection = intersect.big(allIds);
  } else {
    idsIntersection = intersect(allIds);
  }

  if (!('objectId' in query)) {
    query.objectId = {};
  } else if (typeof query.objectId === 'string') {
    query.objectId = {
      $eq: query.objectId
    };
  }

  query.objectId['$in'] = idsIntersection;

  return query;
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
    
    return schemaController.getOneSchema(className, isMaster)
    .catch(error => {
      if (error === undefined){
        classExists = false;
        return {fields: {}};
      }
      throw error;
    })
    .then(schema => {
      if (sort._created_at) {
        sort.createdAt = sort._created_at;
        delete sort._created_at;
      }
      if (sort._updated_at) {
        sort.updatedAt = sort._updated_at;
        delete sort._updated_at;
      }

      Object.keys(sort).forEach(fieldName => {
        if(fieldName.match(/^authData\.([a-zA-Z0-9_]+)\.id$/)) {
          throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Cannot sort by ${fieldName}`);
        }

        if (!SchemaController.fieldNameIsValid(fieldName)) {
          throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid field name: ${fieldName}.`);
        }
      });

      return (isMaster ? Promise.resolve() : schemaController.validatePermission(className, aclGroup, op))
      .then(() => this.reduceRelationKeys(className, query))
      .then(() => this.reduceInRelation(className, query, schemaController))
      .then(() => {
        if (!isMaster) {
          query = this.addPointerPermissions(schemaController, className, op, query, aclGroup);
        }

        if (!query) {
          if (op == 'get') {
            throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Object not found.');
          } else {
            return [];
          }
        }

        if (!isMaster) {
          query = addReadACL(query, aclGroup);
        }

        validateQuery(query);

        if (count) {
          if (!classExists) {
            return 0;
          } else{
            return this.adapter.count(className, schema, query);
          }
        } else {
          if (!classExists) {
            return [];
          } else {
            return this.adapter.find(className, schema, query, {skip, limit, sort, keys})
            .then(objects => objects.map(object => {
              object = untransformObjectACL(object);
              return filterSensitiveData(isMaster, aclGroup, className, object);
            }));
          }
        }
      });
    });
  });
}


DatabaseController.prototype.deleteSchema = function(className) {
  return this.loadSchema(true)
  .then(schemaController => schemaController.getOneSchema(className, true))
  .catch(error => {
    if (error === undefined) {
      return { fields: {} };
    } else {
      throw error;
    }
  })
  .then(schema => {
    return this.collectionExists(className)
    .then(() => this.adapter.count(className, { fields: {} }))
    .then( count => {
      if (count > 0) {
        throw new Parse.Error(255, `Class ${className} is not empty, contains ${count} object, cannot drop schema.`);
      }
      return this.adapter.deleteClass(className);
    })
    .then(wasParseCollection => {
      if (wasParseCollection) {
        const relationFieldNames = Object.keys(schema.fields).filter(fieldName => schema.fields[fieldName].type === 'Relation');
        return Promise.all(relationFieldNames.map(name => this.adapter.deleteClass(joinTableName(className, name))));
      } else {
        return Promise.resolve();
      }
    });
  })
}


function joinTableName(className, key) {
  return `Join:${key}:${className}`;
}

module.exports = DatabaseController;

