

import pluralize from 'lib/pluralize';

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;


export default function howLongAgo(date) {
  if ( isNaN(date)) {
    return 'unknown time ago';
  }

  let delta = new Date() - date;
  if (delta < 0) {
    return 'in the future';
  }

  if (delta < HOUR) {
    return 'just now';
  }

  if (delta < DAY ) {
    return pluralize(Math.floor(delta / HOUR), 'hour ago', 'hours ago');
  }

  if (delta < MONTH) {
    return pluralize(Math.floor(delta / DAY), 'day ago', 'days ago');
  }

  if ( delta < YEAR) {
    return pluralize(Math.floor(delta / MONTH), 'month ago', 'months ago');
  }

  if (delta < YEAR * 1.25) {
    return '1 year ago';
  }

  if (delta < YEAR * 1.75) {
    return 'over 1 year ago';
  }

  if (delta < YEAR * 2) {
    return 'almost 2 years ago';
  }

  return String(Math.floor(delta / YEAR)) + ' years ago';
}