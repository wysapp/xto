
'use strict';

var Survey = Parse.Object.extend('Survey');
var SurveyResult = Parse.Object.extend('SurveyResult');

Parse.Cloud.define('test_push', function(request, response) {
  Parse.Cloud.useMasterKey();

  var user = request.user;
  if (!user) {
    return response.error({message: 'Not logged in'});
  }

  var query = new Parse.Query(Parse.Installation);
  query.equalTo('user', user);

  var userName = user.get('name').split(' ')[0];
  var data;
  if (request.params.url === 'link') {
    data = {
      alert: 'Hey ' + userName + ', look at this great website',
      url: 'https://www.fbf8.com/'
    };
  } else if (request.params.url === 'session') {
    data = {
      alert: userName + ', "Designing at Facebook is about to begin"',
      url: 'f8://designing-at-facebook'
    };
  } else {
    data = {
      alert: 'Test notification for ' + userName,
   };
  }

  data.badge = 'Increment';

  Parse.Push.send({
    where: query,
    push_time: new Date(Date.now() + 3000),
    badge: 'Increment',
    data: data,
  }).then(
    function() {response.success([]);},
    function(error) { response.error(error);}
  );
  
});

Parse.Cloud.define('test_survey', function(request, response) {
  Parse.Cloud.useMasterKey();

  var user = request.user;
  if (!user) {
    return response.error({message: 'Not logged in'});
  }

  new Parse.Query(Survey)
    .include('session')
    .find()
    .then(pickRandom)
    .then(function(survey) {
      var sessionTitle = survey.get('session').get('sessionTitle');
      return new SurveyResult().save({
        user: user,
        survey: survey,
      }).then(function() {
        return Parse.Push.send({
          where: new Parse.Query(Parse.Installation).equalTo('user', user),
          push_time: new Date(Date.now() + 3000),
          data: {
            badge: 'Increment',
            alert: 'How did "' + sessionTitle + '" go?',
            e: true,
          }
        });
      });
    }).then(
      function() {response.success([]); },
      function(error) {response.error(error); }
    );
});
