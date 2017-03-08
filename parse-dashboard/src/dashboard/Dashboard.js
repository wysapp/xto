/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import Parse from 'parse';
import {Router, Route, Redirect, useRouterHistory} from 'react-router';

import history from 'dashboard/history';
import AppData from './AppData.react';
import AccountView from './AccountView.react';

import AppsIndex from './Apps/AppsIndex.react';

import Loader from 'components/Loader/Loader.react';
import Icon from 'components/Icon/Icon.react';

import Browser from './Data/Browser/Browser.react';

import AppsManager from 'lib/AppsManager';
import ParseApp from 'lib/ParseApp';
import {setBasePath} from 'lib/AJAX';
import {get} from 'lib/AJAX';
import {AsyncStatus} from 'lib/Constants';

import styles from 'dashboard/Apps/AppsIndex.scss';
import { center } from 'stylesheets/base.scss';

let App = React.createClass({
  render(){
    return this.props.children;
  }
});


let Empty = React.createClass({
  render() {
    return <div>Not yet implemented</div>
  }
});

const PARSE_DOT_COM_SERVER_INFO = {
  features: {
    schemas: {
      addField: true,
      removeField: true,
      addClass: true,
      removeClass: true,
      clearAllDataFromClass: false,
      exportClass: false,
    },
    cloudCode: {
      viewCode: true,
    },
    hooks: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
    logs: {
      info: true,
      error: true,
    },
    globalConfig: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
  },
  parseServerVersion: 'Parse.com'
}

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      configLoadingError: '',
      configLoadingState: AsyncStatus.PROGRESS,
      newFeaturesInLatestVersion: []
    };

    setBasePath(props.path);
  }

  componentDidMount() {
    get('/parse-dashboard-config.json').then(({apps, newFeaturesInLatestVersion = []}) => {
      this.setState({newFeaturesInLatestVersion});
      let appInfoPromises = apps.map(app => {
        if (app.serverURL.startsWith('https://api.parse.com/1')) {
          app.serverInfo = PARSE_DOT_COM_SERVER_INFO;

          return Parse.Promise.as(app);
        } else {
          app.serverInfo = {};
          
          return new ParseApp(app).apiRequest(
            'GET',
            'serverInfo',
            {},
            { useMasterKey: true }
          ).then(serverInfo => {            
            app.serverInfo = serverInfo;
            return app;
          }, error => {
            if (error.code === 100) {
              app.serverInfo = {
                error: 'unable to connect to server',
                enabledFeatures: {},
                parseServerVersion: "unknown"
              }
              return Parse.Promise.as(app);
            } else if (error.code === 107) {
              app.serverInfo = {
                error: 'server version too low',
                enabledFeatures: {},
                parseServerVersion: 'unknown'
              }
              return Parse.Promise.as(app);
            } else {
              app.serverInfo = {
                error: error.message || 'unknown error',
                enabledFeatures: {},
                parseServerVersion: 'unknown'
              }
              return Parse.Promise.as(app);
            }
          });
        }
      });

      return Parse.Promise.when(appInfoPromises);
    }).then(function(){
      Array.prototype.slice.call(arguments).forEach(app => {
        
        AppsManager.addApp(app);
      });
      this.setState({configLoadingState: AsyncStatus.SUCCESS});
    }.bind(this)).fail(({error}) => {
      
      this.setState({
        configLoadingError: error,
        configLoadingState: AsyncStatus.FAILED
      });
    });
  }

  render() {

    if (this.state.configLoadingState === AsyncStatus.PROGRESS) {
      return <div className={center}><Loader /></div>;
    }

    if (this.state.configLoadingError && this.state.configLoadingError.length > 0) {
      return <div className={styles.empty}>
          <div className={center}>
            <div className={styles.cloud}>
              <Icon width={110} height={110} name="cloud-surprise" fill="#1e3b4d" />
            </div>

            <div className={styles.loadingError}>
              {this.state.configLoadingError.replace(/-/g, '\u2011')}
            </div>
          </div>
        </div>;
    }

    const AppsIndexPage = () => (
      <AccountView section="Your Apps">
        <AppsIndex newFeaturesInLatestVersion={this.state.newFeaturesInLatestVersion} />
      </AccountView>
    );

    return <Router history={history}>
      <Redirect from="/" to="/apps" />
      <Route path="/" component={App}>
        <Route path="apps" component={AppsIndexPage} />

        <Redirect from="apps/:appId" to="/apps/:appId/browser" />
        <Route path="apps/:appId" component={AppData}>
          <Route path="getting_started" component={Empty} />
          <Route path="browser" component={false ? SchemaOverview : Browser} /> //In progress features. Change false to true to work on this feature.
          <Route path="browser/:className" component={Browser} />
          <Route path="browser/:className/:entityId/:relationName" component={Browser} />


        </Route>


      </Route>
    </Router>
  }
}

module.exports = Dashboard;