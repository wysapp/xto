import PromiseRouter from '../PromiseRouter';
import rest from '../rest';
import _ from 'lodash';
import Parse from 'parse/node';

const ALLOWED_GET_QUERY_KEYS = ['keys', 'include'];

export class ClassesRouter extends PromiseRouter {

  handleFind(req) {
    const body = Object.assign(req.body, ClassesRouter.JSONFromQuery(req.query));
    
    const options = {};
    const allowConstraints = ['skip', 'limit', 'order', 'count', 'keys', 'include', 'redirectClassNameForKey', 'where'];

    for (const key of Object.keys(body)){
      if (allowConstraints.indexOf(key) === -1) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid parameter for query: ${key}`);
      }
    }

    if (body.skip) {
      options.skip = Number(body.skip);
    }

    if (body.limit || body.limit === 0) {
      options.limit = Number(body.limit);
    } else {
      options.limit = Number(200);
    }
    if (body.order) {
      options.order = String(body.order);
    }
    if (body.count) {
      options.count = true;
    }

    if (typeof body.keys == 'string') {
      options.keys = body.keys;
    }

    if (body.include) {
      options.include = String(body.include);
    }

    if (body.redirectClassNameForKey) {
      options.redirectClassNameForKey = String(body.redirectClassNameForKey);
    }

    if (typeof body.where === 'string') {
      body.where = JSON.parse(body.where);
    }

    return rest.find(req.config, req.auth, req.params.className, body.where, options, req.info.clientSDK)
      .then((response) => {
       
        if (response && response.results) {
          for (const result of response.results) {
            if (result.sessionToken) {
              result.sessionToken = req.info.sessionToken || result.sessionToken;
            }
          }
        }
        return {response: response}
      });
  }


  handleCreate(req) {
    
    return rest.create(req.config, req.auth, req.params.className, req.body, req.info.clientSDK);
  }


  handleUpdate(req) {
    
    return rest.update(req.config, req.auth, req.params.className, req.params.objectId, req.body, req.info.clientSDK);
  }


  static JSONFromQuery(query) {
    const json = {};
    for (const [key, value] of _.entries(query)) {
      try {
        json[key] = JSON.parse(value);
      } catch(e) {
        json[key] = value;
      }
    }
    return json;
  }

  mountRoutes() {
    this.route('GET', '/classes/:className', (req) => { return this.handleFind(req); });

    this.route('GET', '/classes/:className/:objectId', (req) => { return this.handleGet(req);});
    this.route('POST', '/classes/:className', (req) => { return this.handleCreate(req); });
    this.route('PUT', '/classes/:className/:objectId', (req) => {return this.handleUpdate(req); });
    this.route('DELETE', '/classes/:className/:objectId', (req) => { return this.handleDelete(req); });
  }

}


export default ClassesRouter;