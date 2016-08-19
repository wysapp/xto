

import {
  getMonth,
  prevMonth,
  nextMonth,
  daysInMonth,
  WEEKDAYS,
  getDateMethod,
} from 'lib/DateUtils';
import PropTypes from 'lib/PropTypes';
import React from 'react';
import styles from 'components/Calendar/Calendar.scss';

export default class Calendar extends React.Component {
  constructor(props) {
    super();

    let now = props.value || new Date();
    this.state = {
      currentMonth: new Date(now[getDateMethod(props.local, 'getFullYear')](), now[getDateMethod(props.local, 'getMonth')](), 1)
    };
  }

  handlePrev() {

  }

  handleNext() {
    
  }

  renderMonth() {
    return (
      <div className={styles.month}>
        <a href='javascript:;' role='button' onClick={this.handlePrev.bind(this)} />
        <a href='javascript:;' role='button' onClick={this.handleNext.bind(this)} />
        <div>{getMonth(this.state.currentMonth[getDateMethod(this.props.local, 'getMonth')]()) + ' ' + this.state.currentMonth[getDateMethod(this.props.local, 'getFullYear')]()}</div>
      </div>
    );
  }

  renderWeekdays() {
    return (
      <div className={styles.weekdays}>
        {WEEKDAYS.map((w) => <span key={w}>{w.substr(0, 2)}</span>)}
      </div>
    );
  }

  renderDays() {

    return <div></div>;
  }

  render() {
    return (
      <div className={styles.calendar}>
        {this.renderMonth()}
        {this.renderWeekdays()}
        {this.renderDays()}
      </div>
    );
  }
}

Calendar.propTypes = {
  value: PropTypes.instanceOf(Date).describe(
    'The currently selected date'
  ),
  onChange: PropTypes.func.isRequired.describe(
    'A callback fired when a new date is selected. It receives a Date object as its only parameter.'
  ),
  shadeBefore: PropTypes.bool.describe(
    'Whether to shade the dates before the current selection'
  ),
  shadeAfter: PropTypes.bool.describe(
    'Whether to shade the dates after the current selection'
  ),
}