/**
 * Copyright 2016 Facebook, Inc.
 *
 * @flow
 */

'use strict';

var Platform = require('Platform');
var crc32 = require('crc32');

export type Notification = {
  id: string;
  url: ?string;
  text: string;
  time: number;
};

export type SeenNotifications = {
  [id: string]: boolean;
};

type State = {
  enabled: ?boolean;
  registered: boolean;
  server: Array<Notification>;
  push: Array<Notification>;
  seen: SeenNotifications;
};

const initialState = {
  server: [],
  push: [],
  enabled: Platform.OS === 'ios' ? null : true,
  registered: false,
  seen: {},
};

import type { Action } from '../actions/types';

function notifications(state: State = initialState, action: Action) : State {
  switch (action.type) {
    case 'LOADED_NOTIFICATIONS':
      let list = action.list.map(fromParseObject);
      return { ...state, server: list};
    
    default:
      return state;
  }
}


function fromParseObject(object: Object): Notification {
  return {
    id: object.id,
    text: object.get('text'),
    url: object.get('url'),
    time: object.createdAt.getTime(),
  };
}

module.exports = notifications;