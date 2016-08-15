

import Button from 'components/Button/Button.react';
import ParseApp from 'lib/ParseApp';
import PropTypes from 'lib/PropTypes';
import PushAudienceDialog from 'components/PushAudienceDialog/PushAudienceDialog.react';
import React from 'react';
import styles from './PushAudiencesData.scss';

import { center } from 'stylesheets/base.scss';
import { List, Map } from 'immutable';

const XHR_KEY = 'PushAudiencesData';


export default class PushAudiencesData extends React.Component {
  constructor() {
    super();

    this.state = {
      loading: true,
      showMore: false,
      showCreateModal: false,
      currentAudience: null,
      defaultAudience: null,
      newSegment: null,
      newSegmentInfo: null,
      showEditModal: false,
      availableDevices: [],
      createProgress: false,
      createErrorMessage: null,
    };
  }

  componentWillMount() {
    
    if (this.props.loaded) {
      this.setState({ loading: false });
    }

    this.setState({
      defaultAudience: {
        createdAt: this.context.currentApp.createdAt,
        name: 'Everyone',
        count: 0,
        objectId: 'everyone',
        icon: 'users-solid',
      }
    });
  }

  createAudience(modalState, { platforms, name, formattedFilters, saveForFuture, filters}) {

  }

  render() {

    let createAudienceButton = (
      <div className={styles.pushAudienceDialog}>
        <Button 
          value='Create an audience'
          primary={true}
          onClick={() => {
            this.setState({
              showCreateModal: true
            });
          }}>
        </Button>
        {this.state.showCreateModal ? <PushAudienceDialog 
          availableDevices={this.state.availableDevices}
          progress={this.state.createProgress}
          errorMessage={this.state.createErrorMessage}
          schema={this.props.schema}
          primaryAction={this.createAudience.bind(this, 'showCreateModal')}
          secondaryAction={() => {
            this.setState({
              showCreateModal: false,
              createErrorMessage: '',
            });
          }}/> : null
        }
      </div>
    );

    return (
      <div className={styles.pushAudienceData}>
        {createAudienceButton}
      </div>
    )
  }
}


PushAudiencesData.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp)
};