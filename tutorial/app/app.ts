import { Component, ViewChild } from '@angular/core';
import { Events, ionicBootstrap, MenuController, Nav, Platform } from 'ionic-angular';
import { Splashscreen, StatusBar } from 'ionic-native';

import { TutorialPage } from './pages/tutorial/tutorial';


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

  // @ViewChild(Nav) nav: Nav;

  rootPage: any = TutorialPage;

  constructor(
    private events: Events,
    private menu: MenuController,
    platform: Platform
  ) {
    platform.ready().then(() => {
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }
}

ionicBootstrap(ConferenceApp);