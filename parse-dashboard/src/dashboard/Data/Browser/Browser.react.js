

import DashboardView from 'dashboard/DashboardView.react';

import styles from 'dashboard/Data/Browser/Browser.scss';

import subscribeTo from 'lib/subscribeTo';

export default class Browser extends DashboardView {
  
  constructor() {
    super();

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