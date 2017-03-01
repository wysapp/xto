/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import Position from 'lib/Position';
import Popover from 'components/Popover/Popover.react';

import DateTimePicker from 'components/DateTimePicker/DateTimePicker.react';


export default class DateTimeEntry extends React.Component {
  constructor(props) {
    super();

    this.state = {
      open: false,
      position: null,
      value: props.value.toISOString ? props.value.toISOString() : props.value
    }
  }

  componentWillReceiveProps(props) {
    this.setState({
      value: props.value.toISOString ? props.value.toISOString() : props.value
    });
  }

  componentDidMount() {
    this.node = ReactDOM.findDOMNode(this);
  }

  toggle() {
    
    this.setState((state) => {
      if(this.state.open) {
        return {open: false};
      }
      let pos = Position.inDocument(this.node);
      pos.y += this.node.clientHeight;
      let height = 230 + this.node.clientWidth * 0.14;
      if (window.innerHeight - pos.y - height < 40) {
        pos.y = window.innerHeight - height - 40;
      }

      return {
        open: true,
        position: pos
      };
    });
  }

  close() {
    this.setState({open: false});
  }

  inputDate() {

  }

  commitDate() {

  }

  render() {
    let popover = null;
    if (this.state.open) {
      popover = (
        <Popover fixed={true} position={this.state.position} onExternalClick={this.close.bind(this)}>
          <DateTimePicker 
            value={this.props.value}
            width={Math.max(this.node.clientWidth, 240)}
            onChange={this.props.onChange}
            close={() => this.setState({open:false})}
          />
        </Popover>
      )
    }

    return (
      <div className={this.props.className} onClick={this.toggle.bind(this)}>
        <input 
          type="text"
          value={this.state.value}
          onChange={this.inputDate.bind(this)}
          onBlur={this.commitDate.bind(this)}
        />
        {popover}
      </div>
    );
  }
}