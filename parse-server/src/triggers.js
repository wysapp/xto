// triggers.js

import Parse from 'parse/node';
import { logger } from './logger';

export const Types = {
  beforeSave: 'beforeSave',
  afterSave: 'afterSave',
  beforeDelete: 'beforeDelete',
  afterDelete: 'afterDelete',
  beforeFind: 'beforeFind',
  afterFind: 'afterFind'
};

const _triggerStore = {};


export function getTrigger(className, triggerType, applicationId) {
  if (!applicationId) {
    throw "Missing ApplicationID";
  }

  var manager = _triggerStore[applicationId];
  if (
    manager 
      && manager.Triggers 
      && manager.Triggers[triggerType] 
      && manager.Triggers[triggerType][className]
  ) {
    return manager.Triggers[triggerType][className];
  }

  return undefined;
}


export function triggerExists(className: string, type: string, applicationId: string): boolean {
  return (getTrigger(className, type, applicationId) != undefined);
}

export function getRequestQueryObject(triggerType, auth, query, config) {
  var request = {
    triggerName: triggerType,
    query: query,
    master: false,
    log: config.loggerController
  };

  if (!auth) {
    return request;
  }
  if (auth.isMaster) {
    request['master'] = true;
  }
  if (auth.user){
    request['user'] = auth.user;
  }
  if (auth.installationId) {
    request['installationId'] = auth.installationId;
  }
  return request;
}



export function maybeRunQueryTrigger(triggerType, className, restWhere, restOptions, config, auth) {
  const trigger = getTrigger(className, triggerType, config.applicationId);
  if (!trigger) {
    return Promise.resolve({
      restWhere,
      restOptions
    });
  }

  const parseQuery = new Parse.Query(className);
  if (restWhere) {
    parseQuery._where = restWhere;
  }
  if (restOptions) {
    if (restOptions.include && restOptions.include.length > 0) {
      parseQuery._include = restOptions.include.split(',');
    }
    if (restOptions.skip){
      parseQuery._skip = restOptions.skip;
    }
    if (restOptions.limit) {
      parseQuery._limit= restOptions.limit;
    }
  }

  const requestObject = getRequestQueryObject(triggerType, auth, parseQuery, config);

  return Promise.resolve().then(() =>{
    return trigger(requestObject);
  }).then((result) => {
    let queryResult = parseQuery;
    if (result && result instanceof Parse.Query) {
      queryResult = result;
    }
    const jsonQuery = queryResult.toJSON();
    if (jsonQuery.where) {
      restWhere = jsonQuery.where;
    }
    if (jsonQuery.limit) {
      restOptions = restOptions || {};
      restOptions.limit = jsonQuery.limit;
    }

    if (jsonQuery.skip){
      restOptions = restOptions || {};
      restOptions.skip = jsonQuery.skip;
    }

    if (jsonQuery.include) {
      restOptions = restOptions || {};
      restOptions.include = jsonQuery.include;
    }

    if(jsonQuery.keys) {
      restOptions = restOptions || {};
      restOptions.keys = jsonQuery.keys;
    }
    return {
      restWhere,
      restOptions
    };
  }, (err) => {
    if(typeof err === 'string') {
      throw new Parse.Error(1, err);
    } else {
      throw err;
    }
  });
}