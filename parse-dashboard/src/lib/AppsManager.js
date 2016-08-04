
import Parse from 'parse';
import ParseApp from 'lib/ParseApp';
import { get, post, del } from 'lib/AJAX';
import { unescape } from 'lib/StringEscaping';

let appsStore = [];

const AppsManager = {
  addApp(raw) {
    appsStore.push(new ParseApp(raw));
  }
}

export default AppsManager;