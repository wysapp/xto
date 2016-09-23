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