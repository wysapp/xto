

module.exports = function(authOptions = {}, enableAnonymousUsers = true ) {
  let _enableAnonymousUsers = enableAnonymousUsers;

  const setEnableAnonymousUsers = function(enable) {
    _enableAnonymousUsers = enable;
  }

  // To handle the test cases on configuration
  const getValidatorForProvider = function(provider) {

  }

  return Object.freeze({
    getValidatorForProvider,
    setEnableAnonymousUsers
  });

}

