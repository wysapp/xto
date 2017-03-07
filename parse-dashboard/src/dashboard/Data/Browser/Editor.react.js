/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import Parse from 'parse';

import StringEditor from 'components/StringEditor/StringEditor.react';
import NumberEditor from 'components/NumberEditor/NumberEditor.react';
import DateTimeEditor from 'components/DateTimeEditor/DateTimeEditor.react';


let Editor = ({top, left, type, targetClass, value, readonly, width, onCommit}) => {
  let content= null;
  if (type === 'String') {
    content = (
      <StringEditor
        value={value}
        readonly={readonly}
        multiline={!readonly}
        width={width}
        onCommit={onCommit}
      />
    );
  } else if (type === 'Array' || type === 'Object') {
    let encodeCommit = (json) => {
      try {
        let obj = JSON.parse(json);
        onCommit(obj);
      } catch(e) {
        onCommit(value);
      }
    }

    content = (
      <StringEditor
        value={JSON.stringify(value)}
        multiline={true}
        width={width}
        onCommit={encodeCommit}
      />
    );
  }
  
   else if (type === 'Date') {
    if (readonly) {
      content = (
        <StringEditor
          value={value ? value.toISOString() : ''}
          readonly={true}
          width={width}
          onCommit={() => onCommit(value)}
        />
      );
    } else {
      content = (
        <DateTimeEditor
          value={value || new Date()}
          width={width}
          onCommit={onCommit}
        />
      );
    }
  } else if (type === 'Number') {
    content = (
      <NumberEditor 
        value={value}
        width={width}
        onCommit={onCommit}
      />
    );
  }

  return (
    <div style={{ position: 'absolute', top: top, left: left}}>
      {content}
    </div>
  );
};


export default Editor;