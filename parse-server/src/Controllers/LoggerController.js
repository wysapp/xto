import {Parse} from 'parse/node';
import AdaptableController from './AdaptableController';
import {LoggerAdapter} from '../Adapters/Logger/LoggerAdapter';
import url from 'url';

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const LOG_STRING_TRUNCATE_LENGTH = 1000;
const truncationMarker = '... (truncated)';

export const LogLevel= {
  INFO: 'info',
  ERROR: 'error'
}

export const LogOrder = {
  DESCENDING: 'desc',
  ASCENDING: 'asc'
}

export class LoggerController extends AdaptableController {

  maskSensitiveUrl(urlString) {
    const password = url.parse(urlString, true).query.password;
    if (password) {
      urlString = urlString.replace('password=' + password, 'password=********');
    }
    return urlString;
  }

  maskSensitive(argArray) {
    return argArray.map(e => {
      if (!e) {
        return e;
      }

      if (typeof e === 'string') {
        return e.replace(/(password".?:.?")[^"]*"/g, '$1********"');
      }

      // else it is an object...

      // check the url

      if (e.url) {
        e.url = this.maskSensitiveUrl(e.url);
      }

      if (e.body) {
        for (const key of Object.keys(e.body)) {
          if (key === 'password') {
            e.body[key] = '********';
            break;
          }
        }
      }
      return e;
    });
  }

  log(level, args) {
    // make the passed in arguments object an array with the spread operator
    args = this.maskSensitive([...args]);
    args = [].concat(level, args);
    this.adapter.log.apply(this.adapter, args);
  }

  info() {
    return this.log('info', arguments);
  }

  error() {
    return this.log('error', arguments);
  }

  warn() {
    return this.log('warn', arguments);
  }

  verbose() {
    return this.log('verbose', arguments);
  }

  debug() {
    return this.log('debug', arguments);
  }

  silly() {
    return this.log('silly', arguments);
  }

  expectedAdapterType() {
    return LoggerAdapter;
  }

}


export default LoggerController;