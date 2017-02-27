/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ParseApp from 'lib/ParseApp';
import BrowserTable from 'dashboard/Data/Browser/BrowserTable.react';
import * as ColumnPreferences from 'lib/ColumnPreferences';
import {SpecialClasses} from 'lib/Constants';




/**
 * DataBrowser renders the browser toolbar and data table
 * It also manages the fetching / updating of column size prefs,
 * and the keyboard interactions for the data table.
 */
export default class DataBrowser extends React.Component {
  constructor(props, context) {
    super(props, context);

    let order = ColumnPreferences.getOrder(
      props.columns,
      context.currentApp.applicationId,
      props.className
    );

    this.state = {
      order: order,
      current: null,
      editing: false,
    }

    this.handleKey = this.handleKey.bind(this);

    this.saveOrderTimeout = null;
  }

  componentDidMount() {
    document.body.addEventListener('keydown', this.handleKey);
  }

  componentWillMount() {
    document.body.removeEventListener('keydown', this.handleKey);
  }

  handleKey(e) {

  }

  render() {
console.log('4444444444444444444', this.props);
    let { className, ...other } = this.props;

    return (
      <div>
        <BrowserTable
          order={this.state.order}
          current={this.state.current}
          editing={this.state.editing}
          className={className}
          
          {...other}
        />
      </div>
    )
  }
}


DataBrowser.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp)
};