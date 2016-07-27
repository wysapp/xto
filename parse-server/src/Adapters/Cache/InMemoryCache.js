const DEFAULT_CACHE_TTL = 5 * 1000;

export class InMemoryCache {
  constructor({
    ttl = DEFAULT_CACHE_TTL
  }) {
    this.ttl = ttl;
    this.cache = Object.create(null);
  }

  get(key) {
    let record = this.cache[key];
    if ( record == null) {
      return null;
    }

    if ( isNaN(record.expire) || record.expire >= Date.now()) {
      return record.value;
    }

    delete this.cache[key];
    return null;
  }

  put(key, value, ttl = this.ttl) {
    if(ttl < 0 || isNaN(ttl)) {
      ttl = NaN;
    }

    var record =  {
      value: value,
      expire: ttl + Date.now()
    }

    if (!isNaN(record.expire)) {
      record.timeout = setTimeout(() => {
        this.del(key);
      }, ttl);
    }
    this.cache[key] = record;
    
  }
}

export default InMemoryCache;