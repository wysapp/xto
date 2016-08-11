

import { dateStringUTC, isDate } from 'lib/DateUtils';
import getFileName from 'lib/getFileName';
import Pill from 'components/Pill/Pill.react';
import Parse from 'parse';
import React from 'react';

import styles from 'components/BrowserCell/BrowserCell.scss';
import { unselectable } from 'stylesheets/base.scss';


let BrowserCell = ({ type, value, hidden, width, current, onSelect, readonly, onEditChange, setRelation, onPointerClick}) => {

  let content = value;
  let classes = [styles.cell, unselectable];

  if ( hidden) {
    content = '(hidden)';
    classes.push(styles.empty);
  } else if (value === undefined) {
    if ( type === 'ACL') {
      content = 'Public Read + Write';
    } else {
      content = '(undefined)';
      classes.push(styles.empty);
    }
  } else if (value === null) {
    content = '(null)';
    classes.push(styles.empty);
  } else if(type === 'Pointer') {
    content = (
      <a href='javascript:;' onClick={onPointerClick.bind(undefined, value)}>
        <Pill value={valud.id} />
      </a>
    );
  } else if (type === 'Date' ) {
    content = dateStringUTC(value);
  } else if ( type === 'Boolean') {
    content = value ? 'True' : 'False';
  } else if ( type === 'Array') {
    content = JSON.stringify(value.map(val => val instanceof Parse.Object ? val.toPointer() : val));
  } else if ( type === 'Object' ) {
    content = JSON.stringify(value);
  } else if ( type === 'File') {
    if ( value.url()) {
      content = <a href={value.url()} target='_blank'><Pill value={getFileName(value)} /></a>;
    } else {
      content = <Pill value={'Uploading\u2026'} />;
    }
  } else if ( type === 'ACL' ) {
    let pieces = [];
    let json = value.toJSON();
    if (json.hasOwnProperty('*')) {
      if ( json['*'].read && json['*'].write) {
        pieces.push('Public Read + Write');
      } else if (json['*'].read) {
        pieces.push('Public Read');
      } else if (json['*'].write) {
        pieces.push('Public Write');
      }
    }

    for (let role in json) {
      if (role !== '*') {
        pieces.push(role);
      }
    }

    if ( pieces.length === 0) {
      pieces.push('Master Key Only');
    }
    content = pieces.join(', ');
  } else if ( type === 'GetPoint') {
    content = `(${value.latitude}, ${value.longitude})`;
  } else if ( type === 'Relation') {
    content = (
      <div style={{ textAlign: 'center', cursor: 'pointer'}}>
        <Pill onClick={() => setRelation(value)} value='View relation' />
      </div>
    );
  }

  if ( current ) {
    classes.push(styles.current);
  }

  return (
    <span 
      className={classes.join(' ')}
      style={{ width }}
      onClick={onSelect}
      onDoubleClick={() => {
        if ( type !== 'Relation') {
          onEditChange(true);
        }
      }}>
      {content}
    </span>
  );
};


export default BrowserCell;

