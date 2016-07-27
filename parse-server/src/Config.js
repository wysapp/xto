import AppCache from './cache';


export class Config {
  constructor(applicationId: string, mount: string) {
    let cacheInfo = AppCache.get(applicationId);
    if(!cacheInfo) {
      return;
    }
  }

  static validate({
    verifyUserEmails,
    userController,
    appName,
    publicServerURL,
    revokeSessionOnPasswordReset,
    expireInactiveSessions,
    sessionLength,
    emailVerifyTokenValidityDuration
  }) {

  }
}


export default Config;
module.exports = Config;