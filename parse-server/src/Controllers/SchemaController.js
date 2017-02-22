// This class handles schema validation, persistence, and modification.
//
// Each individual Schema object should be immutable. The helpers to
// do things with the Schema just return a new schema when the schema
// is changed.
//
// The canonical place to store this Schema is in the database itself,
// in a _SCHEMA collection. This is not the right way to do it for an
// open source framework, but it's backward compatible, so we're
// keeping it this way for now.
//
// In API-handling code, you should only use the Schema class via the
// DatabaseController. This will let us replace the schema logic for
// different databases.
// TODO: hide all schema logic inside the database adapter.

const Parse = require('parse/node').Parse;

const defaultColumns = Object.freeze({

});



export default class SchemaController {
  _dbAdapter;
  data;
  perms;

  constructor(databaseAdapter, schemaCache) {
    this._dbAdapter = databaseAdapter;
    this._cache = schemaCache;
    this.data = {};
    this.perms = {};
  }

  reloadData(options = {clearCache: false}) {
    let promise = Promise.resolve();
    if (options.clearCache) {
      promise = promise.then(() => {
        return this._cache.clear();
      });
    }

    if (this.reloadDataPromise && !options.clearCache) {
      return this.reloadDataPromise;
    }

    this.reloadDataPromise = promise.then(() => {
      return this.getAllClasses(options);
    }).then(allSchemas => {
      const data = {};
      const perms = {};
      allSchemas.forEach(schema => {
        data[schema.className] = injectDefaultSchema(schema).fields;
        perms[schema.className] = schema.classLevelPermissions;
      });
      this.data = data;
      this.perms = perms;
      delete this.reloadDataPromise;
    }, (err)=> {
      this.data = {};
      this.perms = {};
      delete this.reloadDataPromise;
      throw err;
    });

    return this.reloadDataPromise;

  }

  getAllClasses(options = {clearCache: false}) {
    let promise = Promise.resolve();
    if (options.clearCache) {
      promise = this._cache.clear();
    }

    return promise.then(() => {
      return this._cache.getAllClasses()
    }).then((allClasses) => {
      if (allClasses && allClasses.length && !options.clearCache) {
        return Promise.resolve(allClasses);
      }

      return this._dbAdapter.getAllClasses()
        .then(allSchemas => allSchemas.map(injectDefaultSchema))
        .then(allSchemas => {
          return this._cache.setAllClasses(allSchemas).then(() => {
            return allSchemas;
          });
        })
    });
  }

  
}




// Returns a promise for a new Schema.
const load = (dbAdapter, schemaCache, options) => {
  const schema = new SchemaController(dbAdapter, schemaCache);
  return schema.reloadData(options).then(() => schema);
}


export {
  load,
}