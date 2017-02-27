/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import Parse from 'parse';
import * as ColumnPreferences from 'lib/ColumnPreferences';
import * as browserUtils from 'lib/browserUtils';

import DataBrowserHeaderBar from 'components/DataBrowserHeaderBar/DataBrowserHeaderBar.react';
import Button from 'components/Button/Button.react';
import Icon from 'components/Icon/Icon.react';
import EmptyState from 'components/EmptyState/EmptyState.react';
import styles from 'dashboard/Data/Browser/Browser.scss';

export default class BrowserTable extends React.Component {

  constructor(props) {
    super();

    this.state = {
      offset: 0,
    }
  }

  render() {
console.log('5555555555555555555', this.props);
    let ordering = {};
    if (this.props.ordering) {
      if (this.props.ordering[0] === '-') {
        ordering = { col: this.props.ordering.substr(1), direction: 'descending'};
      } else {
        ordering = { col: this.props.ordering, direction: 'ascending'};
      }
    }

    let headers = this.props.order.map(({name, width}, i) => (
      {
        width: width,
        name: name,
        type: this.props.columns[name].type,
        targetClass: this.props.columns[name].targetClass,
        order: ordering.col === name ? ordering.direction : null
      }
    ));

    let editor = null;
    let table = <div ref="table" />;
    if (this.props.data) {
      let rowWidth = 210;
      for (let i = 0; i < this.props.order.length; i++) {
        rowWidth += this.props.order[i].width;
      }
      
      let newRow = null;
      
      

    }

    return (
      <div className={[styles.browser, browserUtils.isSafari() ? styles.safari : ''].join(' ')}>
        {table}
        <DataBrowserHeaderBar
          headers={headers}
          updateOrdering={this.props.updateOrdering}
          readonly={!!this.props.relation}
        />

      </div>
    );
  }
}