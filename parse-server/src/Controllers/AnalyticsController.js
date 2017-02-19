
import AdaptableController from './AdaptableController';
import {AnalyticsAdapter} from '../Adapters/Analytics/AnalyticsAdapter';


export class AnalyticsController extends AdaptableController {

  expectedAdapterType() {
    return AnalyticsAdapter;
  }
}

export default AnalyticsController;