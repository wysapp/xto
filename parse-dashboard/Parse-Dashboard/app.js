'use strict';

const express = require('express');
const basicAuth = require('basic-auth');
const path = require('path');
const packageJson = require('package-json');
var fs = require('fs');

const currentVersionFeatures = require('../package.json').parseDashboardFeatures;

var newFeaturesInLatestVersion = [];
packageJson('parse-dashboard', 'latest').then(latestPackage => {
  if (latestPackage.parseDashboardFeatures instanceof Array) {
    newFeaturesInLatestVersion = latestPackage.parseDashboardFeatures.filter(feature => {
      return currentVersionFeatures.indexOf(feature) === -1;
    });
  }
});


function getMount(req) {
  let url = req.url;
  let originalUrl = req.originalUrl;
  var mountPathLength = req.originalUrl.length - req.url.length;
  var mountPath = req.originalUrl.slice(0, mountPathLength);
  if ( !mountPath.endsWith('/')) {
    mountPath += '/';
  }
  return mountPath;
}


module.exports = function(config, allowInsecureHTTP) {
  var app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/parse-dashboard-config.json', function(req, res) {
    let response = {
      apps: config.apps,
      newFeaturesInLatestVersion: newFeaturesInLatestVersion,
    };

    const users = config.users;

    let auth = null;

    if ( users) {
      autho = basicAuth(req);
    }

    const requestIsLocal = 
      req.connection.remoteAddress === '127.0.0.1' ||
      req.connection.remoteAddress === '::ffff:127.0.0.1' ||
      req.connection.remoteAddress === '::1';
    
    if(!requestIsLocal && !req.secure && !allowInsecureHTTP) {
      return res.send({success: false, error: 'Parse Dashboard can only be remotely accessed via HTTPS'});
    }

    if (!requestIsLocal && !users) {
      //Accessing the dashboard over the internet can only be done with username and password
      return res.send({ success: false, error: 'Configure a user to access Parse Dashboard remotely' });
    }

    let appsUserHasAccess = null;

    const successfulAuth =
      auth &&
      users &&
        users.find(user => {
          let isAuthorized = user.user == auth.name && user.pass == auth.pass;
          if(isAuthorized) {
            appsUserHasAccess = user.apps;
          }
          return isAuthorized;
        });
    
    if (successfulAuth) {
      if (appsUserHasAccess) {
        response.apps = response.apps.filter(function(app) {
          return appsUserHasAccess.find(appUserHasAccess => {
            return app.appId == appUserHasAccess.appId;
          })
        });
      }

      return res.json(response);
    }

    if ( users || auth) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    }

    if (requestIsLocal) {
      return res.json(response);
    }

    res.send({success: false, error: 'Something went wrong.'});

  });


  if ( config.iconsFolder) {
    try {
      var stat = fs.statSync(config.iconsFolder);
      if ( stat.isDirectory()) {
        app.use('/appicons', express.static(config.iconsFolder));

        checkIfIconsExistForApps(config.apps, config.iconsFolder);
      }
    }catch(e) {
      console.warn("Iconsfolder at path: " + config.iconsFolder + " not found");
    }
  }

  // For every other request, go to index.html. Let client-side handle the rest.
  app.get('/*', function(req, res) {
    let mountPath = getMount(req);
    res.send(`<!DOCTYPE html>
      <head>
        <link rel="shortcut icon" type="image/x-icon" href="${mountPath}favicon.ico" />
        <base href="${mountPath}"/>
        <script>
          PARSE_DASHBOARD_PATH = "${mountPath}";
        </script>
      </head>
      <html>
        <title>Parse Dashboard</title>
        <body>
          <div id="browser_mount"></div>
          <script src="${mountPath}bundles/dashboard.bundle.js"></script>
        </body>
      </html>
    `);
  });

  return app;

}