
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

import _ from 'lodash';

let mongodb = require('mongodb');
let MongoClient = mongodb.MongoClient;

const MongoSchemaCollectionName = '_SCHEMA';
const DefaultMongoURI = 'mongodb://localhost:27017/parse';



const convertParseSchemaToMongoSchema = ({...schema}) => {
  delete schema.fields._rperm;
  delete schema.fields._wperm;

  if ( schema.className === '_User') {
    delete schema.fields._hashed_password;
  }

  return schema;
}

const mongoSchemaFromFieldsAndClassNameAndCLP = (fields, className, classLevelPermissions) => {
  let mongoObject = {
    _id: className,
    objectId: 'string',
    updatedAt: 'string',
    createdAt: 'string'
  };

  for (let fieldName in fields) {
    mongoObject[fieldName] = MongoSchemaCollection.parseFieldTypeToMongoFieldType(fields[fieldName]);
  }

  if (typeof classLevelPermissions !== 'undefined') {
    mongoObject._metadata = mongoObject._metadata || {};
    if ( !classLevelPermissions) {
      delete mongoObject._metadata.class_permissions;
    } else {
      mongoObject._metadata.class_permissions = classLevelPermissions;
    }
  }

  return mongoObject;

}


export class MongoStorageAdapter {
  _uri: string;
  _collectionPrefix: string;
  _mongoOptions: Object;

  connectionPromise;
  database;

  constructor({
    uri = DefaultMongoURI,
    collectionPrefix = '',
    mongoOptions = {}
  }) {
    this._uri = uri;
    this._collectionPrefix = collectionPrefix;
    this._mongoOptions = mongoOptions;
  }

  connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const encodedUri = formatUrl(parseUrl(this._uri));

    this.connectionPromise = MongoClient.connect(encodedUri, this._mongoOptions).then(database => {
      this.database = database;
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
    let mongoObject = mongoSchemaFromFieldsAndClassNameAndCLP(schema.fields, className, schema.classLevelPermissions);
    mongoObject._id = className;
    return this._schemaCollection()
    .then(schemaCollection => schemaCollection._collection.insertOne(mongoObject))
    .then(result => MongoSchemaCollection._TESTmongoSchemaToParseSchema(result.ops[0]))
    .catch(error => {
      if ( error.code === 11000) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Class already exists.');
      } else {
        throw error;
      }
    })
  }


  getAllClasses() {
    return this._schemaCollection().then(schemasCollection =>
      schemasCollection._fetchAllSchemasFrom_SCHEMA()
    );
  }

  ensureUniqueness(className, schema, fieldNames) {
    schema = convertParseSchemaToMongoSchema(schema);
    let indexCreateionRequest = {};
    let mongoFieldNames = fieldNames.map(fieldName => transformKey(className, fieldName, schema));
    mongoFieldNames.forEach(fieldName => {
      indexCreateionRequest[fieldName] = 1;
    })
    return this._adaptiveCollection(className)
    .then(collection => collection._ensureSparseUniqueIndexInBackground(indexCreateionRequest))
    .catch(error => {
      if (error.code === 11000) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Tried to ensure field uniqueness for a class that already has duplicates.');
      } else {
        throw error;
      }
    });
  }

}


export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;