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


// A sentinel value that helper transformations return when they
// cannot perform a transformation



module.exports = {
  transformKey,
  transformWhere,
}

