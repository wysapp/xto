

import * as PushAudiencesStore from 'lib/stores/PushAudiencesStore';
import * as PushConstants from './PushConstants';

import Button from 'components/Button/Button.react';
import LoaderContainer from 'components/LoaderContainer/LoaderContainer.react';
import ParseApp from 'lib/ParseApp';
import PropTypes from 'lib/PropTypes';
import PushAudienceDialog from 'components/PushAudienceDialog/PushAudienceDialog.react';
import PushAudiencesSeletor from 'components/PushAudiencesSelector/PushAudiencesSelector.react';
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

    this.context.currentApp.fetchAvailableDevices().then(({ available_devices }) => {
      this.setState({
        availableDevices: available_devices
      });
    }, (error) => {
      this.setState({
        availableDevices: PushConstants.DEFAULT_DEVICES
      });
    });
  }

  createAudience(modalState, { platforms, name, formattedFilters, saveForFuture, filters}) {

  }

  render() {

    let { pushAudiencesStore, loaded, current, ...otherProps } = this.props;
    
    let pushAudienceData = pushAudiencesStore.data;
    let audiences = null;
    let showMore = false;

    if (pushAudienceData) {
      audiences = pushAudienceData.get('audiences') || new List();
      showMore = pushAudienceData.get('showMore') || false;
    }

    let showMoreContent = showMore ? (
      <div className={styles.showMoreWrap}>
        <Button value={this.state.loading ? 'Fetching all audiences' : 'Show all audiences'} onClick={this.handleShowMoreClick.bind(this)} />
      </div>
    ) : null;

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

    let editAudienceModal = (
      <div className={styles.pushAudienceDialog}>
        <PushAudienceDialog 
          availableDevices={this.state.availableDevices}
          progress={this.state.createProgress}
          errorMessage={this.state.createErrorMessage}
          audienceInfo={this.state.newSegmentInfo}
          editMode={true}
          schema={this.props.schema}
          primaryAction={this.createAudience.bind(this,'showEditModal')}
          secondaryAction={() => {
            this.setState({
              showEditModal: false,
              createErrorMessage: '',
            });
          }} />
      </div>
    );

    let _current;

    if ( this.newlyCreatedTempSegment) {
      _current = PushConstants.NEW_SEGMENT_ID;
      this.newlyCreatedTempSegment = false;
    } else if (this.state.newlyCreatedTempSegment) {
      _current = audiences.get(0).objectId;
      this.setState({ newlyCreatedTempSegment: false });
    } else {
      _current = current;
    }

    return (
      <div className={styles.pushAudienceData}>
        <LoaderContainer loading={this.state.loading} solid={false} className={styles.loadingContainer}>
          <PushAudiencesSelector
            defaultAudience={this.state.defaultAudience}
            newSegment={this.state.newSegment}
            audiences={audiences}
            onEditAudience={this.handleEditAudienceClick.bind(this)}
            current={_current}
            {...otherProps}>
            {showMoreContent}
          </PushAudiencesSelector>
        </LoaderContainer>
        {createAudienceButton}
        {this.state.showEditModal ? editAudienceModal : null}
      </div>
    )
  }
}


PushAudiencesData.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp)
};