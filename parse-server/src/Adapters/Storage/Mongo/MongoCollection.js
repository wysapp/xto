let mongodb = require('mongodb');
let collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection;
  }

  _rawFind(query, { skip, limit, sort } = {}) {
   
    return this._mongoCollection
      .find(query, {skip, limit, sort})
      .toArray();
  }


  insertOne(object) {
    return this._mongoCollection.insertOne(object);
  }

  _ensureSparseUniqueIndexInBackground(indexRequest) {
    return new Promise((resolve, reject) => {
      this._mongoCollection.ensureIndex(indexRequest, { unique: true, background: true, sparse: true }, (error, indexName) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  
}