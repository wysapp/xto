'use strict';

var {
  LoginManager,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
} = require('react-native-fbsdk');

const emptyFunction = () => {};
const mapObject = require('fbjs/lib/mapObject');


type AuthResponse = {
  userID: string;
  accessToken: string;
  expiresIn: number;
};

type LoginOptions = { scope: string };
type LoginCallback = (result: {authResponse?: AuthResponse, error?: Error}) => void;

let _authResponse: ?AuthResponse = null;

async function loginWithFacebookSDK(options: LoginOptions): Promise<AuthResponse> {
  const scope = options.scope || 'public-profile';

  const permissions = scope.split(',');

  const loginResult = await LoginManager.logInWithReadPermissions(permissions);
  if (loginResult.isCancelled) {
    throw new Error('Canceled by user');
  }

  const accessToken = await AccessToken.getCurrentAccessToken();
  if (!accessToken) {
    throw new Error('No access token');
  }

  _authResponse = {
    userID: accessToken.userID,
    accessToken: accessToken.accessToken,
    expiresIn: Math.round((accessToken.expirationTime - Date.now()) / 1000),
  };
  return _authResponse;
}


var FacebookSDK = {
  init() {
    window.F8 = FacebookSDK;
  },

  login(callback: LoginCallback, options: LoginOptions) {
    loginWithFacebookSDK(options).then(
      (authResponse) => callback({authResponse}),
      (error) => callback({error})
    );
  },

  getAuthResponse(): ?AuthResponse {
    return _authResponse;
  },

  logout() {
    LoginManager.logOut();
  },


  api: function(path: string, ...args: Array<mixed>) {
    const argByType = {};
    args.forEach((arg) => { argByType[typeof arg] = arg; });

    const httpMethod = (argByType['string'] || 'get').toUpperCase();
    const params = argByType['object'] || {};
    const callback = argByType['function'] || emptyFunction;

    const parameters = mapObject(params, (value) => ({string: value}));

    function processResponse(error, result) {
      if (!error && typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch (e) {
          error = e;
        }
      }

      const data = error ? {error} : result;
      callback(data);
    }

    const request = new GraphRequest(path, { parameters, httpMethod}, processResponse);
    new GraphRequestManager().addRequest(request).start();
  }
};

module.exports = FacebookSDK;