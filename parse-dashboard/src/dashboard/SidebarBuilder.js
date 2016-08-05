
import React from 'react';
import Sidebar from 'components/Sidebar/Sidebar.react';
import SidebarSubItem from 'components/Sidebar/SidebarSubItem.react';


let accountSidebarSections = [
  {
    name: 'Your Apps',
    icon: 'blank-app-outline',
    link: '/apps'
  }
];


export function buildAccountSidebar(options) {
  let {
    section,
    subsection
  } = options;

  return (
    <Sidebar
      sections={accountSidebarSections}
      section={section}
      subsection={subsection}
      prefix={''} />
  );
}