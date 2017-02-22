const MAIN_SCHEMA = "__MAIN_SCHEMA";
const SCHEMA_CACHE_PREFIX = "__SCHEMA";
const ALL_KEYS = "__ALL_KEYS";


import { randomString } from '../cryptoUtils';
import defaults from '../defaults';

export default class SchemaCache {
  cache: Object;

  constructor(cacheController, ttl = defaults.schemaCacheTTL, singleCache = false) {
    this.ttl = ttl;
    if (typeof ttl == 'string') {
      this.ttl = parseInt(ttl);
    }

    this.cache = cacheController;
    this.prefix = SCHEMA_CACHE_PREFIX;
    if (!singleCache) {
      this.prefix += randomString(20);
    }
  }

  getAllClasses() {
    if (!this.ttl) {
      return Promise.resolve(null);
    }
    return this.cache.get(this.prefix + MAIN_SCHEMA);
  }
}