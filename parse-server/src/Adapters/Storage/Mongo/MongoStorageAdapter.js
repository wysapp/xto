import MongoCollection from './MongoCollection';
import MongoSchemaCollection from './MongoSchemaCollection';

import {
  parse as parseUrl,
  format as formatUrl,
} from '../../../vendor/mongodbUrl';


import {
  parseObjectToMongoObjectForCreate,
  mongoObjectToParseObject,
  transformKey,
  transformWhere,
  transformUpdate,
} from './MongoTransform';

import Parse from 'parse/node';
import _ from 'lodash';
import defaults from '../../../defaults';

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

const MongoSchemaCollectionName = '_SCHEMA';


const convertParseSchemaToMongoSchema = ({...schema}) => {
  delete schema.fields._rperm;
  delete schema.fields._wperm;

  if (schema.className === '_User') {
    // Legacy mongo adapter knows about the difference between password and _hashed_password.
    // Future database adapters will only know about _hashed_password.
    // Note: Parse Server will bring back password with injectDefaultSchema, so we don't need
    // to add _hashed_password back ever.
    delete schema.fields._hashed_password;
  }

  return schema;
}


const mongoSchemaFromFieldsAndClassNameAndCLP = (fields, className, classLevelPermissions) => {
  const mongoObject = {
    _id: className,
    objectId: 'string',
    updatedAt: 'string',
    createdAt: 'string'
  };

  for (const fieldName in fields) {
    mongoObject[fieldName] = MongoSchemaCollection.parseFieldTypeToMongoFieldType(fields[fieldName]);
  }

  if (typeof classLevelPermissions !== 'undefined') {
    mongoObject._metadata = mongoObject._metadata || {};
    if (!classLevelPermissions) {
      delete mongoObject._metadata.class_permissions;
    } else {
      mongoObject._metadata.class_permissions = classLevelPermissions;
    }
  }
  return mongoObject;
}

export class MongoStorageAdapter {
  // Private
  _uri: string;
  _collectionPrefix: string;
  _mongoOptions: Object;

  // Public
  connectionPromise;
  database;

  constructor({
    uri = defaults.DefaultMongoURI,
    collectionPrefix = '',
    mongoOptions = {}
  }) {
    this._uri = uri;
    this._collectionPrefix = collectionPrefix;
    this._mongoOptions = mongoOptions;

    // MaxTimeMS is not a global MongoDB client option, it is applied per operation.
    this._maxTimeMS = mongoOptions.maxTimeMS;
  }

  connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const encodedUri = formatUrl(parseUrl(this._uri));
    this.connectionPromise = MongoClient.connect(encodedUri, this._mongoOptions).then(database => {
      if (!database) {
        delete this.connectionPromise;
        return;
      }

      database.on('error', () => {
        delete this.connectionPromise;
      });

      database.on('close', () => {
        delete this.connectionPromise;
      });

      this.database = database;
    }).catch((err) => {
      delete this.connectionPromise;
      return Promise.reject(err);
    });

