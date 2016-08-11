/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];


const toString = Object.prototype.toString;

export function isDate(obj){
  return typeof(obj) === 'object' && toString.call(obj).indexOf('Date') > -1;
}

export function getWeekday(n) {
  return WEEKDAYS[n];
}

export function getMonth(n) {
  return MONTHS[n];
}


export function shortMonth(month) {
  if ( month === 5 || month === 6 || month === 8) {
    return MONTHS[month].substr(0, 4);
  }
  if ( !MONTHS[month]) {
    return '';
  }
  return MONTHS[month].substr(0, 3);
}


export function dateStringUTC(date) {
  let full = String(date.getUTCDate()) + ' ' +
      shortMonth(date.getUTCMonth()) + ' ' +
      String(date.getUTCFullYear()) + ' at ';
  let time =  {
    hours: String(date.getUTCHours()),
    minutes: String(date.getUTCMinutes()),
    seconds: String(date.getUTCSeconds())
  };

  for (let k in time) {
    if (time[k].length < 2) {
      time[k] = '0' + time[k];
    }
  }
  full += time.hours + ':' + time.minutes + ':' + time.seconds + ' UTC';

  return full;
}