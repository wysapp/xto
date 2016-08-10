let mongodb = require('mongodb');
let collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection;
  }


  find(query, {skip, limit, sort} = {} ) {
    return this._rawFind(query, {skip, limit, sort})
      .catch(error => {
        if ( error.code != 17007 && !error.message.match(/unable to find index for .geoNear/)) {
          throw error;
        }

        let key = error.message.match(/field=([A-Za-z_0-9]+) /)[1];
        if (!key) {
          throw error;
        }

        var index = {};
        index[key] = '2d';
        return this._mongoCollection.createIndex(index)
          .then(() => this._rawFind(query, {skip, limit, sort}));
      });
  }

  _rawFind(query, { skip, limit, sort } = {}) {
   
    return this._mongoCollection
      .find(query, {skip, limit, sort})
      .toArray();
  }


  count(query, { skip, limit, sort } = {}) {
    return this._mongoCollection.count(query, { skip, limit, sort });
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