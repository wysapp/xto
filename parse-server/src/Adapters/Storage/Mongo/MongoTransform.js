import log from '../../../logger';
import _ from 'lodash';

var mongodb = require('mongodb');
var Parse = require('parse/node').Parse;


const transformKey = (className, fieldName, schema) => {
  switch(fieldName) {
    case 'objectId': return '_id';
    case 'createdAt': return '_created_at';
    case 'updatedAt': return '_updated_at';
    case 'sessionToken': return '_session_token';
  }

  if (schema.fields[fieldName] && schema.fields[fieldName].__type == 'Pointer') {
    fieldName = '_p_' + fieldName;
  } else if (schema.fields[fieldName] && schema.fields[fieldName].type == 'Pointer') {
    fieldName = '_p_' + fieldName;
  }

  return fieldName;
}


function transformQueryKeyValue(className, key, value, schema) {
  switch(key) {
    case 'createdAt':
      if (valueAsDate(value)) {
        return {key: '_created_at', value: valueAsDate(value)}
      }
      key = '_created_at';
      break;
    case 'updatedAt':
      if (valueAsDate(value)) {
        return {key: '_updated_at', value: valueAsDate(value)};
      }
      key = '_updated_at';
      break;
    case 'expiresAt':
      if (valueAsDate(value)) {
        return {key: 'expiresAt', value: valueAsDate(value)};
      }
      break;
    case 'objectId':{
      if (className === '_GlobalConfig') {
        value = parseInt(value);
      }
      return {key: '_id', value};
    }
    case '_account_lockout_expires_at':
      if (valueAsDate(value)) {
        return {key: '_account_lockout_expires_at', value: valueAsDate(value)};
      }
      break;
    case '_failed_login_count':
      return {key, value};
    case 'sessionToken':
      return {key: '_session_token', value};
    case '_perishable_token_expires_at':
      if (valueAsDate(value)) {
        return {key: '_perishable_token_expires_at', value: valueAsDate(value)};
      }
      break;
    case '_password_changed_at':
      if (valueAsDate(value)) {
        return {key: '_password_changed_at', value: valueAsDate(value)};
      }
      break;
    case '_rperm':
    case '_wperm':
    case '_perishable_token':
    case '_email_verify_token':
      return {key, value};
    case '$or':
      return {key: '$or', value: value.map(subQuery => transformWhere(className, subQuery, schema))};
    case '$and':
      return {key: '$and', value: value.map(subQuery => transformWhere(className, subQuery, schema))};
    default: {
      const authDataMatch = key.match(/^authData\.([a-zA-Z0-9_]+)\.id$/);
      if (authDataMatch) {
        const provider = authDataMatch[1];
        return {key: `_auth_data_${provider}.id`, value};
      }
    }

  }

  const expectedTypeIsArray = 
    schema &&
    schema.fields[key] &&
    schema.fields[key].type === 'Array';
  
  const expectedTypeIsPointer = 
    schema &&
    schema.fields[key] &&
    schema.fields[key].type === 'Pointer';
  
  if (expectedTypeIsPointer || !schema && value && value.__type === 'Pointer') {
    key = '_p_' + key;
  }

  const transformedConstraint = transformConstraint(value, expectedTypeIsArray);
  if (transformedConstraint !== CannotTransform) {
    return {key, value: transformedConstraint};
  }

  if (expectedTypeIsArray && !(value instanceof Array)) {
    return {key, value: {'$all' : [value]}};
  }

  if (transformTopLevelAtom(value) !== CannotTransform) {
    return {key, value: transformTopLevelAtom(value)};
  } else {
    throw new Parse.Error(Parse.Error.INVALID_JSON, `You cannot use ${value} as a query parameter.`);
  }
}


function transformWhere(className, restWhere, schema) {
  const mongoWhere = {};
  for (const restKey in restWhere) {
    const out = transformQueryKeyValue(className, restKey, restWhere[restKey], schema);
    mongoWhere[out.key] = out.value;
  }
  return mongoWhere;
}


