/**
 * Copyright 2016 Facebook, Inc.
 *
 * @flow
 */


'use strict';

var { combineReducers } = require('redux');

module.exports = combineReducers({
  config: require('./config'),
  notifications: require('./notifications'),
  maps: require('./maps'),
  sessions: require('./sessions'),
  user: require('./user'),

  navigation: require('./navigation'),

  surveys: require('./surveys'),
});