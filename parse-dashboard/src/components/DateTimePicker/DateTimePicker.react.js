

import Button from 'components/Button/Button.react';
import Calendar from 'components/Calendar/Calendar.react';
import { Directions } from 'lib/Constants';
import { MONTHS, hoursFrom, getDateMethod } from 'lib/DateUtils';
import PropTypes from 'lib/PropTypes';
import React from 'react';
import ReactDOM from 'react-dom';
import styles from 'components/DateTimePicker/DateTimePicker.scss';


export default class DateTimePicker extends React.Component {

  constructor(props) {
    super();

    let timeRef = props.value || hoursFrom(new Date(), 1);

    this.state = {
      hours: String(timeRef[getDateMethod(props.local, 'getHours')]()),
      minutes: (timeRef[getDateMethod(props.local, 'getMinutes')]() < 10 ? '0' : '') + String(timeRef[getDateMethod(props.local, 'getMinutes')]()),
    }
  }

  render() {
    return (
      <div style={{width: this.props.width }} className={styles.picker}>
        <Calendar local={this.props.local} value={this.props.value} onChange={(newValue) => {
          let timeRef = this.props.value || hoursFrom(new Date(), 1);
          let newDate = this.props.local ? new Date(
            newValue.getFullYear(),
            newValue.getMonth(),
            newValue.getDate(),
            timeRef.getHours(),
            timeRef.getMinutes()
          ) :
          new Date(Date.UTC(
            newValue.getUTCFullYear(),
            newValue.getUTCMonth(),
            newValue.getUTCDate(),
            timeRef.getUTCHours(),
            timeRef.getUTCMinutes()
          ));
          this.props.onChange(newDate);
        }} />
        <div className={styles.time} >
          <div style={{float: 'left'}}>
            <input type='text' value={this.state.hours} onChange={this.changeHours.bind(this)} />
            <span> : </span>
            <input type='text' value={this.state.minutes} onChange={this.changeMinutes.bind(this)} />
          </div>
          <Button value='Set time' onClick={this.commitTime.bind(this)} primary={true} />
        </div>
      </div>
    );
  }
}


DateTimePicker.propTypes = {
  value: PropTypes.instanceOf(Date).describe(
    'The current date of the picker.'
  ),
  width: PropTypes.number.isRequired.describe(
    'The width of the calendar.'
  ),
  onChange: PropTypes.func.isRequired.describe(
    'A function to call when a new date is selected.'
  ),
  close: PropTypes.func.describe(
    'An optional function to call to close the calendar.'
  ),
  local: PropTypes.bool.describe(
    'An option flag to set when using a local DateTimeInput.'
  ),
};

