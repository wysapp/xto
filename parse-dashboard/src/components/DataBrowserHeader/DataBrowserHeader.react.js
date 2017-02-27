/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import PropTypes from 'lib/PropTypes';
import { unselectable } from 'stylesheets/base.scss';
import styles from 'components/DataBrowserHeader/DataBrowserHeader.scss';



export default class DataBrowserHeader extends React.Component {
  render() {

    let {
      name,
      type, 
      targetClass,
      order,
      style,
      
      index
    } = this.props;

    let classes = [styles.header, unselectable];
    if (order) {
      classes.push(styles[order]);
    }

    return (
      <div className={classes.join(' ')} style={style}>
        <div className={styles.name}>{name}</div>
        <div className={styles.type}>
          {targetClass ? 
            `${type} <${targetClass}>` : 
            type
          }
        </div>
      </div>
    );
  }
}


DataBrowserHeader.propTypes = {
  name: PropTypes.string.isRequired.describe(
    'The name of the column.'
  ),
  type: PropTypes.string.describe(
    'The type of the column.'
  ),
  targetClass: PropTypes.string.describe(
    'The target class for a Pointer or Relation.'
  ),
  order: PropTypes.oneOf(['ascending', 'descending']).describe(
    'A sort ordering that displays as an arrow in the header.'
  ),
};