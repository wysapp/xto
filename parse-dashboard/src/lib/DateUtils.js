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

export function getMonth(n) {
  return MONTHS[n];
}


export function nextMonth(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1
  );
}

export function prevMonth(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() - 1,
    1
  );
}

export function daysInMonth(date) {
  let next = nextMonth(date);
  let lastDay = new Date(next.getFullYear(), next.getMonth(), next.getDate() -1);
  return lastDay.getDate();
}


export function hoursFrom(date, delta) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours() + delta,
    date.getMinutes()
  );
}



export function getDateMethod(local, methodName) {
  if (!local) {
    return methodName.replace('get', 'getUTC');
  } else {
    return methodName;
  }
}