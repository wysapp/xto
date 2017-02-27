import MongoCollection from './MongoCollection';
import MongoSchemaCollection from './MongoSchemaCollection';

import {
  parse as parseUrl,
  format as formatUrl,
} from '../../../vendor/mongodbUrl';


import {
  transformKey,
  transformWhere
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