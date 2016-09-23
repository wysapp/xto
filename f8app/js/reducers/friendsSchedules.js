'use strict';

import type { Action } from '../actions/types';

export type FriendsSchedule = {
  id: string;
  name: string;
  schedule: {[key: string]: boolean};
};

type state = Array<FriendsSchedule>;