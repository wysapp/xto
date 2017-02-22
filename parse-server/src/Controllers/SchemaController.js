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
  // Contain the default columns for every parse object type (except _Join collection)
  _Default: {
    "objectId":  {type:'String'},
    "createdAt": {type:'Date'},
    "updatedAt": {type:'Date'},
    "ACL":       {type:'ACL'},
  },
  // The additional default columns for the _User collection (in addition to DefaultCols)
  _User: {
    "username":      {type:'String'},
    "password":      {type:'String'},
    "email":         {type:'String'},
    "emailVerified": {type:'Boolean'},
    "authData":      {type:'Object'}
  },
  // The additional default columns for the _Installation collection (in addition to DefaultCols)
  _Installation: {
    "installationId":   {type:'String'},
    "deviceToken":      {type:'String'},
    "channels":         {type:'Array'},
    "deviceType":       {type:'String'},
    "pushType":         {type:'String'},
    "GCMSenderId":      {type:'String'},
    "timeZone":         {type:'String'},
    "localeIdentifier": {type:'String'},
    "badge":            {type:'Number'},
    "appVersion":       {type:'String'},
    "appName":          {type:'String'},
    "appIdentifier":    {type:'String'},
    "parseVersion":     {type:'String'},
  },
  // The additional default columns for the _Role collection (in addition to DefaultCols)
  _Role: {
    "name":  {type:'String'},
    "users": {type:'Relation', targetClass:'_User'},
    "roles": {type:'Relation', targetClass:'_Role'}
  },
  // The additional default columns for the _Session collection (in addition to DefaultCols)
  _Session: {
    "restricted":     {type:'Boolean'},
    "user":           {type:'Pointer', targetClass:'_User'},
    "installationId": {type:'String'},
    "sessionToken":   {type:'String'},
    "expiresAt":      {type:'Date'},
    "createdWith":    {type:'Object'}
  },
  _Product: {
    "productIdentifier":  {type:'String'},
    "download":           {type:'File'},
    "downloadName":       {type:'String'},
    "icon":               {type:'File'},
    "order":              {type:'Number'},
    "title":              {type:'String'},
    "subtitle":           {type:'String'},
  },
  _PushStatus: {
    "pushTime":     {type:'String'},
    "source":       {type:'String'}, // rest or webui
    "query":        {type:'String'}, // the stringified JSON query
    "payload":      {type:'String'}, // the stringified JSON payload,
    "title":        {type:'String'},
    "expiry":       {type:'Number'},
    "status":       {type:'String'},
    "numSent":      {type:'Number'},
    "numFailed":    {type:'Number'},
    "pushHash":     {type:'String'},
    "errorMessage": {type:'Object'},
    "sentPerType":  {type:'Object'},
    "failedPerType":{type:'Object'},
    "count":       {type:'Number'}
  },
  _JobStatus: {
    "jobName":    {type: 'String'},
    "source":     {type: 'String'},
    "status":     {type: 'String'},
    "message":    {type: 'String'},
    "params":     {type: 'Object'}, // params received when calling the job
    "finishedAt": {type: 'Date'}
  },
  _Hooks: {
    "functionName": {type:'String'},
    "className":    {type:'String'},
    "triggerName":  {type:'String'},
    "url":          {type:'String'}
  },
  _GlobalConfig: {
    "objectId": {type: 'String'},
    "params": {type: 'Object'}
  }
});


const systemClasses = Object.freeze(['_User', '_Installation', '_Role', '_Session', '_Product', '_PushStatus', '_JobStatus']);

const injectDefaultSchema = ({className, fields, classLevelPermissions}) => ({
  className,
  fields: {
    ...defaultColumns._Default,
    ...(defaultColumns[className] || {}),
    ...fields
  },
  classLevelPermissions,
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


  // Returns the expected type for a className+key combination
  // or undefined if the schema is not set
  getExpectedType(className, fieldName) {
    if (this.data && this.data[className]) {
      const expectedType = this.data[className][fieldName];
      return expectedType === 'map' ? 'Object' : expectedType;
    }
    return undefined;
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