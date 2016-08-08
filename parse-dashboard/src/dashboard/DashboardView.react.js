
import ParseApp from 'lib/ParseApp';
import React from 'react';
import Sidebar from 'components/Sidebar/Sidebar.react';
import SidebarToggle from 'components/Sidebar/SidebarToggle.react';
import styles from 'dashboard/Dashboard.scss';

export default class DashboardView extends React.Component {

  render() {

    let sidebarChildren = null;

    if (typeof this.renderSidebar === 'function') {
      sidebarChildren = this.renderSidebar();
    }

    let appSlug = (this.context.currentApp ? this.context.currentApp.slug : '');

    if (!this.context.currentApp.hasCheckedForMigraton) {
      this.context.currentApp.getMigrations().promise.then(() => this.forceUpdate());
    }

    let features = this.context.currentApp.serverInfo.features;

    let coreSubsections = [];
    if (features.schemas &&
        features.schemas.addField &&
        features.schemas.removeField &&
        features.schemas.addClass &&
        features.schemas.removeClass) {
          coreSubsections.push({
            name: 'Browser',
            link: '/browser'
          });
        }
    
    if (features.cloudCode && features.cloudCode.viewCode) {
      coreSubsections.push({
        name: 'Cloud Code',
        link: '/cloud_code'
      });
    }

    if (features.logs && Object.keys(features.logs).some(key => features.logs[key])) {
      coreSubsections.push({
        name: 'Logs',
        link: '/logs'
      });
    }

    if (features.globalConfig &&
        features.globalConfig.create &&
        features.globalConfig.read &&
        features.globalConfig.update &&
        features.globalConfig.delete) {
          coreSubsections.push({
            name: 'Config',
            link: '/config'
          });
        }
    
    coreSubsections.push({
      name: 'API Console',
      link: '/api_console'
    });

    if (this.context.currentApp.migration) {
      coreSubsections.push({
        name: 'Migration',
        link: '/migration',
      });
    }

    let pushSubsections = [];
    if (features.push && features.push.immediatePush) {
      pushSubsections.push({
        name: 'Send New Push',
        link: '/push/new'
      });
    }

    if (features.push && features.push.storedPushData) {
      pushSubsections.push({
        name: 'Past Pushes',
        link: '/push/activity'
      });
    }

    if (features.push && features.push.pushAudiences) {
      pushSubsections.push({
        name: 'Audiences',
        link: '/push/audiences'
      })
    }

    let analyticsSidebarSections = [];

    let settingsSections = [];

    let appSidebarSections = [];

    if (coreSubsections.length > 0) {
      appSidebarSections.push({
        name: 'Core',
        icon: 'core',
        link: '/browser',
        subsections: coreSubsections,
      });
    }

    if (pushSubsections.length > 0) {
      appSidebarSections.push({
        name: 'Push',
        icon: 'push-outline',
        link: '/push',
        style: {paddingLeft: '16px'},
        subsections: pushSubsections,
      });
    }

    if (analyticsSidebarSections.length > 0 ) {
      appSidebarSections.push({
        name: 'Analytics',
        icon: 'analytics-outline',
        link: '/analytics',
        subsections: analyticsSidebarSections,
      });
    }

    if (settingsSections.length > 0) {
      appSidebarSections.push({
        name: 'App Settings',
        icon: 'gear-solid',
        link: '/settings',
        subsections: settingsSections,
      });
    }

    let sidebar = (
      <Sidebar
        sections={appSidebarSections}
        appSelector={true}
        section={this.section}
        subsection={this.subsection}
        prefix={'/apps/' + appSlug}
        action={this.action}>
        {sidebarChildren}
      </Sidebar>
    );

    return (
      <div className={styles.dashboard}>
        <div className={styles.content}>
          {this.renderContent()}
        </div>
        {sidebar}
        <SidebarToggle />
      </div>
    );

  }
}

DashboardView.contextTypes = {
  generatePath: React.PropTypes.func,
  currentApp: React.PropTypes.instanceOf(ParseApp)
};