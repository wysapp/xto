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
  }

  return (
    <div style={{ position: 'absolute', top: top, left: left}}>
      {content}
    </div>
  );
};


export default Editor;