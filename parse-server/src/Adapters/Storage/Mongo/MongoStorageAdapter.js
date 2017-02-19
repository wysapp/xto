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
  _url: string;
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

}


export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;  // Required for tests