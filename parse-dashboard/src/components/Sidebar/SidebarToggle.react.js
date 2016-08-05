
import React from 'react';
import styles from 'components/Sidebar/Sidebar.scss';
import Icon from 'components/Icon/Icon.react';


function toggleSidebarExpansion() {
  if (document.body.className.indexOf(' expanded') > -1) {
    document.body.className = document.body.className.replace(' expanded', '');
  } else {
    document.body.className += ' expanded';
  }
}

let SidebarToggle = () => <a className={styles.toggle} onClick={toggleSidebarExpansion}><Icon width={24} height={24} name="hamburger" fill={'#009af1'} /></a>;


export default SidebarToggle;