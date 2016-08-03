
import Parse from 'parse';
import ParseApp from 'lib/ParseApp';
import React from 'react';

import { center } from 'stylesheets/base.scss';
import { get } from 'lib/AJAX';
import { setBasePath } from 'lib/AJAX';

import {
  Router,
  Route,
  Redirect
} from 'react-router';

import { AsyncStatus } from 'lib/Constants';


const PARSE_DOT_COM_SERVER_INFO = {
  features: {
    schemas: {
      addField: true,
      removeField: true,
      addClass: true,
      removeClass: true,
      clearAllDataFromClass: false, //This still goes through ruby
      exportClass: false, //Still goes through ruby
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
  parseServerVersion: 'Parse.com',
}

class Dashboard extends React.Component {
  constructor(props) {
    super();
    this.state = {
      configLoadingError: '',
      configLoadingState: AsyncStatus.PROGRESS,
      newFeaturesInLatestVersion: [],
    };

    setBasePath(props.path);
  }


  componentDidMount() {
    get('/parse-dashboard-config.json').then(({apps, newFeaturesInLatestVersion = []}) => {
      this.setState({newFeaturesInLatestVersion});
      let appInfoPromises = apps.map(app => {

        if ( app.serverURL.startsWith('https://api.parse.com/1')) {
          app.serverInfo = PARSE_DOT_COM_SERVER_INFO;
          return Parse.Promise.as(app);
        } else {
          app.serverInfo = {};
          return new ParseApp(app).apiRequest(
            'GET',
            'serverInfo',
            {},
            {useMasterKey: true}
          ).then(serverInfo => {
            app.serverInfo = serverInfo;
            return app;
          }, error => {
            if ( error.code === 100) {
              app.serverInfo = {
                error: 'unable to connect to server',
                enabledFeatures: {},
                parseServerVersion: "unknown"
              }
              return Parse.Promise.as(app);
            } else if(error.code === 107) {
              app.serverInfo = {
                error: 'server version too low',
                enabledFeatures: {},
                parseServerVersion: "unknown"
              }
              return Parse.Promise.as(app);
            } else {
              app.serverInfo = {
                error: error.message || 'unknown error',
                enabledFeatures: {},
                parseServerVersion: "unknown"
              }
              return Parse.Promise.as(app);
            }
          });
        }
      });

      return Parse.Promise.when(appInfoPromises);
    }).then(function() {
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
    return <div>asdfasdfasdfasdfsadf</div>
  }
}


module.exports = Dashboard;