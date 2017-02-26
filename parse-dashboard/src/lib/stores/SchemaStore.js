/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import Parse from 'parse';
import { Map } from 'immutable';
import { get, post } from 'lib/AJAX';
import keyMirror from 'lib/keyMirror';
import { registerStore } from 'lib/stores/StoreManager';

export const ActionTypes = keyMirror([
  'FETCH',
  'CREATE_CLASS',
  'DROP_CLASS',
  'ADD_COLUMN',
  'DROP_COLUMN',
  'SEL_CLP'
]);


function SchemaStore(state, action) {
  switch(action.type) {
    case ActionTypes.FETCH:
      if (state && new Date() - state.get('lastFetch') < 60000) {
        return Parse.Promise.as(state);
      }
      
      return action.app.apiRequest(
        'GET',
        'schemas',
        {},
        { useMasterKey: true }
      ).then(({results}) => {
        let classes = {};
        let CLPs = {};
        if (results) {
          results.forEach(({className, fields, classLevelPermissions}) => {
            classes[className] = Map(fields);
            CLPs[className] = Map(classLevelPermissions);
          });
        }

        return Map({
          lastFetch: new Date(),
          classes: Map(classes),
          CLPs: Map(CLPs)
        });
      });
    
    case ActionTypes.CREATE_CLASS:
      return action.app.apiRequest(
        'POST',
        'schemas/' + action.className,
        { className: action.className},
        { useMasterKey: true }
      ).then(({fields}) => {
        return state
        .setIn(['classes', action.className], Map(fields))
        .setIn(['CLPs', action.className], Map({}));
      });
  }
}


registerStore('Schema', SchemaStore);