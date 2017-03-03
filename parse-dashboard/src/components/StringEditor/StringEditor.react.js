/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import styles from 'components/StringEditor/StringEditor.scss';

export default class StringEditor extends React.Component {
  constructor(props) {
    super();

    this.state = {
      value: props.value || ''
    };
  }

  render() {
    let onChange = this.props.readonly ? () => {} : (e) => this.setState({value: e.target.value});
    if (this.props.multiline) {
      return (
        <div className={styles.editor}>
          <textarea 
            ref="input"
            value={this.state.value}
            onChange={onChange}
            style={{ minWidth: this.props.minWidth }}
          />
        </div>
      );
    }

    return (
      <div style={{ width: this.props.width }} className={styles.editor} >
        <input 
          ref="input"
          value={this.state.value}
          onChange={onChange}
        />
      </div>
    );
  }
}