var Parse = require('parse/node').Parse;

var batchPath = '/batch';

function mountOnto(router) {
  router.route('POST', batchPath, (req) => {
    return handleBatch(router, req);
  });
}


function handleBatch(router, req) {
  if (!req.body.requests instanceof Array) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, 'requests must be an array');
  }

  if (!req.originalUrl.endsWith(batchPath)) {
    throw 'internal routing problem - expected url to end with batch';
  }

  var apiPrefixLength = req.originalUrl.length - batchPath.length;
  var apiPrefix = req.originalUrl.slice(0, apiPrefixLength);

  var promises = [];
  for (var restRequest of req.body.requests) {
    if(restRequest.path.slice(0, apiPrefixLength) != apiPrefix) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'cannot route batch path ' + restRequest.path);
    }

    var routablePath = restRequest.path.slice(apiPrefixLength);

    var match = router.match(restRequest.method, routablePath);
    if (!match) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'cannot route ' + restRequest.method + ' ' + routablePath);
    }

    var request = {
      body: restRequest.body,
      params: match.params,
      config: req.config,
      auth: req.auth,
      info: req.info
    };

    promises.push(match.handler(request).then((response) => {
      return { success: response.response};
    }, (error) => {
      return { error: {code: error.code, error: error.message}};
    }));
  }

  return Promise.all(promises).then((results) => {
    return {response: results};
  });
}


module.exports = {
  mountOnto: mountOnto
};