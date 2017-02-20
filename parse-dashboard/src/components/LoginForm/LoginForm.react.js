/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import styles from 'components/LoginForm/LoginForm.scss';
import Icon from 'components/Icon/Icon.react';
import PropTypes from 'lib/PropTypes';
import {verticalCenter} from 'stylesheets/base.scss';


// Class-style component, because we need refs
export default class LoginForm extends React.Component {
  render() {
    return (
      <div className={styles.login} style={{marginTop: this.props.marginTop || '-220px' }}>
        <Icon width={80} height={80} name="infinity" fill="#093A59" />
        <form method="post" ref="form" action={this.props.endpoint} className={styles.form}>

          <div className={styles.header}>
            {this.props.header}
          </div>
          {this.props.children}
          <div className={styles.footer}>
            <div className={verticalCenter} style={{width: '100%'}}>
              {this.props.footer}
            </div>
          </div>

          <input 
            type="submit"
            disabled={!!this.props.disabledSubmit}
            onClick={() => {
              if (this.props.disabledSubmit) {
                return;
              }
              this.refs.form.submit();
            }}
            className={styles.submit}
            value={this.props.action}
          />
        </form>
      </div>
    );
  }
}