// A database adapter that works with data exported from the hosted
// Parse database.

import { Parse } from 'parse/node';
import _ from 'lodash';
import intersect from 'intersect';
import deepcopy from 'deepcopy';
import logger from '../logger';



function DatabaseController(adapter, schemaCache) {
  this.adapter = adapter;
  this.schemaCache = schemaCache;

  this.schemaPromise = null;
}


module.exports = DatabaseController;