
import AdaptableController from './AdaptableController';
import MailAdapter from '../Adapters/Email/MailAdapter';
import Parse from 'parse/node';

export class UserController extends AdaptableController {

  constructor(adapter, appId, options = {}) {
    super(adapter, appId, options);
  }

  validateAdapter(adapter) {
    if (!adapter && !this.shouldVerifyEmails) {
      return;
    }

    super.validateAdapter(adapter);
  }

  expectedAdapterType() {
    return MailAdapter;
  }

}

export default UserController;