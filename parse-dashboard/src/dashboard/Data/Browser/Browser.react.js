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

import history from 'dashboard/history';
import { List, Map } from 'immutable';
import Parse from 'parse';
import CreateClassDialog from 'dashboard/Data/Browser/CreateClassDialog.react';
import CategoryList from 'components/CategoryList/CategoryList.react';
import EmptyState from 'components/EmptyState/EmptyState.react';

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

    this.state = {
      showCreateClassDialog: false,
      showAddColumnDialog: false,
      showRemoveColumnDialog: false,
      showDropClassDialog: false,
      showExportDialog: false,
      showAttachRowsDialog: false,
      rowsToDelete: null,

      relation: null,
      counts: {},
      filteredCounts: {},
      clp: {},
      filters: new List(),
      ordering: '-createdAt',
      selection: {},

      data: null,
      lastMax: -1,
      newObject: null,

      lastError: null,
      relationCount: 0,
    };

    this.showCreateClass = this.showCreateClass.bind(this);
    
  }

  componentWillMount() {
    this.props.schema.dispatch(ActionTypes.FETCH)
      .then(()=> this.handleFetchedSchema());

    if (!this.props.params.className && this.props.schema.data.get('classes')) {
      this.redirectToFirstClass(this.props.schema.data.get('classes'));
    } else if (this.props.params.className) {
      this.prefetchData(this.props, this.context);
    }
  }

  showCreateClass() {
    if (!this.props.schema.data.get('classes')) {
      return;
    }
    this.setState({showCreateClassDialog: true});
  }


  handleFetchedSchema() {
    this.props.schema.data.get('classes').forEach((_, className) => {
      this.context.currentApp.getClassCount(className)
        .then(count => this.setState({counts: {[className]: count, ...this.state.counts}}));
    })
    this.setState({clp: this.props.schema.data.get('CLPs').toJS()});
  }

  renderSidebar() {
    let current = this.props.params.className || '';
    let classes = this.props.schema.data.get('classes');

    if (!classes) {
      return null;
    }

    let special = [];
    let categories = [];
    classes.forEach((value, key) => {
      let count = this.state.counts[key];
      if (count === undefined) {
        count = '';
      } else if (count >= 1000) {
        count = prettyNumber(count);
      }

      if (SpecialClasses[key]) {
        special.push({name: SpecialClasses[key], id: key, count: count});
      } else {
        categories.push({name: key, count: count});
      }
    });
    special.sort((a, b) => stringCompare(a.name, b.name));
    categories.sort((a, b) => stringCompare(a.name, b.name));

    return (
      <CategoryList 
        current={current}
        linkPrefix={'browser/'}
        categories={special.concat(categories)}
      />
    );
  }

  renderContent() {
    console.log('33333333333333333333-Browser-Props', this.props);
    let browser = null;
    let className = this.props.params.className;

    if (this.state.relation) {
      className = this.state.relation.targetClassName;
    }

    let classes = this.props.schema.data.get('classes');

    if (classes) {
      if (classes.size === 0) {
        browser = (
          <div className={styles.empty}>
            <EmptyState 
              title="You have no classes yet"
              description={'This is where you can view and edit your app\u2019s data'}
              icon="files-solid"
              cta="Create your first class"
              action={this.showCreateClass}
            />
          </div>
        );
      }
    }

    let extras = null;
    if (this.state.showCreateClassDialog) {
      
      extras = (
        <CreateClassDialog 
          currentClasses={this.props.schema.data.get('classes').keySeq().toArray()}
          onCancel={() => this.setState({showCreateClassDialog: false})}
          onConfirm={this.createClass}
        />
      );
    }

    return (
      <div>
        {browser}
        {extras}
      </div>
    )
  }

}