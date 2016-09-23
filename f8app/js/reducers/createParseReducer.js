'use strict';

import type { Action } from '../actions/types';

type Convert<T> = (object: Object) => T;
type Reducer<T> = (state: ?Array<T>, action: any) => Array<T>;

function createParseReducer<T>(
  type: string,
  convert: Convert<T>
): Reducer<T> {
  return function(state: ?Array<T>, action: Action): Array<T> {
    if (action.type === type) {
      return (action: any).list.map(convert);
    }
    return state || [];
  };
}

module.exports = createParseReducer;