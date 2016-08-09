
import ParseApp from 'lib/ParseApp';
import React from 'react';
import * as StoreManager from 'lib/stores/StoreManager';

export default function subscribeTo(name, prop) {

  return function(Component) {
    const store = StoreManager.getStore(name);
    const displayName = Component.displayName || Component.name || 'Component';

    class SubscribedComponent extends React.Component {
      constructor(props, context) {
        super(props, context);

        this.state = {
          data: store.getData(context.currentApp)
        }

      }

      handleNewData(data) {
        if (this.state.data !== data) {
          this.setState({data});
        }
      }

      componentWillMount() {
        this.subscriptionId = store.subscribe(this.handleNewData.bind(this));
      }

      componentWillUnMount() {
        store.unsubscribe(this.subscriptionId);
      }

      render() {
        let dispatch = (type, params = {}) => {
          if (store.isGlobal) {
            return store.dispatch(type, params);
          }
          return store.dispatch(type, params, this.context.currentApp);
        };

        let extras = {
          [prop]: {
            data: this.state.data,
            dispatch: dispatch,
          }
        };

        return <Component {...this.props} {...extras} />;
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