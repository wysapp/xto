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


const volatileClasses = Object.freeze(['_JobStatus', '_PushStatus', '_Hooks', '_GlobalConfig']);

const CLPValidKeys = Object.freeze(['find', 'get', 'create', 'update', 'delete', 'addField', 'readUserFields', 'writeUserFields']);
function validateCLP(perms, fields) {
  if (!perms) {
    return;
  }

  Object.keys(perms).forEach((operation) => {
    if (CLPValidKeys.indexOf(operation) == -1) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, `${operation} is not a valid operation for class level permissions`);
    }

    if (operation === 'readUserFields' || operation === 'writeUserFields') {
      if (!Array.isArray(perms[operation])) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, `'${perms[operation]}' is not a valid value for class level permissions ${operation}`);
      } else {
        perms[operation].forEach((key) => {
          if (!fields[key] || fields[key].type != 'Pointer' || fields[key].targetClass != '_User') {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `'${key}' is not a valid column for class level pointer permissions ${operation}`);
          }
        });
      }

      return;
    }

    Object.keys(perms[operation]).forEach((key) => {
      verifyPermissionKey(key);
      const perm = perms[operation][key];
      if (perm !== true) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, `'${perm}' is not a valid value for class level permissions ${operation}:${key}:${perm}`);
      }
    });
  });
}



const joinClassRegex = /^_Join:[A-Za-z0-9_]+:[A-Za-z0-9_]+/;
const classAndFieldRegex = /^[A-Za-z][A-Za-z0-9_]*$/;


function classNameIsValid(className) {
  return (
    systemClasses.indexOf(className) > -1 ||
    joinClassRegex.test(className) ||
    fieldNameIsValid(className)
  );
}

function fieldNameIsValid(fieldName) {
  return classAndFieldRegex.test(fieldName);
}


function invalidClassNameMessage(className) {
  return 'Invalid classname: ' + className + ', classnames can only have alphanumeric characters and _, and must start with an alpha character ';
}


const convertSchemaToAdapterSchema = schema => {
  schema = injectDefaultSchema(schema);
  delete schema.fields.ACL;
  schema.fields._rperm = { type: 'Array'};
  schema.fields._wperm = { type: 'Array'};

  if (schema.className === '_User') {
    delete schema.fields.password;
    schema.fields._hashed_password = { type: 'String'};
  }

  return schema;
}



const convertAdapterSchemaToParseSchema = ({...schema}) => {
  delete schema.fields._rperm;
  delete schema.fields._wperm;

  schema.fields.ACL = {type: 'ACL'};

  if (schema.className === '_User') {
    delete schema.fields.authData;
    delete schema.fields._hashed_password;
    schema.fields.password = {type: 'String'};
  }

  return schema;
}


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

  getOneSchema(className, allowVolatileClasses = false, options = {clearCache: false}) {
    let promise = Promise.resolve();
    if (options.clearCache) {
      promise = this._cache.clear();
    }

    return promise.then(() => {
      if (allowVolatileClasses && volatileClasses.indexOf(className) > -1) {
        return Promise.resolve({
          className,
          fields: this.data[className],
          classLevelPermissions: this.perms[className]
        });
      }

      return this._cache.getOneSchema(className).then((cached) =>{
        if (cached && !options.clearCache) {
          return Promise.resolve(cached);
        }

        return this._dbAdapter.getClass(className)
        .then(injectDefaultSchema)
        .then((result) => {
          return this._cache.setOneSchema(className, result).then(() => {
            return result;
          })
        });
      });
    });
  }


  addClassIfNotExists(className, fields = {}, classLevelPermissions) {
    var validationError = this.validateNewClass(className, fields, classLevelPermissions);
    if (validationError) {
      return Promise.reject(validationError);
    }

    return this._dbAdapter.createClass(className, convertSchemaToAdapterSchema({fields, classLevelPermissions, className}))
      .then(convertAdapterSchemaToParseSchema)
      .then((res) => {
        return this._cache.clear().then(() => {
          return Promise.resolve(res);
        });
      })
      .catch(error => {
        if (error && error.code === Parse.Error.DUPLICATE_VALUE) {
          throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} already exists.`);
        } else {
          throw error;
        }
      });

  }


  validateNewClass(className, fields = {}, classLevelPermissions) {
    if (this.data[className]) {
      throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} already exists.`);
    }

    if (!classNameIsValid(className)) {
      return {
        code: Parse.Error.INVALID_CLASS_NAME,
        error: invalidClassNameMessage(className),
      };
    }

    return this.validateSchemaData(className, fields, classLevelPermissions, []);
  }

  validateSchemaData(className, fields, classLevelPermissions, existingFieldNames) {
    for(const fieldName in fields) {
      if (existingFieldNames.indexOf(fieldName) < 0) {
        if (!fieldNameIsValid(fieldName)) {
          return {
            code: Parse.Error.INVALID_KEY_NAME,
            error: 'invalid field name: ' + fieldName,
          };
        }

        if (!fieldNameIsValidForClass(fieldName, className)) {
          return {
            code: 136,
            error: 'field ' + fieldName + ' cannot be added',
          };
        }

        const error = fieldTypeIsInvalid(fields[fieldName]);
        if (error) return {code: error.code, error: error.message};
      }
    }

    for (const fieldName in defaultColumns[className]) {
      fields[fieldName] = defaultColumns[className][fieldName];
    }

    const geoPoints = Object.keys(fields).filter(key => fields[key] && fields[key].type === 'GeoPoint');
    if (geoPoints.length > 1) {
      return {
        code: Parse.Error.INCORRECT_TYPE,
        error: 'currently, only one GeoPoint field may exist in an object. Adding ' + geoPoints[1] + ' when ' + geoPoints[0] + ' already exists. ',
      }
    }
    validateCLP(classLevelPermissions, fields);
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
  classNameIsValid,
  fieldNameIsValid,

  systemClasses,
  defaultColumns,
}