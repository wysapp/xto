
import { ActionTypes } from 'lib/stores/SchemaStore';

import DashboardView from 'dashboard/DashboardView.react';

import history from 'dashboard/history';
import { List, Map } from 'immutable';
import Parse from 'parse';

import prettyNumber from 'lib/prettyNumber';

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


    this.showCreateClass = this.showCreateClass.bind(this);

  }

  componentWillMount() {
    this.props.schema.dispatch(ActionTypes.FETCH);
  }


  showCreateClass() {
    if (!this.props.schema.data.get('classes')) {
      return;
    }
    this.setState({showCreateClassDialog: true});
  }

  renderSidebar() {
    let current = this.props.params.className || '';
    let classes = this.props.schema.data.get('classes');
    if (!classes) {
      return null;
    }

    let special = [];
    let categories = [];


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
              title='You have on classes yet'
              description={'This is where you can view and edit your app\u2019s data'}
              icon='files-solid'
              cta='Create your first class'
              action={this.showCreateClass} />
          </div>
        );
      }
    }
  }

  
}