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


function fieldNameIsValidForClass(fieldName, className) {
  if (!fieldNameIsValid(fieldName)){
    return false;
  }

  if (defaultColumns._Default[fieldName]) {
    return false;
  }

  if (defaultColumns[className] && defaultColumns[className][fieldName]) {
    return false;
  }
  return true;
}

function invalidClassNameMessage(className) {
  return 'Invalid classname: ' + className + ', classnames can only have alphanumeric characters and _, and must start with an alpha character ';
}


const invalidJsonError = new Parse.Error(Parse.Error.INVALID_JSON, 'invalid JSON');
const validNonRelationOrPointerTypes = [
  'Number',
  'String',
  'Boolean',
  'Date',
  'Object',
  'Array',
  'GeoPoint',
  'File'
];

const fieldTypeIsInvalid = ({type, targetClass}) => {
  if (['Pointer', 'Relation'].indexOf(type) >= 0) {
    if (!targetClass) {
      return new Parse.Error(135, `type ${type} needs a class name`);
    } else if (typeof targetClass !== 'string') {
      return invalidJsonError;
    } else if (!classNameIsValid(targetClass)) {
      return new Parse.Error(Parse.Error.INVALID_CLASS_NAME, invalidClassNameMessage(targetClass));
    } else {
      return undefined;
    }
  }

  if (typeof type !== 'string') {
    return invalidJsonError;
  }

  if (validNonRelationOrPointerTypes.indexOf(type) < 0) {
    return new Parse.Error(Parse.Error.INCORRECT_TYPE, `invalid field type: ${type}`);
  }
  return undefined;
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


const dbTypeMatchesObjectType = (dbType, objectType) => {
  if (dbType.type !== objectType.type) return false;
  if (dbType.targetClass !== objectType.targetClass ) return false;
  if (dbType === objectType.type) return true;
  if (dbType.type === objectType.type) return true;
  return false;
}


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

  updateClass(className, submittedFields, classLevelPermissions, database){
    return this.getOneSchema(className)
      .then(schema => {
        const existingFields = schema.fields;
        Object.keys(submittedFields).forEach(name => {
          const field = submittedFields[name];
          if (existingFields[name] && field.__op !== 'Delete') {
            throw new Parse.Error(255, `Field ${name} exists, cannot update.`);
          }
          if (!existingFields[name] && field.__op === 'Delete') {
            throw new Parse.Error(255, `Field ${name} does not exist, cannot delete.`);
          }
        });

        delete existingFields._rperm;
        delete existingFields._wperm;
        const newSchema = buildMergedSchemaObject(existingFields, submittedFields);
        
        const validationError = this.validateSchemaData(className, newSchema, classLevelPermissions, Object.keys(existingFields));
        if (validationError) {
          throw new Parse.Error(validationError.code, validationError.error);
        }

        const deletePromises = [];
        const insertedFields = [];
        Object.keys(submittedFields).forEach(fieldName => {
          if (submittedFields[fieldName].__op === 'Delete') {
            const promise = this.deleteField(fieldName, className, database);
            deletePromises.push(promise);
          } else {
            insertedFields.push(fieldName);
          }
        });

        return Promise.all(deletePromises)
          .then(() => this.reloadData({clearCache: true}))
          .then(() => {
            const promises = insertedFields.map(fieldName => {
              const type = submittedFields[fieldName];
              return this.enforceFieldExists(className, fieldName, type);
            });
            return Promise.all(promises);
          })
          .then(() => this.setPermissions(className, classLevelPermissions, newSchema))
          .then(() => ({
            className: className,
            fields: this.data[className],
            classLevelPermissions: this.perms[className]
          }));
      })
      .catch(error => {
        if(error === undefined) {
          throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} does not exist.`);
        } else {
          throw error;
        }
      })
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


  setPermissions(classname, perms, newSchema) {
    if (typeof perms === 'undefined') {
      return Promise.resolve();
    }

    validateCLP(perms, newSchema);
    return this._dbAdapter.setClassLevelPermissions(classname, perms)
      .then(() => this.reloadData({clearCache: true}));
  }


  // Returns a promise that resolves successfully to the new schema
  // object if the provided className-fieldName-type tuple is valid.
  // The className must already be validated.
  // If 'freeze' is true, refuse to update the schema for this field.
  enforceFieldExists(className, fieldName, type) {
    if (fieldName.indexOf('.') > 0) {
      fieldName = fieldName.split('.')[0];
      type = 'Object';
    }
    if (!fieldNameIsValid(fieldName)) {
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `Invalid field name: ${fieldName}.`);
    }

    if (!type){
      return Promise.resolve(this);
    }

    return this.reloadData().then(() => {
      const expectedType = this.getExpectedType(className, fieldName);
      if (typeof type === 'string') {
        type = {type};
      }

      if (expectedType) {
        if (!dbTypeMatchesObjectType(expectedType, type)) {
          throw new Parse.Error(
            Parse.Error.INCORRECT_TYPE,
            `schema mismatch for ${className}.${fieldName}; expected ${typeToString(expectedType)} but got ${typeToString(type)}`
          );
        }
        return this;
      }

      return this._dbAdapter.addFieldIfNotExists(className, fieldName, type)
        .then(() => {
          return this.reloadData({clearCache: true});
        }, () => {
          //TODO: introspect the error and only reload if the error is one for which is makes sense to reload

          // The update failed. This can be okay - it might have been a race
          // condition where another client updated the schema in the same
          // way that we wanted to. So, just reload the schema
          return this.reloadData({clearCache: true});
        }).then(() => {
          if (!dbTypeMatchesObjectType(this.getExpectedType(className, fieldName),type)) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `Could not add field ${fieldName}`);
          }
          this._cache.clear();
          return this;
        });
    });
  }


  // Delete a field, and remove that data from all objects. This is intended
  // to remove unused fields, if other writers are writing objects that include
  // this field, the field may reappear. Returns a Promise that resolves with
  // no object on success, or rejects with { code, error } on failure.
  // Passing the database and prefix is necessary in order to drop relation collections
  // and remove fields from objects. Ideally the database would belong to
  // a database adapter and this function would close over it or access it via member.
  deleteField(fieldName, className, database) {
    if (!classNameIsValid(className)) {
      throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, invalidClassNameMessage(className));
    }

    if (!fieldNameIsValid(fieldName)) {
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, `invalid field name: ${fieldName}`); 
    }

    if (!fieldNameIsValidForClass(fieldName, className)) {
      throw new Parse.Error(136, `field ${fieldName} cannot be changed`);
    }

    return this.getOneSchema(className, false, {clearCache: true})
      .catch(error => {
        if (error === undefined) {
          throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} does not exist.`);
        } else {
          throw error;
        }
      })
      .then(schema => {
        if (!schema.fields[fieldName]) {
          throw new Parse.Error(255, `Field ${fieldName} does not exist, cannot delete.`);
        }
        if (schema.fields[fieldName].type === 'Relation') {
          return database.adapter.deleteFields(className, schema, [fieldName])
            .then(() => database.adapter.deleteClass(`_Join:${FieldName}:${className}`));
        }
        return database.adapter.deleteFields(className, schema, [fieldName]);
      })
      .then(() => {
        this._cache.clear();
      });
  }

  // Validates an object provided in REST format.
  // Returns a promise that resolves to the new schema if this object is
  // valid.
  validateObject(className, object, query) {
    let geocount = 0;
    let promise = this.enforceClassExists(className);
    for (const fieldName in object) {
      if (object[fieldName] === undefined) {
        continue;
      }
      const expected = getType(object[fieldName]);
      if (expected === 'GeoPoint') {
        geocount++;
      }
      if (geocount > 1) {
        // Make sure all field validation operations run before we return.
        // If not - we are continuing to run logic, but already provided response from the server.
        return promise.then(() => {
          return Promise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE, 'there can only be one geopoint field in a class'));
        });
      }

      if (!expected) {
        continue;
      }

      if (fieldName === 'ACL') {
        continue;
      }

      promise = promise.then(schema => schema.enforceFieldExists(className, fieldName, expected));
    }

    promise = thenValidateRequiredColumns(promise, className, object, query);
    return promise;
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

function buildMergedSchemaObject(existingFields, putRequest) {
  const newSchema = {};
  const sysSchemaField = Object.keys(defaultColumns).indexOf(existingFields._id) === -1 ? 
    [] :
    Object.keys(defaultColumns[existingFields._id]);
  
  for (const oldField in existingFields) {
    if (oldField !== '_id' && oldField !== 'ACL' && oldField !== 'updatedAt' && oldField !== 'createdAt' && oldField !== 'objectId') {
      if (sysSchemaField.length > 0 && sysSchemaField.indexOf(oldField) !== -1) {
        continue;
      }

      const fieldIsDeleted = putRequest[oldField] && putRequest[oldField].__op === 'Delete';
      if (!fieldIsDeleted) {
        newSchema[oldField] = existingFields[oldField];
      }
    }
  }

  for (const newField in putRequest){

    if (newField !== 'objectId' && putRequest[newField].__op !== 'Delete') {
      if (sysSchemaField.length > 0 && sysSchemaField.indexOf(newField) !== -1) {
        continue;
      }
      newSchema[newField] = putRequest[newField];
    }
  }

  return newSchema;
}


export {
  load,
  classNameIsValid,
  fieldNameIsValid,

  systemClasses,
  defaultColumns,
}