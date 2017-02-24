/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'lib/PropTypes';
import { Link } from 'react-router';
import styles from 'components/CategoryList/CategoryList.scss';

export default class CategoryList extends React.Component {


  render() {
    if (this.props.categories.length === 0) {
      return null;
    }
  }
}


CategoryList.propTypes = {
  categories:PropTypes.arrayOf(PropTypes.object).describe('Array of categories used to populate list.'),
  current: PropTypes.string.describe('Id of current category to be highlighted.'),
  linkPrefix: PropTypes.string.describe('Link prefix used to generate link path.')
};

CategoryList.contextTypes = {
  generatePath: React.PropTypes.func
};