const mongodb = require('mongodb');
const Collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection;
  }

  
  // Does a find with "smart indexing".
  // Currently this just means, if it needs a geoindex and there is
  // none, then build the geoindex.
  // This could be improved a lot but it's not clear if that's a good
  // idea. Or even if this behavior is a good idea.
  find(query, {skip, limit, sort, keys, maxTimeMS} = {}) {
    return this._rawFind(query, {skip, limit, sort, keys, maxTimeMS})
      .catch(error => {
        if (error.code != 17007 && !error.message.match(/unable to find index for .geoNear/)) {
          throw error;
        }

        const key = error.message.match(/field=([A-Za-z0-9_]+) /)[1];
        if (!key) {
          throw error;
        }

        var index = {};
        index[key] = '2d';
        return this._mongoCollection.createIndex(index)
          .then(() => this._rawFind(query, {skip, limit, sort, keys, maxTimeMS}));
      });
  }


  _rawFind(query, {skip, limit, sort, keys, maxTimeMS} = {}) {
    let findOperation = this._mongoCollection.find(query, {skip, limit, sort});

    if (keys) {
      findOperation = findOperation.project(keys);
    }

    if (maxTimeMS) {
      findOperation = findOperation.maxTimeMS(maxTimeMS);
    }

    return findOperation.toArray();
  }

  count(query, {skip, limit, sort, maxTimeMS} = {}) {
    const countOperation = this._mongoCollection.count(query, {skip, limit, sort, maxTimeMS});

    return countOperation;
  }

  insertOne(object) {
    return this._mongoCollection.insertOne(object);
  }
}