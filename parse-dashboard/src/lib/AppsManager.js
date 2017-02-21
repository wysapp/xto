/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Parse from 'parse';
import ParseApp from 'lib/ParseApp';
import {get, post, del } from 'lib/AJAX';
import { unescape } from 'lib/StringEscaping';

let appsStore = [];

const AppsManager = {

  addApp(raw) {
    appsStore.push(new ParseApp(raw));
  },

  apps() {
    appsStore.sort(function(app1, app2) {
      return app1.name.localeCompare(app2.name);
    });

    return appsStore;
  },

  findAppBySlugOrName(slugOrName) {
    let apps = this.apps();
    for (let i = apps.length; i--;) {
      if (apps[i].slug === slugOrName || apps[i].name === slugOrName) {
        return apps[i];
      }
    }
    return null;
  },

  getAllAppsIndexStats() {
    return Parse.Promise.when(this.apps().map(app => {
      return Parse.Promise.when(
        app.getClassCount('_Installation').then(count => app.installations = count),
        app.getClassCount('_User').then(count => app.users = count)
      );
    }));
  },
}

export default AppsManager;