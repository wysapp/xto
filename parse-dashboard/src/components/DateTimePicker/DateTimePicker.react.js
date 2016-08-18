

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
  }
}