const mongodb = require('mongodb');
const Collection = mongodb.Collection;

export default class MongoCollection {
  _mongoCollection: Collection;

  constructor(mongoCollection: Collection) {
    this._mongoCollection = mongoCollection;
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