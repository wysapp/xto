
import { ActionTypes } from 'lib/stores/SchemaStore';

import CategoryList from 'components/CategoryList/CategoryList.react';
import CreateClassDialog from 'dashboard/Data/Browser/CreateClassDialog.react';

import DashboardView from 'dashboard/DashboardView.react';
import DataBrowser from 'dashboard/Data/Browser/DataBrowser.react';

import { DefaultColumns, SpecialClasses } from 'lib/Constants';

import history from 'dashboard/history';
import { List, Map } from 'immutable';
import Notification from 'dashboard/Data/Browser/Notification.react';
import Parse from 'parse';

import prettyNumber from 'lib/prettyNumber';
import queryFromFilters from 'lib/queryFromFilters';

import React from 'react';

import SidebarAction from 'components/Sidebar/SidebarAction';
import stringCompare from 'lib/stringCompare';
import styles from 'dashboard/Data/Browser/Browser.scss';

import subscribeTo from 'lib/subscribeTo';
import * as ColumnPreferences from 'lib/ColumnPreferences';


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
      clp: {},
      filters: new List(),
      ordering: '-createdAt',
      selection: {},

      data: null,
      lastMax: -1,
      newObject: null,

      lastError: null,
      relationCount: 0
    };

    this.prefetchData = this.prefetchData.bind(this);
    this.fetchData = this.fetchData.bind(this);

    this.selectRow = this.selectRow.bind(this);

    this.addRow = this.addRow.bind(this);
    this.showCreateClass = this.showCreateClass.bind(this);
    this.refresh = this.refresh.bind(this);
    this.createClass = this.createClass.bind(this);


  }

  componentWillMount() {

    this.props.schema.dispatch(ActionTypes.FETCH)
    .then(() => this.handleFetchedSchema());
    if (!this.props.params.className && this.props.schema.data.get('classes')) {
      this.redirectToFirstClass(this.props.schema.data.get('classes'));
    } else if (this.props.params.className) {
      this.prefetchData(this.props, this.context);
    }
  }


  componentWillReceiveProps(nextProps, nextContext) {
    if (this.context !== nextContext) {
      if (this.props.params.appId !== nextProps.params.appId || !this.props.params.className) {
        this.setState({ counts: {} });
        Parse.Object._clearAllState();
      }
      this.prefetchData(nextProps, nextContext);
      nextProps.schema.dispatch(ActionTypes.FETCH)
      .then(() => this.handleFetchedSchema());
    }
    if (!nextProps.params.className && nextProps.schema.data.get('classes')) {
      this.redirectToFirstClass(nextProps.schema.data.get('classes'));
    }
  }


  async prefetchData(props, context) {
    const filters = this.extractFiltersFromQuery(props);
    const { className, entityId, relationName } = props.params;
    const isRelationRoute = entityId && relationName;
    let relation = this.state.relation;
    if (isRelationRoute && !relation) {
      const parentObjectQuery = new Parse.Query(className);
      const parent = await parentObjectQuery.get(entityId, {useMasterKey: true});
      relation = parent.relation(relationName);
    }

    await this.setState({
      data: null,
      newObject: null,
      lastMax: -1,
      ordering: ColumnPreferences.getColumnSort(
        false,
        context.currentApp.applicationId,
        className,
      ),
      selection: {},
      relation: isRelationRoute ? relation : null,
    });

    if ( isRelationRoute) {
      this.fetchRelation(relation, filters);
    } else if (className) {
      this.fetchData(className, filters);
    }
  }

  extractFiltersFromQuery(props) {
    let filters = new List();

    const query = props.location && props.location.query;
    if (query && query.filters) {
      const queryFilters = JSON.parse(query.filters);
      queryFilters.forEach((filter) => filters = filters.push(new Map(filter)));
    }
    return filters;
  }


  redirectToFirstClass(classList) {
    if (!classList.isEmpty()) {
      let classes = Object.keys(classList.toObject());
      classes.sort((a, b) => {
        if (a[0] === '_' && b[0] !== '_') {
          return -1;
        }
        if (b[0] === '_' && a[0] !== '_') {
          return 1;
        }
        return a.toUpperCase() < b.toUpperCase() ? -1 : 1;
      });
      history.replace(this.context.generatePath('browser/' + classes[0]));
    }
  }


  showCreateClass() {
    if (!this.props.schema.data.get('classes')) {
      return;
    }
    this.setState({showCreateClassDialog: true});
  }


  createClass(className) {
    
    this.props.schema.dispatch(ActionTypes.CREATE_CLASS, {className}).then(() => {
      this.state.counts[className] = 0;
      history.push(this.context.generatePath('browser/' + className));
    }).always(() => {
      this.setState({ showCreateClassDialog : false });
    });
  }


  addRow() {
    if (!this.state.newObject) {
      const relation = this.state.relation;
      this.setState({
        newObject: (relation ?
          new Parse.Object(relaton.targetClassName) :
          new Parse.Object(this.props.schema.className)
        )
      });

    }
  }


  handleFetchedSchema() {
    this.props.schema.data.get('classes').forEach((_, className) => {
      this.context.currentApp.getClassCount(className)
      .then(count => this.setState({ counts: {[className]: count, ...this.state.counts}}));
    })
    this.setState({clp: this.props.schema.data.get('CLPs').toJS()});
  }


  async refresh() {
    const relation = this.state.relation;
    const prevFilters = this.state.filters || new List();
    const initialState =  {
      data: null,
      newObject: null,
      lastMax: -1,
      selection: {},
    };

    if (relation) {
      await this.setState(initialState);
      await this.setRelation(relation, prevFilters);
    } else {
      await this.setState({
        ...initialState,
        relation: null,
      });
      await this.fetchData(this.props.params.className, prevFilters);
    }
  }

  async fetchParseData(source, filters) {
    const query = queryFromFilters(source, filters);
    if (this.state.ordering[0] === '-') {
      query.descending(this.state.ordering.substr(1));
    } else {
      query.ascending(this.state.ordering);
    }

    query.addDescending('createdAt');
    query.limit(200);
    const data = await query.find({ useMasterKey: true });
    return data;
  }


  async fetchData(source, filters = new List(), last) {
    const data = await this.fetchParseData(source, filters);
    this.setState({ data: data, filters, lastMax: 200});
  }


  updateFilters(filters) {
    const relation = this.state.relation;
    if ( relation ) {
      this.setRelation(relation, filters);
    } else {
      const source = this.props.params.className;
      const _filters = JSON.stringify(filters.toJSON());
      const url = `browser/${source}${(filters.size === 0 ? '' : `?filters=${(encodeURIComponent(_filters))}`)}`;

      history.push(this.context.generatePath(url));
    }
  }


  selectRow(id, checked) {
    this.setState(({ selection }) => {
      if ( id ==='*') {
        return { selection : checked ? {'*':true} : {}};
      }

      if ( checked ) {
        selection[id] = true;
      } else {
        delete selection[id];
      }
      return { selection };
    });
  }


  hasExtras() {
    return !!(
      this.state.showCreateClassDialog ||
      this.state.showAddColumnDialog ||
      this.state.showRemoveColumnDialog ||
      this.state.showDropClassDialog ||
      this.state.showExportDialog ||
      this.state.rowsToDelete ||
      this.state.showAttachRowsDialog ||
      this.state.showAttachSelectedRowsDialog
    );
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
        special.push({ name: SpecialClasses[key], id: key, count: count });
      } else {
        categories.push({ name: key, count: count });
      }
    });
    special.sort((a, b) => stringCompare(a.name, b.name));
    categories.sort((a, b) => stringCompare(a.name, b.name));
    return (
      <CategoryList
        current={current}
        linkPrefix={'browser/'}
        categories={special.concat(categories)} />
    );
  }

  renderContent() {
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
              title='You have no classes yet'
              description={'This is where you can view and edit your app\u2019s data'}
              icon='files-solid'
              cta='Create your first class'
              action={this.showCreateClass} />
          </div>
        );
      } else if (className && classes.get(className)) {
        let schema = {};
        classes.get(className).forEach(({ type, targetClass }, col) => {
          schema[col] = {
            type,
            targetClass,
          };
        });

        let columns = {
          objectId: { type: 'String' }
        };
        let userPointers = [];
        classes.get(className).forEach((field, name) => {
          if (name === 'objectId') {
            return;
          }
          let info = { type: field.type };
          if (field.targetClass) {
            info.targetClass = field.targetClass;
            if (field.targetClass === '_User') {
              userPointers.push(name);
            }
          }
          columns[name] = info;
        });

        browser = (
          <DataBrowser
            count={this.state.relation ? this.state.relationCount : this.state.counts[className]}
            perms={this.state.clp[className]}
            schema={schema}
            userPointers={userPointers}
            filters={this.state.filters}
            onFilterChange={this.updateFilters}
            onRemoveColumn={this.showRemoveColumn}
            onDeleteRows={this.showDeleteRows}
            onDropClass={this.showDropClass}
            onExport={this.showExport}
            onChangeCLP={this.handleCLPChange}
            onRefresh={this.refresh}
            onAttachRows={this.showAttachRowsDialog}
            onAttachSelectedRows={this.showAttachSelectedRowsDialog}

            columns={columns}
            className={className}
            fetchNextPage={this.fetchNextPage}
            maxFetched={this.state.lastMax}
            selectRow={this.selectRow}
            selection={this.state.selection}
            data={this.state.data}
            ordering={this.state.ordering}
            newObject={this.state.newObject}
            relation={this.state.relation}
            disableKeyControls={this.hasExtras()}
            updateRow={this.updateRow}
            updateOrdering={this.updateOrdering}
            onPointerClick={this.handlePointerClick}
            setRelation={this.setRelation}
            onAddColumn={this.showAddColumn}
            onAddRow={this.addRow}
            onAddClass={this.showCreateClass} />
        );
      }
    }
    let extras = null;
    if (this.state.showCreateClassDialog) {
      extras = (
        <CreateClassDialog
          currentClasses={this.props.schema.data.get('classes').keySeq().toArray()}
          onCancel={() => this.setState({ showCreateClassDialog: false })}
          onConfirm={this.createClass} />
      );
    } else if (this.state.showAddColumnDialog) {
      let currentColumns = [];
      classes.get(className).forEach((field, name) => {
        currentColumns.push(name);
      });
      extras = (
        <AddColumnDialog
          currentColumns={currentColumns}
          classes={this.props.schema.data.get('classes').keySeq().toArray()}
          onCancel={() => this.setState({ showAddColumnDialog: false })}
          onConfirm={this.addColumn} />
      );
    } else if (this.state.showRemoveColumnDialog) {
      let currentColumns = this.getClassColumns(className).map(column => column.name);
      extras = (
        <RemoveColumnDialog
          currentColumns={currentColumns}
          onCancel={() => this.setState({ showRemoveColumnDialog: false })}
          onConfirm={this.removeColumn} />
      );
    } else if (this.state.rowsToDelete) {
      extras = (
        <DeleteRowsDialog
          className={SpecialClasses[className] || className}
          selection={this.state.rowsToDelete}
          relation={this.state.relation}
          onCancel={() => this.setState({ rowsToDelete: null })}
          onConfirm={() => this.deleteRows(this.state.rowsToDelete)} />
      );
    } else if (this.state.showDropClassDialog) {
      extras = (
        <DropClassDialog
          className={className}
          onCancel={() => this.setState({
            showDropClassDialog: false,
            lastError: null,
          })}
          onConfirm={() => this.dropClass(className)} />
      );
    } else if (this.state.showExportDialog) {
      extras = (
        <ExportDialog
          className={className}
          onCancel={() => this.setState({ showExportDialog: false })}
          onConfirm={() => this.exportClass(className)} />
      );
    } else if (this.state.showAttachRowsDialog) {
      extras = (
        <AttachRowsDialog
          relation={this.state.relation}
          onCancel={this.cancelAttachRows}
          onConfirm={this.confirmAttachRows}
        />
      )
    } else if (this.state.showAttachSelectedRowsDialog) {
      extras = (
        <AttachSelectedRowsDialog
          classes={this.props.schema.data.get('classes').keySeq().toArray()}
          onSelectClass={this.getClassRelationColumns}
          selection={this.state.selection}
          onCancel={this.cancelAttachSelectedRows}
          onConfirm={this.confirmAttachSelectedRows}
        />
      );
    }
    return (
      <div>
        {browser}
        <Notification note={this.state.lastError} />
        {extras}
      </div>
    );
  }
  

}