const parseObjectKeyValueToMongoObjectKeyValue = (restKey, restValue, schema) => {
  let transformedValue;
  let coercedToDate;
  switch(restKey) {
  case 'objectId': return { key: '_id', value: restValue};
  case 'expiresAt':
    transformedValue = transformTopLevelAtom(restValue);
    coercedToDate = typeof transformedValue === 'string' ? new Date(transformedValue) : transformedValue
    return {key: 'expiresAt', value: coercedToDate};
  case '_email_verify_token_expires_at':
    transformedValue = transformTopLevelAtom(restValue);
    coercedToDate = typeof transformedValue === 'string' ? new Date(transformedValue) : transformedValue
    return {key: '_email_verify_token_expires_at', value: coercedToDate};
  case '_account_lockout_expires_at':
    transformedValue = transformTopLevelAtom(restValue);
    coercedToDate = typeof transformedValue === 'string' ? new Date(transformedValue) : transformedValue
    return {key: '_account_lockout_expires_at', value: coercedToDate};
  case '_perishable_token_expires_at':
    transformedValue = transformTopLevelAtom(restValue);
    coercedToDate = typeof transformedValue === 'string' ? new Date(transformedValue) : transformedValue
    return { key: '_perishable_token_expires_at', value: coercedToDate };
  case '_password_changed_at':
    transformedValue = transformTopLevelAtom(restValue);
    coercedToDate = typeof transformedValue === 'string' ? new Date(transformedValue) : transformedValue
    return { key: '_password_changed_at', value: coercedToDate };
  case '_failed_login_count':
  case '_rperm':
  case '_wperm':
  case '_email_verify_token':
  case '_hashed_password':
  case '_perishable_token': return { key: restKey, value: restValue};
  case 'sessionToken': return { key: '_session_token', value: restValue};
  default: 
    if (restKey.match(/^authData\.([a-zA-Z0-9_]+)\.id$/)){
      throw new Parse.Error(Parse.Error.INVALID_KEY_NAME, 'can only query on ' + restKey);
    }
    if (restKey.match(/^_auth_data_[a-zA-Z0-9_]+$/)) {
      return { key: restKey, value: restValue};
    }
  }

  if (restValue && restValue.__type !== 'Bytes') {
    if (schema.fields[restKey] && schema.fields[restKey].type == 'Pointer' || restValue.__type == 'Pointer'){
      restKey = '_p_' + restKey;
    }
  }

  var value = transformTopLevelAtom(restValue);
  if (value !== CannotTransform) {
    return { key: restKey, value: value};
  }

  if (restKey === 'ACL') {
    throw 'There was a problem transforming an ACL.';
  }

  if (restValue instanceof Array) {
    value = restValue.map(transformInteriorValue);
    return { key: restKey, value: value};
  }

  if (Object.keys(restValue).some(key => key.includes('$') || key.includes('.'))) {
    throw new Parse.Error(Parse.Error.INVALID_NESTED_KEY, "Nested keys should not contain the '$' or '.' characters");
  }

  value = _.mapValues(restValue, transformInteriorValue);
  return { key: restKey, value: value };
}


const parseObjectToMongoObjectForCreate = (className, restCreate, schema) =>{
  
  restCreate = addLegacyACL(restCreate);
  const mongoCreate = {};
  for (const restKey in restCreate) {
    if (restCreate[restKey] && restCreate[restKey].__type === 'Relation') {
      continue;
    }
    const { key, value } = parseObjectKeyValueToMongoObjectKeyValue(
      restKey,
      restCreate[restKey],
      schema
    );

    if (value !== undefined) {
      mongoCreate[key] = value;
    }
  }

  if (mongoCreate.createdAt) {
    mongoCreate._created_at = new Date(mongoCreate.createdAt.iso || mongoCreate.createdAt);
    delete mongoCreate.createdAt;
  }

  if (mongoCreate.updatedAt) {
    mongoCreate._updated_at = new Date(mongoCreate.updatedAt.iso || mongoCreate.updatedAt);
    delete mongoCreate.updatedAt;
  }

  return mongoCreate;
}


const addLegacyACL = restObject => {
  const restObjectCopy = {...restObject};
  const _acl = {};

  if (restObject._wperm) {
    restObject._wperm.forEach(entry => {
      _acl[entry] = {w: true};
    });
    restObjectCopy._acl = _acl;
  }

  if (restObject._rperm) {
    restObject._rperm.forEach(entry => {
      if (!(entry in _acl)) {
        _acl[entry] = {r: true};
      } else {
        _acl[entry].r = true;
      }
    });
    restObjectCopy._acl = _acl;
  }

  return restObjectCopy;
}





// A sentinel value that helper transformations return when they
// cannot perform a transformation
function CannotTransform() {}


// Helper function to transform an atom from REST format to Mongo format.
// An atom is anything that can't contain other expressions. So it
// includes things where objects are used to represent other
// datatypes, like pointers and dates, but it does not include objects
// or arrays with generic stuff inside.
// Raises an error if this cannot possibly be valid REST format.
// Returns CannotTransform if it's just not an atom
function transformTopLevelAtom(atom) {
  switch(typeof atom) {
  case 'string':
  case 'number':
  case 'boolean':
    return atom;
  case 'undefined':
    return atom;
  case 'symbol':
  case 'function':
    throw new Parse.Error(Parse.Error.INVALID_JSON, `cannot transform value: ${atom}`);
  case 'object':
    if (atom instanceof Date) {
      return atom;
    }
    if (atom === null) {
      return atom;
    }

    if (atom.__type == 'Pointer') {
      return `${atom.className}$${atom.objectId}`;
    }
    if (DateCoder.isValidJSON(atom)) {
      return DateCoder.JSONToDatabase(atom);
    }
    if (BytesCoder.isValidJSON(atom)) {
      return BytesCoder.JSONToDatabase(atom);
    }
    if (GeoPointCoder.isValidJSON(atom)) {
      return GeoPointCoder.JSONToDatabase(atom);
    }
    if (FileCoder.isValidJSON(atom)) {
      return FileCoder.JSONToDatabase(atom);
    }
    return CannotTransform;
  default:
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `redlly did not expect value: ${atom}`);
  }
}



module.exports = {
  transformKey,
  parseObjectToMongoObjectForCreate,
  transformWhere,
}

