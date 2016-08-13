
import { get, post } from 'lib/AJAX';
import keyMirror from 'lib/keyMirror';
import Parse from 'parse';
import { Map } from 'immutable';
import { registerStore } from 'lib/stores/StoreManager';

export const ActionTypes = keyMirror(['FETCH', 'SET', 'DELETE']);


function ConfigStore(state, action) {
  action.app.setParseKeys();
  switch(action.type) {
    case ActionTypes.FETCH:
      return Parse.Config.get().then(({ attributes }) => {
        return Map({ lastFetch: new Date(), params: Map(attributes) });
      });
    case ActionTypes.SET:
      return Parse._request(
        'PUT',
        'config',
        {params: {[action.param]: Parse._encode(action.value) }},
        {useMasterKey: true}
      ).then(() => {
        return state.setIn(['params', action.param], action.value);
      });
    case ActionTypes.DELETE:
      return Parse._request(
        'PUT',
        'config',
        {params: {[action.param]: { __op: 'Delete'}}},
        {useMasterKey: true}
      ).then(() => {
        return state.deleteIn(['params', action.param]);
      });
  }
}


registerStore('Config', ConfigStore);