
import intersect from 'intersect';
import _ from 'lodash';

var mongodb = require('mongodb');
var Parse = require('parse/node').Parse;

var SchemaController = require('./SchemaController');

const deepcopy = require('deepcopy');


const validateQuery = query => {
  if (query.ACL) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Cannot query on ACL.');
  }

  if (query.$or) {
    if (query.$or instanceof Array) {
      query.$or.forEach(validateQuery);
    } else {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bad $or format - use an array value.');
    }
  }

  if (query.$and) {
    if (query.$and instanceof Array) {
      query.$and.forEach(validateQuery);
    } else {
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
    if (!specialQuerykeys.includes(key) && !key.match(/^[a-zA-Z][a-zA-Z0-9_\.]*$/)) {
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid key name: ${key}`);
    }
  });
}


function DatabaseController(adapter) {
  this.adapter = adapter;
  this.schemaPromise = null;
}


DatabaseController.prototype.loadSchema = function() {
  if (!this.schemaPromise) {
    this.schemaPromise = SchemaController.load(this.adapter);
    this.schemaPromise.then(() => delete this.schemaPromise);
  }
  return this.schemaPromise;
}


DatabaseController.prototype.reduceInRelation = function(className, query, schema) {

  // Search for an in-relation or equal-to-relation
  // Make it sequential for now, not sure of paralleization side effects
  if (query['$or']) {
    let ors = query['$or'];
    return Promise.all(ors.map((aQuery, index) => {
      return this.reduceInRelation(className, aQuery, schema).then((aQuery) => {
        query['$or'][index] = aQuery;
      });
    })).then(() => {
      return Promise.resolve(query);
    });
  }

  let promises = Object.keys(query).map((key) => {
    if (query[key] && (query[key]['$in'] || query[key]['$ne'] || query[key]['$nin'] || query[key].__type == 'Pointer')) {
      let t = schema.getExpectedType(className, key);
      if (!t || t.type !== 'Relation') {
        return Promise.resolve(query);
      }
      let relatedClassName = t.targetClass;
      // Build the list of queries
      let queries = Object.keys(query[key]).map((constraintKey) => {
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

      // remove the current queryKey as we don,t need it anymore
      delete query[key];
      // execute each query independnently to build the list of
      // $in / $nin
      let promises = queries.map((q) => {
        if (!q) {
          return Promise.resolve();
        }
        return this.owningIds(className, key, q.relatedIds).then((ids) => {
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

  return Promise.all(promises).then(() => {
    return Promise.resolve(query);
  })
};



// Modifies query so that it no longer has $relatedTo
// Returns a promise that resolves when query is mutated
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
      relatedTo.object.objectId).then((ids) => {
        delete query['$relatedTo'];
        this.addInObjectIdsIds(ids, query);
        return this.reduceRelationKeys(className, query);
      });
  }
};



DatabaseController.prototype.addInObjectIdsIds = function(ids = null, query) {
  let idsFromString = typeof query.objectId === 'string' ? [query.objectId] : null;
  let idsFromEq = query.objectId && query.objectId['$eq'] ? [query.objectId['$eq']] : null;
  let idsFromIn = query.objectId && query.objectId['$in'] ? query.objectId['$in'] : null;

  let allIds = [idsFromString, idsFromEq, idsFromIn, ids].filter(list => list !== null);
  let totalLength = allIds.reduce((memo, list) => memo + list.length, 0);

  let idsIntersection = [];
  if (totalLength > 125) {
    idsIntersection = intersect.big(allIds);
  } else {
    idsIntersection = intersect(allIds);
  }

  // Need to make sure we don't clobber existing $lt or other constraints on objectId.
  // Clobbering $eq, $in and shorthand $eq (query.objectId === 'string') constraints
  // is expected though.
  if (!('objectId' in query) || typeof query.objectId === 'string') {
    query.objectId = {};
  }
  query.objectId['$in'] = idsIntersection;

  return query;
}

DatabaseController.prototype.addNotInObjectIdsIds = function(ids = null, query) {
  let idsFromNin = query.objectId && query.objectId['$nin'] ? query.objectId['$nin'] : null;
  let allIds = [idsFromNin, ids].filter(list => list !== null);
  let totalLength = allIds.reduce((memo, list) => memo + list.length, 0);

  let idsIntersection = [];
  if (totalLength > 125) {
    idsIntersection = intersect.big(allIds);
  } else {
    idsIntersection = intersect(allIds);
  }

  // Need to make sure we don't clobber existing $lt or other constraints on objectId.
  // Clobbering $eq, $in and shorthand $eq (query.objectId === 'string') constraints
  // is expected though.
  if (!('objectId' in query) || typeof query.objectId === 'string') {
    query.objectId = {};
  }
  query.objectId['$nin'] = idsIntersection;

  return query;
}



DatabaseController.prototype.find = function(className, query, {
  skip,
  limit,
  acl,
  sort = {},
  count,
} = {}) {
  let isMaster = acl === undefined;
  let aclGroup = acl || [];
  let op = typeof query.objectId == 'string' && Object.keys(query).length === 1 ? 'get' : 'find';
  let classExists = true;
  return this.loadSchema()
  .then(schemaController => {
    //Allow volatile classes if querying with Master (for _PushStatus)
    //TODO: Move volatile classes concept into mongo adatper, postgres adapter shouldn't care
    //that api.parse.com breaks when _PushStatus exists in mongo.
    return schemaController.getOneSchema(className, isMaster)
    .catch(error => {
      // Behaviour for non-existent classes is kinda weird on Parse.com. Probably doesn't matter too much.
      // For now, pretend the class exists but has no objects,
      if (error === undefined) {
        classExists = false;
        return { fields: {} };
      }
      throw error;
    })
    .then(schema => {
      // Parse.com treats queries on _created_at and _updated_at as if they were queries on createdAt and updatedAt,
      // so duplicate that behaviour here. If both are specified, the corrent behaviour to match Parse.com is to
      // use the one that appears first in the sort list.
      if (sort._created_at) {
        sort.createdAt = sort._created_at;
        delete sort._created_at;
      }
      if (sort._updated_at) {
        sort.updatedAt = sort._updated_at;
        delete sort._updated_at;
      }
      Object.keys(sort).forEach(fieldName => {
        if (fieldName.match(/^authData\.([a-zA-Z0-9_]+)\.id$/)) {
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
          } else {
            return this.adapter.count(className, schema, query);
          }
        } else {
          if (!classExists) {
            return [];
          } else {
            return this.adapter.find(className, schema, query, { skip, limit, sort })
            .then(objects => objects.map(object => {

              object = untransformObjectACL(object);
              return filterSensitiveData(isMaster, aclGroup, className, object)
            }));
          }
        }
      });
    });
  });
};



module.exports = DatabaseController;