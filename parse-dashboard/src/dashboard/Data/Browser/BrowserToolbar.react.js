/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import Icon from 'components/Icon/Icon.react';
import Toolbar from 'components/Toolbar/Toolbar.react';

import BrowserFilter from 'components/BrowserFilter/BrowserFilter.react';
import styles from 'dashboard/Data/Browser/Browser.scss';


let BrowserToolbar = ({
  className,
  classNameForPermissionsEditor,
  count,
  perms,
  schema,
  userPointers,
  filters,
  selection,
  relation,
  setCurrent,
  onFilterChange,

  hidePerms,

  enableDeleteAllRows,
  enableExportClass,
  enableSecurityDialog
}) => {

  let selectionLength = Object.keys(selection).length;
  let details = [];

  let subsection = className;

  return (
    <Toolbar 
      relation={relation}
      filters={filters}
      section={relation ? `Relation <${$relation.targetClassName}>` : 'Class'}
      subsection={subsection}
      details={details.join(' \u2022 ')}
    >
      <a className={styles.toolbarButton} >
        <Icon name="plus-solid" width={14} height={14} />
        <span>Add Row</span>
      </a>
      <div className={styles.toolbarSeparator} />
      <a className={styles.toolbarButton}>
        <Icon name="refresh-solid" width={14} height={14} />
        <span>Refresh</span>
      </a>
      <div className={styles.toolbarSeparator} />
      <BrowserFilter
        setCurrent={setCurrent}
        schema={schema}
        filters={filters}
        onChange={onFilterChange}
      />
      <div className={styles.toolbarSeparator} />
    </Toolbar>    
  );
};


export default BrowserToolbar;