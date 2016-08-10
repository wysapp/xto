const Parse = require('parse/node').Parse;
import _ from 'lodash';


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
    "payload":      {type:'Object'}, // the JSON payload,
    "title":        {type:'String'},
    "expiry":       {type:'Number'},
    "status":       {type:'String'},
    "numSent":      {type:'Number'},
    "numFailed":    {type:'Number'},
    "pushHash":     {type:'String'},
    "errorMessage": {type:'Object'},
    "sentPerType":  {type:'Object'},
    "failedPerType":{type:'Object'},
  }
});


const systemClasses = Object.freeze(['_User', '_Installation', '_Role', '_Session', '_Product', '_PushStatus']);


const volatileClasses = Object.freeze(['_PushStatus', '_Hooks', '_GlobalConfig']);

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
      let perm = perms[operation][key];
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


const convertSchemaToAdapterSchema = schema => {
  schema = injectDefaultSchema(schema);
  delete schema.fields.ACL;
  schema.fields._rperm = { type: 'Array'};
  schema.fields._wperm = { type: 'Array'};

  if ( schema.className === '_User') {
    delete schema.fields.password;
    schema.fields._hashed_password = { type: 'String'};
  }

  return schema;
}


const convertAdapterSchemaToParseSchema = ({...schema}) => {
  delete schema.fields._rperm;
  delete schema.fields._wperm;

  schema.fields.ACL = { type: 'ACL'};

  if ( schema.className === '_User') {
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
    ...fields,
  },
  classLevelPermissions,
})


class SchemaController {
  _dbAdapter;
  data;
  perms;

  constructor(databaseAdapter) {
    this._dbAdapter = databaseAdapter;
    this.data = {};
    this.perms = {};
  }

  reloadData() {
    this.data = {};
    this.perms = {};
    return this.getAllClasses()
    .then(allSchema => {

      allSchema.forEach(schema => {
        this.data[schema.className] = injectDefaultSchema(schema).fields;
        this.perms[schema.className]= schema.classLevelPermissions;
      });

      volatileClasses.forEach(className => {
        this.data[className] = injectDefaultSchema({
          className,
          fields: {},
          classLevelPermissions: {}
        });
      });

    });
  }

  getAllClasses() {
    return this._dbAdapter.getAllClasses()
    .then(allSchema => allSchema.map(injectDefaultSchema));
  }

  getOneSchema(className, allowVolatileClasses = false) {
    if (allowVolatileClasses && volatileClasses.indexOf(className) > -1) {
      return Promise.resolve(this.data[className]);
    }
    return this._dbAdapter.getClass(className)
    .then(injectDefaultSchema)
  }


  addClassIfNotExists(className, fields = {}, classLevelPermissions) {
    var validationError = this.validateNewClass(className, fields, classLevelPermissions);

    if ( validationError) {
      return Promise.reject(validationError);
    }

    return this._dbAdapter.createClass(className, convertSchemaToAdapterSchema({ fields, classLevelPermissions, className}))
    .then(convertAdapterSchemaToParseSchema)
    .catch(error => {
      if ( error && error.code === Parse.Error.DUPLICATE_VALUE) {
        throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} already exists.`);
      } else {
        throw error;
      }
    });
  }


  enforceClassExists(className) {
    if ( this.data[className]) {
      return Promise.resolve(this);
    }

    return this.addClassIfNotExists(className)
    .then(() => this.reloadData())
    .catch(error => {
      return this.reloadData();
    })
    .then(() => {
      if ( this.data[className]) {
        return this;
      } else {
        throw new Parse.Error(Parse.Error.INVALID_JSON, `Failed to add ${className}`); 
      }
    })
    .catch(error => {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'schema class name does not revalidate');
    });
  }

  validateNewClass(className, fields = {}, classLevelPermissions) {
    if (this.data[className]) {
      throw new Parse.Error(Parse.Error.INVALID_CLASS_NAME, `Class ${className} already exists.`);
    }

    if ( !classNameIsValid(className)) {
      return {
        code: Parse.Error.INVALID_CLASS_NAME,
        error: invalidClassNameMessage(className),
      };
    }

    return this.validateSchemaData(className, fields, classLevelPermissions, []);
  }

  validateSchemaData(className, fields, classLevelPermissions, existingFieldNames) {
    for (let fieldName in fields) {
      if (!existingFieldNames.includes(fieldName)) {
        if (!fieldNameIsValid(fieldName)) {
          return {
            code: Parse.Error.INVALID_CLASS_NAME,
            error: 'invalid field name: ' + fieldName,
          };
        }

        if ( !fieldNameIsValidForClass(fieldName, className)) {
          return {
            code: 136,
            error: 'field ' + fieldName + ' cannot be added',
          };
        }

        const error = fieldTypeIsInvalid(fields[fieldName]);
        if ( error) return { code: error.code, error: error.message};
      }
    }

    for (let fieldName in defaultColumns[className]) {
      fields[fieldName] = defaultColumns[className][fieldName];
    }

    let geoPoints = Object.keys(fields).filter(key => fields[key] && fields[key].type === 'GetPoint');
    if ( geoPoints.length > 1) {
      return {
        code: Parse.Error.INCORRECT_TYPE,
        error: 'currently, only one GeoPoint field may exist in an object. Adding ' + geoPoints[1] + ' when ' + geoPoints[0] + ' already exists.',
      };
    }

    validateCLP(classLevelPermissions, fields);
  }
  
}

const load = dbAdapter => {
  let schema = new SchemaController(dbAdapter);
  return schema.reloadData().then(() => schema);
}


export {
  load,
  classNameIsValid,
  fieldNameIsValid,
  systemClasses,
  defaultColumns,
  convertSchemaToAdapterSchema
};