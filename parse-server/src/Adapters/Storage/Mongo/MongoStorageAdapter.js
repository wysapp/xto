

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
}


export default MongoStorageAdapter;
module.exports = MongoStorageAdapter;