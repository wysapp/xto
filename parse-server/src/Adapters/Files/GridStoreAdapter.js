/**
 GridStoreAdapter
 Stores files in Mongo using GridStore
 Requires the database adapter to be based on mongoclient

 @flow weak
 */

import { MongoClient, GridStore, Db} from 'mongodb';
import { FilesAdapter } from './FilesAdapter';
import defaults from '../../defaults';

export class GridStoreAdapter extends FilesAdapter {
  _databaseURI: string;
  _connectionPromise: Promise<Db>;

  constructor(mongoDatabaseURI = defaults.DefaultMongoURI) {
    super();

    this._databaseURI = mongoDatabaseURI;
  }
}

export default GridStoreAdapter;