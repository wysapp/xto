/** @flow weak */

import { logger } from '../logger';

const DefaultHooksCollectionName = '_Hooks';

export class HooksController {
  _applicationId:string;
  _webhookKey: string;
  database: any;

  constructor(applicationId: string, databaseController, webhookKey) {
    this._applicationId = applicationId;
    this._webhookKey = webhookKey;
    this.database = databaseController;
  }
}

export default HooksController;