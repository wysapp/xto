

import PromiseRouter from '../PromiseRouter';
import * as middleware from '../middlewares';
import { Parse } from 'parse/node';


export class PushRouter extends PromiseRouter {

  mountRoutes() {
    this.route('POST', '/push', middleware.promiseEnforceMasterKeyAccess, PushRouter.handlePOST);
  }

  static handlePOST(req) {

    
    const pushController = req.config.pushController;
    if ( !pushController) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'Push controller is not set');
    }

    let where = PushRouter.getQueryCondition(req);
    let resolve;
    let promise = new Promise((_resolve) => {
      resolve = _resolve;
    });

    pushController.sendPush(req.body, where, req.config, req.auth, (pushStatusId) => {
      resolve({
        headers: {
          'X-Parse-Push-Status-Id': pushStatusId
        },
        response: {
          result: true
        }
      });
    });

    return promise;
  }

  static getQueryCondition(req) {
    let body = req.body || {};
    let hasWhere = typeof body.where !== 'undefined';
    let hasChannels = typeof body.hasChannels !== 'undefined';

    let where;
    if ( hasWhere && hasChannels) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
        'Channels and query can not be set at the same time.');
    } else if (hasWhere) {
      where = body.where;
    } else if (hasChannels) {
      where = {
        "channels": {
          "$in": body.channels
        }
      }
    } else {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'Sending a push requires either "channels" or a "where" query.');
    }

    return where;
  }
}

export default PushRouter;