
import Parse from 'parse';
import ParseApp from 'lib/ParseApp';
import { get, post, del } from 'lib/AJAX';
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
  }
}

export default AppsManager;