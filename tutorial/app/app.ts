import { Component, ViewChild } from '@angular/core';
import { Events, ionicBootstrap, MenuController, Nav, Platform } from 'ionic-angular';
import { Splashscreen, StatusBar } from 'ionic-native';

import { TutorialPage } from './pages/tutorial/tutorial';
import { LoginPage} from './pages/login/login';
import { SignupPage} from './pages/signup/signup';
import { TabsPage } from './pages/tabs/tabs';

import { UserData } from './providers/user-data';

interface PageObj {
  title: string;
  component: any;
  icon: string;
  index?: number;
}

@Component({
  templateUrl: 'build/app.html'
})
class ConferenceApp {

  @ViewChild(Nav) nav: Nav;

  appPages: PageObj[] = [
    {title: 'Schedule', component: TabsPage, icon: 'calendar'},
    {title: 'Speakers', component: TabsPage, index: 1, icon: 'contacts'},
    {title: 'Map', component: TabsPage, index: 2, icon: 'map'},
    {title: 'About', component: TabsPage, index: 3, icon:'information-circle'}
  ];

  loggedOutPages: PageObj[] = [
    {title: 'Login', component: LoginPage, icon: 'log-in'},
    {title: 'Signup', component: SignupPage, icon: 'person-add'}
  ];

  rootPage: any = TutorialPage;

  constructor(
    private events: Events,
    private userData: UserData,
    private menu: MenuController,
    platform: Platform
  ) {
    platform.ready().then(() => {
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }

  openPage(page: PageObj) {
    if ( page.index) {
      this.nav.setRoot(page.component, {tabIndex: page.index});
    } else {
      this.nav.setRoot(page.component);
    }
  }
}

ionicBootstrap(ConferenceApp, [UserData], {
  tabbarPlacement: 'bottom'
});
