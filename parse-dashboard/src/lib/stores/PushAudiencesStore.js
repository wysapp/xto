

import { abortableGet, post, del } from 'lib/AJAX';
import keyMirror from 'lib/keyMirror';
import Parse from 'parse';
import { List, Map } from 'immutable';
import { registerStore } from 'lib/stores/StoreManager';

export const ActionTypes = keyMirror(['FETCH', 'CREATE', 'DESTROY', 'ABORT_FETCH']);

const LASTFETCHTIMEOUT = 60000;

let xhrMap = {};

