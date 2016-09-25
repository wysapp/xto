/**
 * Copyright 2016 Facebook, Inc.
 * @providesModule F8Navigator
 * @flow
 */

'use strict';

var React = require('React');
var Platform = require('Platform');
var BackAndroid = require('BackAndroid');
var F8TabsView = require('F8TabsView');


var Navigator = require('Navigator');
var StyleSheet = require('StyleSheet');
var { connect } = require('react-redux');
var { switchTab } = require('./actions');


var F8Navigator = React.createClass({
  
  _handlers: ([]: Array<() => boolean>),

  componentDidMount: function() {
    BackAndroid.addEventListener('hardwareBackPress', this.handleBackButton);
  },

  componentWillUnmount: function() {
    BackAndroid.removeEventListener('hardwareBackPress', this.handleBackButton);
  },

  getChildContext() {
    return {
      addBackButtonListener: this.addBackButtonListener,
      removeBackButtonListener: this.removeBackButtonListener,
    };
  },

  addBackButtonListener: function(listener) {
    this._handlers.push(listener);
  },

  removeBackButtonListener: function(listener) {
    this._handlers = this._handlers.filter((handler) => handler !== listener);
  },

  handleBackButton: function() {
    for (let i = this._handlers.length - 1; i >= 0; i--) {
      if (this._handlers[i]()) {
        return true;
      }
    }

    const { navigator } = this.refs;
    if (navigator && navigator.getCurrentRoutes().length > 1) {
      navigator.pop();
      return true;
    }

    if ( this.props.tab !== 'schedule') {
      this.props.dispatch(switchTab('schedule'));
      return true;
    }

    return false;
  },

  render: function() {
    return (
      <Navigator
        ref="navigator"
        style={styles.container}
        configureScene={(route) => {
          if (Platform.OS === 'android' ) {
            return Navigator.SceneConfigs.FloatFromBottomAndroid;
          }

          if ( route.shareSettings || route.friend) {
            return Navigator.SceneConfigs.FloatFromRight;
          } else {
            return Navigator.SceneConfigs.FloatFromBottom;
          }
        }}
        initialRoute={{}}
        renderScene={this.renderScene}
      />
    );
  },

  renderScene: function(route, navigator) {
    if ( route.allSessions) {
      return (
        <SessionsCarousel
          {...route}
          navigator={navigator}
        />
      );
    }

    if ( route.session) {
      return (
        <SessionsCarousel
          session={route.session}
          navigator={navigator}
        />
      );
    }

    if (route.filter) {
      return (
        <FilterScreen navigator={navigator} />
      );
    }

    if ( route.friend ) {
      return (
        <FriendsScheduleView
          friend={route.friend}
          navigator={navigator}
        />
      );
    }

    if (route.login) {
      return (
        <LoginModal
          navigator={navigator}
          onLogin={route.callback}
        />
      );
    }

    if (route.share) {
      return (
        <SharingSettingsModal navigator={navigator} />
      );
    }

    if ( route.shareSettings) {
      return <SharingSettingsScreen navigator={navigator} />;
    }

    if ( route.rate) {
      return <RatingScreen navigator={navigator} surveys={route.surveys} />;
    }

    if (route.notices) {
      return <ThirdPartyNotices navigator={navigator} />;
    }

    return <F8TabsView navigator={navigator} />;
  },


});


F8Navigator.childContextTypes = {
  addBackButtonListener: React.PropTypes.func,
  removeBackButtonListener: React.PropTypes.func,
};


var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});


function select(store) {
  return {
    tab: store.navigation.tab,
    isLoggedIn: store.user.isLoggedIn || store.user.hasSkippedLogin,
  };
}

module.exports = connect(select)(F8Navigator);

