
import Button from 'components/Button/Button.react';
import DashboardView from 'dashboard/DashboardView.react';

import React from 'react';
import SliderWrap from 'components/SliderWrap/SliderWrap.react';

import subscribeTo from 'lib/subscribeTo';
import TextInput from 'components/TextInput/TextInput.react';
import Toggle from 'components/Toggle/Toggle.react';
import Toolbar from 'components/Toolbar/Toolbar.react';

import { Directions } from 'lib/Constants';
import { Parse } from 'parse';

const PARSE_SERVER_SUPPORTS_AB_TESTING = false;
const PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH = false;




const XHR_KEY = 'PushNew';
const TRANSLATE_MORE_INFO_URL = '/docs/android/guide#push-notification-push-localization';


export default class PushNew extends DashboardView {
  constructor() {
    super();

    this.xhrs = [];
    this.section = 'Push';
    this.subsection = 'Send New Push';

    this.state = {
      pushAudiencesFetched: false,
      deviceCount: null,
      initialAudienceId: 'everyone',
      audienceSizeSuggestion: null,
      recipientCount: null,
      isLocalizationAvailable: false,
      localizedMessages: [],
      locales: [],
      availableLocales: [],
      localeDeviceCountMap: {},
      loadingLocale: true,
    }
  }
}