    return this.connectionPromise;

  }

  _adaptiveCollection(name: string) {
    return this.connect()
      .then(() => this.database.collection(this._collectionPrefix + name))
      .then(rawCollection => new MongoCollection(rawCollection));
  }

  _schemaCollection() {
    return this.connect() 
      .then(() => this._adaptiveCollection(MongoSchemaCollectionName))
      .then(collection => new MongoSchemaCollection(collection));
  }


  classExists(name) {
    return this.connect().then(() => {
      return this.database.listCollections({ name: this._collectionPrefix + name}).toArray();
    }).then(collections => {
      return collections.length > 0;
    });
  }


  createClass(className, schema) {
    
    schema = convertParseSchemaToMongoSchema(schema);
    const mongoObject = mongoSchemaFromFieldsAndClassNameAndCLP(schema.fields, className, schema.classLevelPermissions);
    mongoObject._id = className;

    return this._schemaCollection()
      .then(schemaCollection => schemaCollection._collection.insertOne(mongoObject))
      .then(result => MongoSchemaCollection._TESTmongoSchemaToParseSchema(result.ops[0]))
      .catch(error => {
        if (error.code === 11000) { //Mongo's duplicate key error
          throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Class already exists.');
        } else {
          throw error;
        }
      });

  }


  addFieldIfNotExists(className, fieldName, type) {
    return this._schemaCollection()
      .then(schemaCollection => schemaCollection.addFieldIfNotExists(className, fieldName, type));
  }


  // Drops a collection. Resolves with true if it was a Parse Schema (eg. _User, Custom, etc.)
  // and resolves with false if it wasn't (eg. a join table). Rejects if deletion was impossible.
  deleteClass(className) {
    return this._adaptiveCollection(className)
    .then(collection => collection.drop())
    .catch(error => {
      if (error.message == 'ns not found') {
        return;
      }
      throw error;
    })
    .then(() => this._schemaCollection())
    .then( schemaCollection => schemaCollection.findAndDeleteSchema(className))
  }



  // Remove the column and all the data. For Relations, the _Join collection is handled
  // specially, this function does not delete _Join columns. It should, however, indicate
  // that the relation fields does not exist anymore. In mongo, this means removing it from
  // the _SCHEMA collection.  There should be no actual data in the collection under the same name
  // as the relation column, so it's fine to attempt to delete it. If the fields listed to be
  // deleted do not exist, this function should return successfully anyways. Checking for
  // attempts to delete non-existent fields is the responsibility of Parse Server.

  // Pointer field names are passed for legacy reasons: the original mongo
  // format stored pointer field names differently in the database, and therefore
  // needed to know the type of the field before it could delete it. Future database
  // adatpers should ignore the pointerFieldNames argument. All the field names are in
  // fieldNames, they show up additionally in the pointerFieldNames database for use
  // by the mongo adapter, which deals with the legacy mongo format.

  // This function is not obligated to delete fields atomically. It is given the field
  // names in a list so that databases that are capable of deleting fields atomically
  // may do so.

  // Returns a Promise.
  deleteFields(className, schema, fieldNames) {
    const mongoFormatNames = fieldNames.map(fieldName => {
      if (schema.fields[fieldName].type === 'Pointer') {
        return `_p_${fieldName}`;
      } else {
        return fieldName;
      }
    });

    const collectionUpdate = { '$unset': {}};
    mongoFormatNames.forEach(name => {
      collectionUpdate['$unset'][name] = null;
    });

    const schemaUpdate = { '$unset': {}};
    fieldNames.forEach(name => {
      schemaUpdate['$unset'][name] = null;
    });

    return this._adaptiveCollection(className)
      .then(collection => collection.updateMany({}, collectionUpdate))
      .then(() => this._schemaCollection())
      .then(schemaCollection => schemaCollection.updateSchema(className, schemaUpdate));
  }



  // Return a promise for all schemas known to this adapter, in Parse format. In case the
  // schemas cannot be retrieved, returns a promise that rejects. Requirements for the
  // rejection reason are TBD.
  getAllClasses() {
    return this._schemaCollection().then(schemasCollection => schemasCollection._fetchAllSchemasFrom_SCHEMA());
  }


  getClass(className) {
    return this._schemaCollection()
    .then(schemasCollection => schemasCollection._fechOneSchemaFrom_SCHEMA(className));
  }


  // TODO: As yet not particularly well specified. Creates an object. Maybe shouldn't even need the schema,
  // and should infer from the type. Or maybe does need the schema for validations. Or maybe needs
  // the schem only for the legacy mongo format. We'll figure that out later.
  createObject(className, schema, object) {
    schema = convertParseSchemaToMongoSchema(schema);
    const mongoObject = parseObjectToMongoObjectForCreate(className, object, schema);
    return this._adaptiveCollection(className)
    .then(collection => collection.insertOne(mongoObject))
    .catch(error => {
      if (error.code === 11000) { // Duplicate value
          throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A duplicate value for a field with unique values was provided');
      }
      throw error;
    });
  }


  // Atomically finds and updates an object based on query.
  // Return value not currently well specified.
  findOneAndUpdate(className, schema, query, update) {
    schema = convertParseSchemaToMongoSchema(schema);
    const mongoUpdate = transformUpdate(className, update, schema);
    const mongoWhere = transformWhere(className, query, schema);
    return this._adaptiveCollection(className)
    .then(collection => collection._mongoCollection.findAndModify(mongoWhere, [], mongoUpdate, { new: true }))
    .then(result => mongoObjectToParseObject(className, result.value, schema));
  }


  find(className, schema, query, {skip, limit,sort, keys}) {

    schema = convertParseSchemaToMongoSchema(schema);
    
    const mongoWhere = transformWhere(className, query, schema);
    const mongoSort = _.mapKeys(sort, (value, fieldName) => transformKey(className, fieldName, schema));
    const mongoKeys = _.reduce(keys, (memo, key) => {
      memo[transformKey(className, key, schema)] = 1;
      return memo;
    }, {});

    return this._adaptiveCollection(className)
    .then(collection => collection.find(mongoWhere, {
      skip,
      limit,
      sort: mongoSort,
      keys: mongoKeys,
      maxTimeMS: this._maxTimeMS
    }))
    .then(objects => objects.map(object => mongoObjectToParseObject(className, object, schema)));

  }

  count(className, schema, query) {
    schema = convertParseSchemaToMongoSchema(schema);
    return this._adaptiveCollection(className)
    .then(collection => {
      
      return collection.count(transformWhere(className, query, schema), {
        maxTimeMS: this._maxTimeMS
      });
    });
  }

}


export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;  // Required for tests