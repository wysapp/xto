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

  put(key, value) {
    return this.cache.get(this.prefix + ALL_KEYS).then((allKeys) => {
      allKeys = allKeys || {};
      allKeys[key] = true;

      return Promise.all([this.cache.put(this.prefix + ALL_KEYS, allKeys, this.ttl), this.cache.put(key, value, this.ttl)]);
    });
  }

  getAllClasses() {
    if (!this.ttl) {
      return Promise.resolve(null);
    }
    return this.cache.get(this.prefix + MAIN_SCHEMA);
  }


  setAllClasses(schema) {
    if (!this.ttl) {
      return Promise.resolve();
    }

    return this.put(this.prefix + MAIN_SCHEMA, schema);
  }

  clear() {
    return this.cache.get(this.prefix + ALL_KEYS).then((allKeys) => {
      if (!allKeys) {
        return;
      }

      const promises = Object.keys(allKeys).map((key) => {
        return this.cache.del(key);
      });
      return Promise.all(promises);
    })
  }
}