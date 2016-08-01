// import AppsManager from 'lib/AppsManager';
import Immutable from 'immutable';
import installDevTools from 'immutable-devtools';
import Parse from 'parse';
import React from 'react';
import ReactDom from 'react-dom';
import Dashboard from './Dashboard';
import 'babel-polyfill';

require('stylesheets/fonts.scss');
installDevTools(Immutable);

var path = window.PARSE_DASHBOARD_PATH || '/';
ReactDom.render(<Dashboard path={path}/>, document.getElementById('browser_mount'));