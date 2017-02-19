import { InMemoryCache } from './InMemoryCache';

export class InMemoryCacheAdapter {

  constructor(ctx) {
    this.cache = new InMemoryCache(ctx);
  }
}

export default InMemoryCacheAdapter;