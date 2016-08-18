import DateTimePicker from 'components/DateTimePicker/DateTimePicker.react';
import { MONTHS } from 'lib/DateUtils';
import Popover from 'components/Popover/Popover.react';
import Position from 'lib/Position';
import React from 'react';
import ReactDOM from 'react-dom';


export default class DateTimeEntry extends React.Component {

  constructor(props) {
    super(props);
    
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

  render(){
    let popover = null;
    if ( this.state.open) {
      popover = (
        <Popover fixed={true} position={this.state.position} onExternalClick={this.close.bind(this)}>
          <DateTimePicker
            value={this.props.value}
            width={Math.max(this.node.clientWidth, 240)}
            onChange={this.props.onChange}
            close={() => this.setState({open: false})} />
        </Popover>
      );
    }

    return (
      <div className={this.props.className} onClick={this.toggle.bind(this)}>
        <input 
          type='text'
          value={this.state.value}
          onChange={this.inputDate.bind(this)}
          onBlur={this.commitDate.bind(this)} />
        {popover}
      </div>
    );
  }

}