
import AdaptableController from './AdaptableController';
import CacheAdapter from '../Adapters/Cache/CacheAdapter';


const KEY_SEPARATOR_CHAR = ':';

export class CacheController extends AdaptableController {
  constructor(adapter, appId, options = {}) {
    super(adapter, appId, options);

    
  }

  expectedAdapterType() {
    return CacheAdapter;
  }
}

export default CacheController;