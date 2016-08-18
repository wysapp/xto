import { Parse } from 'parse/node';
import PromiseRouter from '../PromiseRouter';
import rest from '../rest';
import AdaptableController from './AdaptableController';
import { PushAdapter } from '../Adapters/Push/PushAdapter';
import deepcopy from 'deepcopy';
import RestQuery from '../RestQuery';
import RestWrite from '../RestWrite';
import { master } from '../Auth';
import pushStatusHandler from '../pushStatusHandler';

const FEATURE_NAME = 'push';
const UNSUPPORTED_BADGE_KEY = "unsupported";

export class PushController extends AdaptableController {

  static validatePushType(where = {}, validPushTypes = []) {
    var deviceTypeField = where.deviceType || {};
    var deviceTypes = [];
    if ( typeof deviceTypeField === 'string') {
      deviceTypes.push(deviceTypeField);
    } else if (typeof deviceTypeField['$in'] === 'array') {
      deviceTypes.concat(deviceTypeField['$in']);
    }

    for (var i = 0; i < deviceTypes.length; i++) {
      var deviceType = deviceTypes[i];
      if ( validPushTypes.indexOf(deviceType) < 0) {
        throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                              deviceType + ' is not supported push type.');
      }
    }
  }

  get pushIsAvailable() {
    return !!this.adapter;
  }

  sendPush(body = {}, where = {}, config, auth, onPushStatusSaved = () => {}) {
    var pushAdapter = this.adapter;
    if ( !this.pushIsAvailable) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                            'Push adapter is not available');
    }

    // if ( !this.options) {
    //   throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
    //                         'Missing push configuration');
    // }

    PushController.validatePushType(where, pushAdapter.getValidPushTypes());

    body['expiration_time'] = PushController.getExpirationTime(body);

    let badgeUpdate = () => {
      return Promise.resolve();
    }
    if( body.data && body.data.badge) {
      let badge = body.data.badge;
      let restUpdate = {};
      if ( typeof badge == 'string' && badge.toLowerCase() === 'increment') {
        restUpdate = { badge: {__op: 'Increment', amount: 1}};
      } else if (Number(badge)) {
        restUpdate = { badge: badge };
      } else {
        throw "Invalid value for badge, expected number or 'Increment'";
      }
      let updateWhere = deepcopy(where);

      badgeUpdate = () => {
        updateWhere.deviceType = 'ios';
        let restQuery = new RestQuery(config, master(config), '_Installation', updateWhere);
        return restQuery.buildRestWhere().then(() => {
          let write = new RestWrite(config, master(config), '_Installation', restQuery.restWhere, restUpdate);

          write.runOptions.many = true;
          return write.execute();
        });
      }
    }

    let pushStatus = pushStatusHandler(config);
    return Promise.resolve().then(() => {
      return pushStatus.setInitial(body, where);
    }).then(() => {
      onPushStatusSaved(pushStatus.objectId);
      return badgeUpdate();
    }).then(() => {
      return rest.find(config, auth, '_Installation', where);
    }).then((response) => {
      if ( !response.results ) {
        return Promise.reject({error: 'PushController: no results in query'});
      }
      pushStatus.setRunning(response.results);
      return this.sendToAdapter(body, response.results, pushStatus, config);
    }).then((results) => {
      return pushStatus.complete(results);
    }).catch((err) => {
      pushStatus.fail(err);
      return Promise.reject(err);
    });
  }


  sendToAdapter(body, installations, pushStatus, config ) {
    if ( body.data && body.data.badge && typeof body.data.badge == 'string' && body.data.badge.toLowerCase() == 'increment') {
      let badgeInstallationsMap = installations.reduce((map, installation) => {
        let badge = installation.badge;
        if ( installation.deviceType != 'ios') {
          badge = UNSUPPORTED_BADGE_KEY;
        }
        map[badge+''] = map[badge+''] || [];
        map[badge+''].push(installation);
        return map;
      }, {});

      let promises = Object.keys(badgeInstallationsMap).map((badge) => {
        let payload = deepcopy(body);
        if (badge == UNSUPPORTED_BADGE_KEY) {
          delete payload.data.badge;
        } else {
          payload.data.badge = parseInt(badge);
        }

        return this.adapter.send(payload, badgeInstallationsMap[badge], pushStatus.objectId);
      });

      return Promise.all(promises);
    }

    return this.adapter.send(body, installations, pushStatus.objectId);
  }


  static getExpirationTime(body= {}) {
    var hasExpirationTime = !!body['expiration_time'];
    if ( !hasExpirationTime) {
      return;
    }

    var expirationTimeParam = body['expiration_time'];
    var expirationTime;
    if (typeof expirationTimeParam === 'number') {
      expirationTime = new Date(expirationTimeParam * 1000);
    } else if (typeof expirationTimeParam === 'string') {
      expirationTime = new Date(expirationTimeParam);
    } else {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                            body['expiration_time'] + ' is not valid time.');
    }

    if (!isFinite(expirationTime)) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                            body['expiration_time'] + ' is not valid time.');
    }

    return expirationTime.valueOf();
  } 

  expectedAdapterType() {
    return PushAdapter;
  }
}


export default PushController;