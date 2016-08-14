
import { LoggerAdapter } from './LoggerAdapter';
import winston from 'winston';
import fs from 'fs';
import { Parse } from 'parse/node';
import { logger, configure } from '../../logger';


const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const CACHE_TIME = 1000* 60;

let LOGS_FOLDER = './logs/';

if ( typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  LOGS_FOLDER = './test/logs';
}

let currentDate = new Date();

let simpleCache = {
  timestamp: null,
  from: null,
  until: null,
  order: null,
  data: [],
  level: 'info'
};

let _getNearestDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export class FileLoggerAdapter extends LoggerAdapter {

  info() {
    return logger.info.apply(undefined, arguments);
  }

  error() {
    return logger.error.apply(undefined, arguments);
  }

  query(options, callback = ()=>{}) {
    if ( !options) {
      options = {};
    }

    let from = options.from || new Date(Date.now() - (7 * MILLISECONDS_IN_A_DAY));
    let until = options.until || new Date();
    let limit = options.size || 10;
    let order = options.order || 'desc';
    let level = options.level || 'info';
    let roundedUntil = _getNearestDay(until);
    let roundedFrom = _getNearestDay(from);


    var options = {
      from,
      until,
      limit,
      order
    };

    return new Promise((resolve, reject) => {
      logger.query(options, (err, res) => {
        if ( err) {
          callback(err);
          return reject(err);
        }
        if(level == 'error') {
          callback(res['parse-server-error']);
          resolve(res['parse-server-error']);
        } else {
          callback(res['parse-server']);
          resolve(res['parse-server']);
        }
      })
    });
  }

}

export default FileLoggerAdapter;