import MongoCollection from './MongoCollection';
import MongoSchemaCollection from './MongoSchemaCollection';

import {
  parse as parseUrl,
  format as formatUrl,
} from '../../../vendor/mongodbUrl';


import Parse from 'parse/node';
import _ from 'lodash';
import defaults from '../../../defaults';

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

const MongoSchemaCollectionName = '_SCHEMA';


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


  // Return a promise for all schemas known to this adapter, in Parse format. In case the
  // schemas cannot be retrieved, returns a promise that rejects. Requirements for the
  // rejection reason are TBD.
  getAllClasses() {
    return this._schemaCollection().then(schemasCollection => schemasCollection._fetchAllSchemasFrom_SCHEMA());
  }



}


export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;  // Required for tests