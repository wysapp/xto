
import Icon from 'components/Icon/Icon.react';
import { Link } from 'react-router';
import React from 'react';
import styles from 'components/Sidebar/Sidebar.scss';

const version = process.env.version;


let SidebarHeader = ({}) =>
<div className={styles.header}>
  <Link className={styles.logo} to={{pathname: '/apps'}}>
    <Icon width={28} height={28} name='infinity' fill={'#ffffff'} />
  </Link>
  <Link to='/apps'>
    <div className={styles.version}>
      <div>Parse Dashboard {version}</div>
    </div>
  </Link>
</div>

export default SidebarHeader;
