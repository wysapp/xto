import MongoCollection from './MongoCollection';


function mongoFieldToParseSchemaField(type) {
  if(type[0] === '*'){
    return {
      type: 'Pointer',
      targetClass: type.slice(1),
    };
  }

  if ( type.startsWith('relation<')) {
    return {
      type: 'Relation',
      targetClass: type.slice('relation<'.length, type.length -1),
    };
  }

  switch(type) {
    case 'number':    return { type: 'Number'};
    case 'string':    return { type: 'String'};
    case 'boolean':   return { type: 'Bollean'};
    case 'date':      return { type: 'Date'};
    case 'map':    
    case 'object':    return { type: 'Object'};
    case 'array':     return { type: 'Array'};
    case 'geopoint':  return { type: 'GeoPoint'};
    case 'file':      return { type: 'File'};
    case 'bytes':     return { type: 'Bytes'};
  }
}

const nonFieldSchemKeys = ['_id', '_metadata', '_client_permissions'];

function mongoSchemaFieldsToParseSchemaFields(schema) {
  var fieldNames = Object.keys(schema).filter(key => nonFieldSchemKeys.indexOf(key) === -1);

  var response = fieldNames.reduce((obj, fieldName) => {
    obj[fieldName] = mongoFieldToParseSchemaField(schema[fieldName]);
    return obj;
  }, {});

  response.ACL = {type: 'ACL'};
  response.createdAt = {type: 'Date'};
  response.updatedAt = {type: 'Date'};
  response.objectId = {type: 'String'};
  return response;
}

const emptyCLPS = Object.freeze({
  find: {},
  get: {},
  create: {},
  update: {},
  delete: {},
  addField: {},
});

const defaultCLPS = Object.freeze({
  find: {'*': true},
  get: {'*': true},
  create: {'*': true},
  update: {'*': true},
  delete: {'*': true},
  addField: {'*': true}
});

function mongoSchemaToParseSchema(mongoSchema) {
  let clps = defaultCLPS;
  if (mongoSchema._metadata && mongoSchema._metadata.class_permissions) {
    clps = {...emptyCLPS, ...mongoShema._metadata.class_permissions};
  }

  return {
    className: mongoSchema._id,
    fields: mongoSchemaFieldsToParseSchemaFields(mongoSchema),
    classLevelPermissions: clps,
  };
}

function _mongoSchemaQueryFromNameQuery(name: string, query) {
  let object = { _id: name };
  if (query) {
    Object.keys(query).forEach(key => {
      object[key] = query[key];
    });
  }
  return object;
}


function parseFieldTypeToMongoFieldType({type, targetClass}) {
  switch(type) {
    case 'Pointer':       return `*${targetClass}`;
    case 'Relation':      return `relation<${targetClass}>`;
    case 'Number':        return 'number';
    case 'String':        return 'string';
    case 'Boolean':       return 'boolean';
    case 'Date':          return 'date';
    case 'Object':        return 'object';
    case 'Array':         return 'array';
    case 'GeoPoint':      return 'geopoint';
    case 'File':          return 'file';
  }
}

class MongoSchemaCollection {
  _collection: MongoCollection;

  constructor(collection: MongoCollection) {
    this._collection = collection;
  }

  _fetchAllSchemasFrom_SCHEMA() {
    return this._collection._rawFind({})
    .then(schemas => schemas.map(mongoSchemaToParseSchema));
  }

  _fechOneSchemaFrom_SCHEMA(name: string) {
    return this._collection._rawFind(_mongoSchemaQueryFromNameQuery(name), { limit: 1 }).then(results => {
      if (results.length === 1) {
        return mongoSchemaToParseSchema(results[0]);
      } else {
        throw undefined;
      }
    });
  }


}

MongoSchemaCollection._TESTmongoSchemaToParseSchema = mongoSchemaToParseSchema;
MongoSchemaCollection.parseFieldTypeToMongoFieldType = parseFieldTypeToMongoFieldType;

export default MongoSchemaCollection;