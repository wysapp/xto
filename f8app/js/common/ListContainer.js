
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
 * @providesModule ListContainer
 */
'use strict';

var Animated = require('Animated');
var NativeModules = require('NativeModules');
var Dimensions = require('Dimensions');

var F8Header = require('F8Header');

var ParallaxBackground = require('ParallaxBackground');

var React = require('React');
var ReactNative = require('react-native');
var StyleSheet = require('F8StyleSheet');
var View = require('View');
var { Text } = require('F8Text');
var ViewPager = require('./ViewPager');
var Platform = require('Platform');

import type { Item as HeaderItem } from 'F8Header';

type props = {
  title: string;
  leftItem?: HeaderItem;
  rightItem?: HeaderItem;
  extraItems?: Array<HeaderItem>;
  selectedSegment?: number;
  selectedSectionColor: string;
  backgroundImage: number;
  backgroundColor: string;
  parallaxContent?: ?ReactElement;
  stickyHeader?: ?ReactElement;
  onSegmentChange?: (segment: number) => void;
  children?: any;
};

type State = {
  idx: number;
  anim: Animated.Value;
  stickyHeaderHeight: number;
};

const EMPTY_CELL_HEIGHT = Dimensions.get('window').height > 600 ? 200 : 150;

class ListContainer extends React.Component {
  props: Props;
  state: State;
  _refs: Array<any>;
  _pinned: any;

  static defaultProps = {
    selectedSectionColor: 'white',
  };

  static contextTypes = {
    openDrawer: React.PropTypes.func,
    hasUnreadNotifications: React.PropTypes.number,
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      idx: this.props.selectedSegment || 0,
      anim: new Animated.Value(0),
      stickyHeaderHeight: 0,
    };

    (this:any).handleShowMenu = this.handleShowMenu.bind(this);
    (this:any).handleSelectSegment = this.handleSelectSegment.bind(this);

    this._refs = [];
  }

  render() {
    var leftItem = this.props.leftItem;
    if (!leftItem && Platform.OS === 'android') {
      leftItem = {
        title: 'Menu',
        icon: this.context.hasUnreadNotifications
          ? require('./img/hamburger-unread.png')
          : require('./img/hamburger.png'),
        onPress: this.handleShowMenu,
      };
    }

    const segments = [];
    const content = React.Children.map(this.props.children, (child, idx) => {
      segments.push(child.props.title);

    });

    let { stickyHeader } = this.props;
    if ( segments.length > 1) {
      stickyHeader = (
        <View>
          <F8SegmentedControl
            values={segments}
            selectedIndex={this.state.idx}
            selectionColor={this.props.selectedSectionColor}
            onChange={this.handleSelectSegment}
          />
          {stickyHeader}
        </View>
      );
    }

    const backgroundShift = segments.length === 1
      ? 0
      : this.state.idx / (segments.length -1);
    
    
    return (
      <View style={styles.container}>
        <View style={styles.headerWrapper}>

          <ParallaxBackground
            minHeight={this.state.stickyHeaderHeight + F8Header.height}
            maxHeight={EMPTY_CELL_HEIGHT + this.state.stickyHeaderHeight + F8Header.height}
            offset={this.state.anim}
            backgroundImage={this.props.backgroundImage}
            backgroundShift={backgroundShift}
            backgroundColor={this.props.backgroundColor}>
            {this.renderParallaxContent()}
          </ParallaxBackground>

          <F8Header
            title={this.props.title}
            leftItem={leftItem}
            rightItem={this.props.rightItem}
            extraItems={this.props.extraItems}>
            {this.renderHeaderTitle()}
          </F8Header>       
          <ViewPager
            count={segments.length}
            selectedIndex={this.state.idx}
            onSelectedIndexChange={this.handleSelectSegment}>
            {content}
          </ViewPager>
        </View>
      </View>
    )
  }

  renderParallaxContent() {
    if ( Platform.OS === 'android' ) {
      return <View />;
    }

    if ( this.props.parallaxContent) {
      return this.props.parallaxContent;
    }

    return (
      <Text style={styles.parallaxText}>
        {this.props.title}
      </Text>
    );
  }

  renderHeaderTitle(): ?ReactElement {
    if (Platform.OS === 'android') {
      return null;
    }

    var transform;
    if ( !this.props.parallaxContent) {
      var distance = EMPTY_CELL_HEIGHT - this.state.stickyHeaderHeight;
      transform = {
        opacity: this.state.anim.interpolate({
          inputRange: [distance - 20, distance],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      };
    }

    return (
      <Animated.Text style={[styles.headerTitle, transform]}>
        {this.props.title}
      </Animated.Text>
    );

  }


  handleSelectSegment(idx: number) {

  }

  handleShowMenu() {

  }
}



var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerWrapper: {
    android: {
      elevation: 2,
      backgroundColor: 'transparent',
      // FIXME: elevation doesn't seem to work without setting border
      borderRightWidth: 1,
      marginRight: -1,
      borderRightColor: 'transparent',
    }
  },
  listView: {
    ios: {
      backgroundColor: 'transparent',
    },
    android: {
      backgroundColor: 'white',
    }
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  parallaxText: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  stickyHeader: {
    position: 'absolute',
    top: F8Header.height,
    left: 0,
    right: 0,
  },
});

module.exports = ListContainer;

