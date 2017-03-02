/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'lib/PropTypes';
import { unselectable } from 'stylesheets/base.scss';
import styles from 'components/Toggle/Toggle.scss';
import { input } from 'components/Field/Field.scss';

export default class Toggle extends React.Component {

  toLeft() {
    if (this.props.type === Toggle.Types.TWO_WAY || this.props.type === Toggle.Types.CUSTOM) {
      this.props.onChange(this.props.optionLeft);
    } else {
      this.props.onChange(false);
    }
  }

  toRight() {
    if (this.props.type === Toggle.Types.TWO_WAY || this.props.type === Toggle.Types.CUSTOM) {
      this.props.onChange(this.props.optionRight);
    } else {
      this.props.onChange(true);
    }
  }

  toggle() {
    if (this.props.type ===  Toggle.Types.TWO_WAY || this.props.type === Toggle.Types.CUSTOM) {
      if (this.props.value === this.props.optionLeft) {
        this.props.onChange(this.props.optionRight);
      } else {
        this.props.onChange(this.props.optionLeft);
      }
    } else {
      this.props.onChange(this.props.value);
    }
  }

  render(){

    let type = this.props.type;
    let labelLeft = '';
    let labelRight = '';
    let colored = false;
    let left = false;
    switch (type) {
      case Toggle.Types.ON_OFF:
        labelLeft = 'Off';
        labelRight = 'On';
        colored = true;
        left = !this.props.value;
        break;
      case Toggle.Types.TRUE_FALSE:
        labelLeft = 'False';
        labelRight = 'True';
        colored = true;
        left = !this.props.value;
        break;
      case Toggle.Types.TWO_WAY:
        if (!this.props.optionLeft || !this.props.optionRight) {
          throw new Error(
            'TWO_WAY toggle must provide optionLeft and optionRight props.'
          );
        }
        labelLeft = this.props.optionLeft;
        labelRight = this.props.optionRight;
        left = this.props.value === labelLeft;
        break;
      case Toggle.Types.CUSTOM:
        if (!this.props.optionLeft || !this.props.optionRight || !this.props.labelLeft || !this.props.labelRight) {
          throw new Error(
            'CUSTOM toggle must provide optionLeft, optionRight, labelLeft, and labelRight props.'
          );
        }
        labelLeft = this.props.labelLeft;
        labelRight = this.props.labelRight;
        left = this.props.value === this.props.optionLeft;
        colored = this.props.colored;
        break;
      default:
        labelLeft = 'No';
        labelRight = 'Yes';
        colored = true;
        left = !this.props.value;
        break;
    }


    let switchClasses = [styles.switch];
    if (colored) {
      switchClasses.push(styles.colored);
    }
    

    let toggleClasses = [styles.toggle, unselectable, input];
    if (left) {
      toggleClasses.push(styles.left);
    }

    if (this.props.darkBg) {
      toggleClasses.push(styles.darkBg);
    }


    return (
      <div className={toggleClasses.join(' ')}>
        <span className={styles.label} onClick={this.toLeft.bind(this)}>{labelLeft}</span>
        <span className={switchClasses.join(' ')} onClick={this.toggle.bind(this)}></span>
        <span className={styles.label} onClick={this.toRight.bind(this)}>{labelRight}</span>
      </div>
    );
  }
}


Toggle.Types = {
  YES_NO: 1,
  TRUE_FALSE: 2,
  ON_OFF: 3,
  TWO_WAY: 4,
  CUSTOM: 5,
};