/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import { ActionTypes } from 'lib/stores/SchemaStore';
import DashboardView from 'dashboard/DashboardView.react';

import SidebarAction from 'components/Sidebar/SidebarAction';

import styles from 'dashboard/Data/Browser/Browser.scss';

import subscribeTo from 'lib/subscribeTo';

@subscribeTo('Schema', 'schema')
export default class Browser extends DashboardView {

  constructor() {
    super();

    this.section = 'Core';
    this.subsection = 'Browser';
    this.action = new SidebarAction('Create a class', this.showCreateClass.bind(this));
    
  }

  componentWillMount() {
    this.props.schema.dispatch(ActionTypes.FETCH);
  }

  showCreateClass() {

  }

  renderContent() {
    let browser = '444444444444444444444444444444444';
    console.log('33333333333333333333-Browser-props', this.props);

    return (
      <div>
        {browser}
      </div>
    )
  }

}