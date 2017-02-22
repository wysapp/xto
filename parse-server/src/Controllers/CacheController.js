
import AdaptableController from './AdaptableController';
import CacheAdapter from '../Adapters/Cache/CacheAdapter';


const KEY_SEPARATOR_CHAR = ':';

function joinKeys(...keys) {
  return keys.join(KEY_SEPARATOR_CHAR);
}

export class CacheController extends AdaptableController {
  constructor(adapter, appId, options = {}) {
    super(adapter, appId, options);

    
  }

  get(key) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.get(cacheKey).then(null, () => Promise.resolve(null));
  }


  put(key, value, ttl) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.put(cacheKey, value, ttl);
  }


  del(key) {
    const cacheKey = joinKeys(this.appId, key);
    return this.adapter.del(cacheKey);
  }

  expectedAdapterType() {
    return CacheAdapter;
  }
}

export default CacheController;