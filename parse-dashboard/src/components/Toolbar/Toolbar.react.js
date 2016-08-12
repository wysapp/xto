

import PropTypes from 'lib/PropTypes';
import React from 'react';
import Icon from 'components/Icon/Icon.react';
import styles from 'components/Toolbar/Toolbar.scss';
import history from 'dashboard/history';

const goBack = () => history.goBack();

let Toolbar = (props) => {
  let backButton;
  if ( props.relation || (props.filters && props.filters.size)) {
    backButton = (
      <a 
        className={styles.iconButton}
        onClick={goBack} >
        <Icon width={32} height={32} fill='#ffffff' name='left-outline' />
      </a>
    );
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.title}>
        <div className={styles.nav}>
          {backButton}
        </div>
        <div className={styles.titleText}>
          <div className={styles.section}>{props.section}</div>
          <div>
            <span className={styles.subsection}>
              {props.subsection}
            </span>
            <span className={styles.details}>
              {props.details}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        {props.children}
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  section: PropTypes.string,
  subsection: PropTypes.string,
  details: PropTypes.string,
  relation: PropTypes.object,
};

export default Toolbar;
