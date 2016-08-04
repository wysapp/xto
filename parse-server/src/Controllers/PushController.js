import { Parse } from 'parse/node';

import AdaptableController from './AdaptableController';
import { PushAdapter } from '../Adapters/Push/PushAdapter';


const FEATURE_NAME = 'push';
const UNSUPPORTED_BADGE_KEY = "unsupported";

export class PushController extends AdaptableController {

  get pushIsAvailable() {
    return !!this.adapter;
  }

  expectedAdapterType() {
    return PushAdapter;
  }
}


export default PushController;