'use strict';

const Parse = require('parse/react-native');
const logError = require('logError');
const InteractionManager = require('InteractionManager');

import type { ThunkAction } from './types';

const Maps = Parse.Object.extend('Maps');

const Notification = Parse.Object.extend('Notification');

function loadParseQuery(type: String, query: Parse.Query): ThunkAction {
  return (dispatch) => {
    return query.find({
      success: (list) => {
        InteractionManager.runAfterInteractions(() => {
          dispatch(({type, list}: any));
        });
      },
      error: logError,
    });
  };
}

module.exports = {
  loadSessions: () : ThunkAction => 
    loadParseQuery(
      'LOADED_SESSIONS',
      new Parse.Query('Agenda')
        .include('speakers')
        .ascending('startTime')
    ),
  
  loadMaps: (): ThunkAction => 
    loadParseQuery(
      'LOADED_MAPS', new Parse.Query(Maps)
    ),

  loadNotifications: (): ThunkAction =>
    loadParseQuery('LOADED_NOTIFICATIONS', new Parse.Query(Notification))
};