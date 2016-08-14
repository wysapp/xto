

import { Parse } from 'parse/node';
import PromiseRouter from '../PromiseRouter';
import * as middleware from '../middlewares';


export class LogsRouter extends PromiseRouter {

  mountRoutes() {
    this.route('GET', '/scriptlog', middleware.promiseEnforceMasterKeyAccess, this.validateRequest, (req) => {
      return this.handleGET(req);
    });
  }

  validateRequest(req) {
    if (!req.config || !req.config.loggerController) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
        'Logger adapter is not availabe');
    }
  }


  handleGET(req) {
    const from = req.query.from;
    const until = req.query.until;
    let size = req.query.size;

    if ( req.query.n) {
      size = req.query.n;
    }

    const order =req.query.order;
    const level = req.query.level;
    const options = {
      from,
      until,
      size,
      order,
      level
    };

    return req.config.loggerController.getLogs(options).then((result) => {
      return Promise.resolve({
        response: result
      });
    })
  }

}


export default LogsRouter;