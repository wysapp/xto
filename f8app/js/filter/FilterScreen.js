/**
 * Copyright 2016 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE
 *
 * @flow
 */
'use strict';

const React = require('React');
const F8Header = require('F8Header');
const F8Colors = require('F8Colors');
const F8Button = require('F8Button');

const {
  Animated,
  View,
  StyleSheet,
  ScrollView,
} = require('react-native');

const shallowEqual = require('fbjs/lib/shallowEqual');

const {
  applyTopicsFilter,
} = require('../actions');

const { connect } = require('react-redux');

class FilterScreen extends React.Component {
  props: {
    isLoggedIn: boolean;
    topics: Array<string>;
    selectedTopics: {[id:string]: boolean};
    dispatch: (action: any) => void;
    navigator: any;
    onClose: ?() => void;
  } ;

  state: {
    selectedTopics: {[id: string]: boolean};
    anim: Animated.Value;
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedTopics: {...this.props.selectedTopics},
      anim: new Animated.Value(0),
    };

    (this:any).applyFilter = this.applyFilter.bind(this);
    (this:any).clearFilter = this.clearFilter.bind(this);
    (this:any).close = this.close.bind(this);
  }

  applyFilter() {

  }

  close() {

  }

  clearFilter() {

  }

}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#1B3B79',
  },
  scrollview: {
    padding: 20,
    paddingBottom: 20 + 49,
  },
  separator: {
    backgroundColor: '#ffff26',
  },
  applyButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 0,
    backgroundColor: '#1B3B79',
  },
});

function select(store) {
  return {
    isLoggedIn: store.user.isLoggedIn,
    friendsSchedules: store.friendsSchedules,
    topics: store.topics,
    selectedTopics: store.filter,
  };
}

module.exports = connect(select)(FilterScreen);