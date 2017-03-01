/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import Button from 'components/Button/Button.react';
import Calendar from 'components/Calendar/Calendar.react';
import PropTypes from 'lib/PropTypes';
import { Directions } from 'lib/Constants';
import { MONTHS, hoursFrom, getDateMethod} from 'lib/DateUtils';
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

  changeHours(e) {

  }


  changeMinutes(e) {

  }

  commitTime() {

  }


  render() {

    return (
      <div style={{width: this.props.width}} className={styles.picker}>
        <Calendar 
          local={this.props.local}
          value={this.props.value}
          onChange={(newValue) => {

          }}
        />
        <div className={styles.time}>
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
