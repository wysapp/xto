
import * as AJAX from 'lib/AJAX';
import encodeFormData from 'lib/encodeFormData';
import Parse from 'parse';


export default class ParseApp {

  constructor({
    appName,
    created_at,
    clientKey,
    appId,
    appNameForURL,
    dashboardURL,
    javascriptKey,
    masterKey,
    restKey,
    windowsKey,
    webhookKey,
    apiKey,
    serverURL,
    serverInfo,
    production,
    iconName,
  }) {
   
    this.name = appName;
    this.createdAt = created_at ? new Date(created_at) : new Date();
    this.applicationId = appId;
    this.slug = appNameForURL || appName;
    if (!this.slug && dashboardURL) {
      let pieces = dashboardURL.split('/');
      this.slug = pieces[pieces.length - 1];
    }
    this.clientKey = clientKey;
    this.javascriptKey = javascriptKey;
    this.masterKey = masterKey;
    this.restKey = restKey;
    this.windowsKey = windowsKey;
    this.webhookKey = webhookKey;
    this.fileKey =  apiKey;
    this.production = production;
    this.serverURL = serverURL;
    this.serverInfo = serverInfo;
    this.icon = iconName;

    this.settings = {
      fields: {},
      lastFetched: new Date(0)
    };

    this.latestRelease = {
      release: null,
      lastFetched: new Date(0)
    };

    this.jobStatus = {
      status: null,
      lastFetched: new Date(0)
    };

    this.classCounts = {
      counts: {},
      lastFetched: {},
    }

    this.hasCheckedForMigraton = false;
  }

  setParseKeys() {
    Parse.serverURL = this.serverURL;   
    Parse._initialize(this.applicationId, this.javascriptKey, this.masterKey);    
  }

  apiRequest(method, path, params, options) {
    this.setParseKeys();
    return Parse._request(method, path, params, options);
  }


  getLogs(level, since) {
    let path = 'scriptlog?level=' + encodeURIComponent(level.toLowerCase()) + '&n=100' + (since?'&startDate=' + encodeURIComponent(since.getTime()): '');

    return this.apiRequest('GET', path, {}, { useMasterKey: true });
  }

  getLatestRelease() {
    if ( new Date() - this.latestRelease.lastFetched < 60000) {
      return Parse.Promise.as(this.latestRelease);
    }

    return this.apiRequest(
      'GET',
      'releases/latest',
      {},
      { useMasterKey: true }
    ).then((release) => {
      this.latestRelease.lastFetched = new Date();
      this.latestRelease.files = null;

      if ( release.length === 0) {
        this.latestRelease.release = null;
      } else {
        let latestRelease = release[0];

        this.latestRelease.release = {
          version: latestRelease.version,
          parseVersion: latestRelease.parseVersion,
          deployedAt: new Date(latestRelease.timestamp)
        };

        let chekcsums = JSON.parse(latestRelease.checksums);
        let versions = JSON.parse(latestRelease.userFiles);
        this.latestRelease.files = {};

        if ( checksums.cloud) {
          checksums = checksums.cloud;
        }
        if (versions.cloud) {
          versions = versions.cloud;
        }

        for (let c in checksums) {
          this.latestRelease.files[c] = {
            checksum: checksums[c],
            version: versions[c],
            source: null
          };
        }
      }

      return Parse.Promise.as(this.latestRelease);
    });
  }


  getClassCount(className) {
    this.setParseKeys();
    if(this.classCounts.counts[className] !== undefined) {
      if (new Date() - this.classCounts.lastFetched[className] < 60000) {
        return Parse.Promise.as(this.classCounts.counts[className]);
      }
    }

    let p = new Parse.Query(className).count({ useMasterKey: true});

    p.then(count => {
      this.classCounts.counts[className] = count;
      this.classCounts.lastFetched[className] = new Date();
    })
    return p;
  }


  fetchPushSubscriberCount(audienceId, query) {
    let path = '/apps/' + this.slug + '/dashboard_ajax/push_subscriber_count';
    let urlsSeparator = '?';
    if ( query) {
      path += `?where=${encodeURI(JSON.stringify(query))}`;
      urlsSeparator = '&';
    }

    return AJAX.abortableGet(audienceId ? `${path}${urlsSeparator}audienceId=${audienceId}` : path );
  }


  isLocalizationAvailable() {
    let path = '/apps/' + this.slug + '/is_localization_available';
    return AJAX.abortableGet(path);
  }


  fetchPushLocales() {
    let path = '/apps/' + this.slug + '/installation_column_options?column=localeIdentifier';
    return AJAX.abortableGet(path);
  }


  fetchPushLocaleDeviceCount(audienceId, where, locales ) {
    let path = '/apps/' + this.slug + '/push_subscriber_translation_count';
    let urlsSeparator = '?';
    path += `?where=${encodeURI(JSON.stringify(where || {}))}`;
    path += `&locales=${encodeURI(JSON.stringify(locales))}`;

    urlsSeparator = '&';
    return AJAX.abortableGet(audienceId ? `${path}${urlsSeparator}audienceId=${audienceId}` : path);
  }

  
  fetchAvailableDevices() {
    let path = '/apps/' + this.slug + '/dashboard_ajax/available_devices';
    return AJAX.get(path);
  }


  getMigrations() {
    let path = '/apps/' + this.slug + '/migrations';
    let obj = AJAX.abortableGet(path);
    this.hasCheckedForMigraton = true;
    obj.promise.then(({migration}) => {
      this.migration = migration;
    });

    return obj;
  }

}