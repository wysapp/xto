/**
 * Copyright 2016 Facebook, Inc.
 *
 * @flow
 */

'use strict';

const Parse = require('parse/react-native');
const { AppEventsLogger } = require('react-native-fbsdk');
const Platform = require('Platform');
const InteractionManager = require('InteractionManager');
const ActionSheetIOS = require('ActionSheetIOS');
const Alert = require('Alert');
const Share = require('react-native-share');
const Agenda = Parse.Object.extend('Agenda');
const { currentInstallation, updateInstallaction } = require('./installation');

import type { ThunkAction, PromiseAction, Dispatch } from './types';
import type { Session } from '../reducers/sessions';


async function restoreSchedule(): PromiseAction {
  const list = await Parse.User.current().relation('mySchedule').query().find();

  const channels = list.map(({id}) => `session_${id}`);
  updateInstallaction({channels});

  return {
    type: 'RESTORED_SCHEDULE',
    list,
  };
}

async function loadFriendsSchedules(): PromiseAction {
  const list = await Parse.Cloud.run('friends');
  await InteractionManager.runAfterInteractions();
  return {
    type: 'LOADED_PRIENDS_SCHEDULES',
    list,
  };
}

module.exports = {
  loadFriendsSchedules,
};