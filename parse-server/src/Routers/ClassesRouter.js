import PromiseRouter from '../PromiseRouter';

import _ from 'lodash';
import Parse from 'parse/node';

const ALLOWED_GET_QUERY_KEYS = ['keys', 'include'];

export class ClassesRouter extends PromiseRouter {

  mountRoutes() {
    this.route('GET', '/classes/:className', (req) => { return this.handleFind(req); });

    this.route('GET', '/classes/:className/:objectId', (req) => { return this.handleGet(req);});
    this.route('POST', '/classes/:className', (req) => { return this.handleCreate(req); });
    this.route('PUT', '/classes/:className/:objectId', (req) => {return this.handleUpdate(req); });
    this.route('DELETE', '/classes/:className/:objectId', (req) => { return this.handleDelete(req); });
  }

}


export default ClassesRouter;