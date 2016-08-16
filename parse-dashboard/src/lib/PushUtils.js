

import * as PushConstants from 'dashboard/Push/PushConstants';

import prettyNumber from 'lib/prettyNumber';
import React from 'react';
import stringList from 'lib/stringList';

let pointerToReadbleValue = (value) => {
  return value.className + ':' + value.objectId
}


export function formatConstraint(key, constraints, schema ) {
  let rows = [];
  if ( constraints.constructor === Object ) {
    rows.push( formatStructure(key, constraints, schema));
  } else if (constraints.constructor === Array) {
    for (let i = 0; i < constraints.length; i++) {
      if (constraints[i].constructor === Object) {
        rows = rows.concat(formatStructure(key, constraints[i], schema));
      } else {
        rows.push(formatStructure(key, {'$in': constraints[i]}, schema));
        break;
      }
    }
  } else if (constraints.constructor === Boolean) {
    rows.push([ [key, 'is', constraints ? 'true' : 'false']]);
  } else {
    rows.push([[ key, 'is', constraints]]);
  }

  return rows;
}



/**
 * build short for query information
 * @param  {Object} query
 * @param  {Object} schema
 * @return {String}
 */
export function shortInfoBuilder(query, schema) {
  if(!query){
    return '';
  }

  let platformString = query.deviceType && query.deviceType['$in'] ? devicesToReadableList(query.deviceType['$in']).join(', ') : '';
  let otherConstraints = [];
  for(let entry in query){
    if(entry !== 'deviceType'){ //filter out deviceType entry
      formatConstraint(entry, query[entry], schema).forEach(
        (constraint) => {
          constraint.forEach(
            ([key, description, value]) => {
              otherConstraints.push([key, description, value].join(' '));
            }
          )
        }
      );
    }
  }
  return [platformString, otherConstraints.join(', ')].join(', ');
}
