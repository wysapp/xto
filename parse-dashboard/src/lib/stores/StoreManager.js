

import Parse from 'parse';
import * as StateManager from 'lib/stores/StateManager';

let stores = {};
let subCount = 0;


export function registerStore(name, store, isGlobal) {
  if (stores[name]) {
    throw new Error(
      'Conflict! Attempted to register multiple stores with the name ' + name
    );
  }

  stores[name] = {
    store: store,
    subscribers: {},
    isGlobal: !!isGlobal
  };
}