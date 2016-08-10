

import BrowserCell from 'components/BrowserCell/BrowserCell.react';

import * as ColumnPreferences from 'lib/ColumnPreferences';

import Icon from 'components/Icon/Icon.react';
import Parse from 'parse';
import React from 'react';
import styles from 'dashboard/Data/Browser/Browser.scss';
import Button from 'components/Button/Button.react';


const MAX_ROWS = 60;
const ROW_HEIGHT = 31;

const READ_ONLY = ['objectId', 'createdAt', 'updatedAt'];

let scrolling = false;

export default class BrowserTable extends React.Component {

  constructor(props) {
    super();

    this.state = {
      offset: 0,
    }

    this.handleScroll = this.handleScroll.bind(this);
  }


  render() {
    
  }
}