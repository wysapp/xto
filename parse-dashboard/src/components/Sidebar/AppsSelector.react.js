/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Popover from 'components/Popover/Popover.react';
import Position from 'lib/Position';
import history from 'dashboard/history';
import ParseApp from 'lib/ParseApp';
import styles from 'components/Sidebar/Sidebar.scss';

export default class AppsSelector extends React.Component {

  constructor() {
    super();

    this.state = {
      open: false,
      position: null,
    };
  }

  componentDidMount() {
    this.setState({
      position: Position.inWindow(ReactDOM.findDOMNode(this))
    });
  }

  toggle() {
    this.setState({
      open: !this.state.open
    });
  }

  close() {
    this.setState({
      open: false
    });
  }

  render() {
    
    let position = this.state.position;
    let popover = null;

    if (this.state.open) {
      let height = window.innerHeight - position.y;
      popover = (
        <Popover fixed={true} position={position} onExternalClick={this.close.bind(this)}>
          <div>gggggggggg</div>
        </Popover>
      )
    }

    return (
      <div className={styles.apps}>
        <div className={styles.currentApp} onClick={this.toggle.bind(this)}>
          {this.context.currentApp.name}
        </div>
        {popover}
      </div>
    );
  }
}

AppsSelector.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp)
};