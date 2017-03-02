/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import Parse from 'parse';
import Icon from 'components/Icon/Icon.react';
import PermissionsDialog from 'components/PermissionsDialog/PermissionsDialog.react';
import ParseApp from 'lib/ParseApp';
import styles from 'dashboard/Data/Browser/Browser.scss';

export default class SecurityDialog extends React.Component {
  constructor() {
    super();
    this.state= {open: false};
  }

  render() {
    let dialog = null;
    let parseServerSupportsPointerPermissions = this.context.currentApp.serverInfo.features.schemas.editClassLevelPermissions;


    if (this.props.perms && this.state.open) {
      dialog = (
        <PermissionsDialog
          title="Edit class Level Permissions"
          enablePointerPermissions={parseServerSupportsPointerPermissions}
          advanced={true}
          confirmText="Save CLP"
          details={<a target="_blank" href='http://parseplatform.github.io/docs/ios/guide/#security'>Learn more about CLPs and app security</a>}
          permissions={this.props.perms}
          validateEntry={entry => validateEntry(this.props.userPointers, entry, parseServerSupportsPointerPermissions)}
          onCancel={() => {
            this.setState({open: false});
          }}
          onConfirm={perms => this.props.onChangeCLP(perms).then(() => this.setState({open: false}))}
        />
      )
    } 

    let classes = [styles.toolbarButton];
    if (this.props.disabled) {
      classes.push(styles.toolbarButtonDisabled);
    }
    let onClick = null;
    if (!this.props.disabled) {
      onClick = () => {
        this.setState({open: true});
        this.props.setCurrent(null);
      };
    }

    return (
      <div className={classes.join(' ')} onClick={onClick}>
        <Icon width={14} height={14} name="locked-solid" />
        <span>Security</span>
        {dialog}
      </div>
    );
  }
}

SecurityDialog.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp),
};