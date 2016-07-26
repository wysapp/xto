import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';

import { AboutPage } from '../about/about';
import { MapPage } from '../map/map';
import { SchedulePage } from '../schedule/schedule';


@Component({
  templateUrl: 'build/pages/tabs/tabs.html'
})
export class TabsPage {

  tab1Root: any = SchedulePage;
  tab3Root: any = MapPage;
  tab4Root: any = AboutPage;

  mySelectedIndex: number;

  constructor(navParams: NavParams) {
    this.mySelectedIndex = navParams.data.tabIndex || 0;
    
  }
}