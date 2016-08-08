
import ParseApp from 'lib/ParseApp';
import React from 'react';
import * as StoreManager from 'lib/stores/StoreManager';

export default function subscribeTo(name, prop) {

  return function(Component) {
    const store = StoreManager.getStore(name);
    const displayName = Component.displayName || Component.name || 'Component';

    
  }
}