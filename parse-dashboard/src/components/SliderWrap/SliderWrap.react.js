/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Anchors, Directions } from 'lib/Constants';
import styles from 'components/SliderWrap/SliderWrap.scss';

export default class SliderWrap extends React.Component {

  componentDidMount() {
    let wrap = ReactDOM.findDOMNode(this);
    this.metrics = wrap.children[0];
    console.log('2222222222222222222222', this.metrics);
  }

  render() {
    let style = {};
    
    return (
      <div className={styles.slider} style={style}>
        <div className={styles.metrics} style={this.props.block ? {display: 'block'} : {}}>
          {this.props.children}
        </div>
      </div>
    )
  }
}

module.exports = SliderWrap;