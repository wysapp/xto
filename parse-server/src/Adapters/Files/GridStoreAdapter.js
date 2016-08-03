import { MongoClient, GridStore, Db} from 'mongodb';
import { FilesAdapter } from './FilesAdapter';

const DefaultMongoURI = 'mongodb://localhost:27017/parse';

export class GridStoreAdapter extends FilesAdapter {
  _databaseURI: string;
  _connectionPromise: Promise<Db>;

  constructor(mongoDatabaseURI = DefaultMongoURI) {
    super();
    this._databaseURI = mongoDatabaseURI;
    this._connect();
  }

  _connect() {
    if(!this._connectionPromise) {
      this._connectionPromise = MongoClient.connect(this._databaseURI);
    }

    return this._connectionPromise;
  }
}

export default GridStoreAdapter;