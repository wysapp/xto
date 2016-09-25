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
 * @providesModule F8MapView
 * @flow
 */
'use strict';

var ActionSheetIOS = require('ActionSheetIOS');
var F8Button = require('F8Button');
var Linking = require('Linking');
var Platform = require('Platform');
var React = require('React');
var StyleSheet = require('F8StyleSheet');
var View = require('View');

var { connect } = require('react-redux');

var VENUE_ADDRESS = '2 Marina Blvd, San Francisco, CA 94123';

class F8MapView extends React.Component {
  
  constructor() {
    super();

    (this:any).handleGetDirections = this.handleGetDirections.bind(this);
    (this:any).openMaps = this.openMaps.bind(this);
  }

  render() {
    const { map1, map2 } = this.props;

    return (
      <View style={styles.container}>

      </View>
    );
  }

  handleGetDirections() {

  }

  openMaps(option) {

  }
}


var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  directionsButton: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    ios: {
      bottom: 49,
    },
    android: {
      bottom: 0,
    },
  },
});


function select(store) {
  return {
    map1: store.maps.find((map) => map.name === 'Overview'),
    map2: store.maps.find((map) => map.name === 'Developer Garage'),
  };
}

module.exports = connect(select)(F8MapView);
