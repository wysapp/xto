/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import ParseApp from 'lib/ParseApp';

export default function subscribeTo(name, prop) {
  return function(Component) {

    const displayName = Component.displayName || Component.name || 'Component';

    class SubscribedComponent extends React.Component {

      constructor(props, context) {
        super(props, context);

        this.state = {
          data: []
        };
      }

      render() {
        console.log('222222222222222222-SubscribedComponent', this.props);
        return <Component {...this.props} />;
      }
    }

    SubscribedComponent.displayName = `subscribeTo(${displayName})`;
    SubscribedComponent.contextTypes = {
      currentApp: React.PropTypes.instanceOf(ParseApp),
      generatePath: React.PropTypes.func,
    };

    SubscribedComponent.original = Component;

    return SubscribedComponent;

  }
}