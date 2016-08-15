

import * as SchemaStore from 'lib/stores/SchemaStore';

import Button from 'components/Button/Button.react';
import DashboardView from 'dashboard/DashboardView.react';

import Dropdown from 'components/Dropdown/Dropdown.react';
import Field from 'components/Field/Field.react';
import Fieldset from 'components/Fieldset/Fieldset.react';

import FieldStyles from 'components/Field/Field.scss';


import FlowView from 'components/FlowView/FlowView.react';

import joinWithFinal from 'lib/joinWithFinal';
import Label from 'components/Label/Label.react';
import Option from 'components/Dropdown/Option.react';
import Parse from 'parse';
import pluralize from 'lib/pluralize';

import PushAudiencesData from './PushAudiencesData.react';
import PushPreview from 'components/PushPreview/PushPreview.react';


import React from 'react';
import SliderWrap from 'components/SliderWrap/SliderWrap.react';

import styles from 'dashboard/Push/Push.scss';

import subscribeTo from 'lib/subscribeTo';
import TextInput from 'components/TextInput/TextInput.react';
import Toggle from 'components/Toggle/Toggle.react';
import Toolbar from 'components/Toolbar/Toolbar.react';

import { Directions } from 'lib/Constants';
import { Promise } from 'parse';

const PARSE_SERVER_SUPPORTS_AB_TESTING = false;
const PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH = false;


let formatErrorMessage = (emptyInputMessages, key) => {
  let boldMessages = emptyInputMessages.map((message) => {
 
    return <strong key={message}>{message}</strong>
  });
  return (<div key={key}>Your {joinWithFinal(null, boldMessages, ', ', boldMessages.length < 3 ? ' and ' : ', and ')} can’t be empty.</div>);
}


let isValidJSON = (input) => {
  let parsedJSON = null;

  try {
    parsedJSON = JSON.parse(input);
  } catch (e) {}

  if ( parsedJSON !== null) {
    return true;
  } else {
    return false;
  }
}



const XHR_KEY = 'PushNew';
const TRANSLATE_MORE_INFO_URL = '/docs/android/guide#push-notification-push-localization';



@subscribeTo('Schema', 'schema')
@subscribeTo('PushAudiences', 'pushaudiences')
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

  componentWillMount() {
    this.props.schema.dispatch(SchemaStore.ActionTypes.FETCH);
  }


  
  renderMessageContent(fields, setField) {
    let monospace = fields.data_type === 'json';
    let monospaceA = fields.data_type_1 === 'json';
    let monospaceB = fields.data_type_2 === 'json';
    if (fields.exp_enable && fields.exp_type === 'message') {
      return [
        <Field
          key='messageTypeA'
          className={FieldStyles.header}
          label={<Label text='What type of Message A are you sending?' />}
          input={<Toggle
            type={Toggle.Types.CUSTOM}
            labelLeft='Text'
            labelRight='JSON'
            optionLeft='text'
            optionRight='json'
            direction='left'
            value={fields.data_type_1}
            onChange={setField.bind(null, 'data_type_1')} />
        } />,
        <Field
          key='messageA'
          className={monospaceA ? styles.monospace : ''}
          label={<Label text='Message A' />}
          input={<TextInput
            multiline={true}
            height={200}
            monospace={monospaceA}
            placeholder={monospace ? '{\n  \u2026\n}' : 'Type your message\u2026'}
            value={fields.data1}
            onChange={setField.bind(null, 'data1')} />
          } />,
        <Field
          key='messageTypeB'
          className={FieldStyles.header}
          label={<Label text='What type of Message B are you sending?' />}
          input={<Toggle
            type={Toggle.Types.CUSTOM}
            labelLeft='Text'
            labelRight='JSON'
            optionLeft='text'
            optionRight='json'
            direction='left'
            value={fields.data_type_2}
            onChange={setField.bind(null, 'data_type_2')} />
          } />,
        <Field
          key='messageB'
          className={monospaceB ? styles.monospace : ''}
          label={<Label text='Message B' />}
          input={<TextInput
            multiline={true}
            height={200}
            monospace={monospaceB}
            placeholder={monospace ? '{\n  \u2026\n}' : 'Type your message\u2026'}
            value={fields.data2}
            onChange={setField.bind(null, 'data2')} />
          } />,
      ];
    }
    return [
      <Field
        key='messageType'
        className={FieldStyles.header}
        label={<Label text='What type of message are you sending?' />}
        input={<Toggle
          type={Toggle.Types.CUSTOM}
          labelLeft='Text'
          labelRight='JSON'
          optionLeft='text'
          optionRight='json'
          direction='left'
          value={fields.data_type}
          onChange={setField.bind(null, 'data_type')} />
      } />,
      <Field
        key='message'
        className={monospace ? styles.monospace : ''}
        label={<Label text='What would you like to say?' />}
        input={<TextInput
          multiline={true}
          height={200}
          monospace={monospace}
          placeholder={monospace ? '{\n  \u2026\n}' : 'Type your message\u2026'}
          value={fields.data}
          onChange={setField.bind(null, 'data')} />
        } />
    ];
  }


  
  renderForm({ fields, changes, setField, resetFields }) {
    let multiMessage = (fields.exp_enable && fields.exp_type === 'message');

    let classes = this.props.schema.data.get('classes');
    let schema = {};
    if (classes) {
      let installations = classes.get('_Installation');
      if (typeof(installations) !== 'undefined') {
        installations.forEach((type, col) => {
          schema[col] = type;
        });
      }
    }

    let translationSegment = [];

    if (this.state.isLocalizationAvailable && !fields.exp_enable) {
      translationSegment.push(
        <Field
          key='slider'
          label={<Label text='Localize your message?' />}
          input={<Toggle value={fields.translation_enable} onChange={(value) => {
            setField('translation_enable', value || null);
          }} />} />
      );
      if (fields.translation_enable) {
        translationSegment.push(
          <SliderWrap key='warning' direction={Directions.DOWN} expanded={fields.translation_enable} block={true}>
            <div className={styles.warning}>
              <span>In some cases a locale may not be available for a user, either because they are running an earlier version of the SDK or their client has sent up an invalid locale. In those cases, they will receive the default message.</span>
              <a target='_blank' style={{ paddingLeft: '5px' }}href={getSiteDomain() + TRANSLATE_MORE_INFO_URL}>More info.</a>
            </div>
          </SliderWrap>
        );
      }
      if (fields.translation_enable) {
        //locales change based on existing selection

        // may want to move this section to another file
        // add in another textarea input for localized message
        translationSegment.push(
          <div
            key='addLocalizationButton'
            className={[FieldStyles.field, styles.localizationSegment].join(' ')}>
            <div>
              {this.state.localizedMessages.map((message, i) => {
                return (<LocalizedMessageField
                  id={i}
                  currentLocaleOption={message.locale}
                  localeOptions = {[message.locale].concat(this.state.availableLocales).sort()}
                  onClickRemove={(id, currentLocaleOption) => {
                    let localizedMessages = this.state.localizedMessages;
                    let availableLocales = this.state.availableLocales;
                    localizedMessages.splice(id, 1);
                    availableLocales.unshift(currentLocaleOption);
                    this.setState({
                      localizedMessages,
                      availableLocales: availableLocales.sort(),
                    });
                  }}
                  deviceCount={this.state.localeDeviceCountMap[message.locale]}
                  onChangeValue={(id, locale, value) => {
                    let localizedMessages = this.state.localizedMessages;
                    localizedMessages[id] = {
                      locale,
                      value
                    };
                    this.setState({
                      localizedMessages,
                    });
                    setField(`translation[${locale}]`, value);
                  }}
                  onChangeLocale={(id, locale, value, prevLocale) => {
                    let localizedMessages = this.state.localizedMessages;
                    let availableLocales = this.state.availableLocales;
                    localizedMessages[id] = {
                      locale,
                      value
                    };

                    availableLocales.splice(availableLocales.indexOf(locale));
                    availableLocales.unshift(prevLocale);
                    setField(`translation[${prevLocale}]`, null);

                    let {xhr, promise} = this.context.currentApp.fetchPushLocaleDeviceCount(fields.audience_id, fields.target, this.state.locales);
                    promise.then((localeDeviceCountMap) => {
                      this.setState({ localeDeviceCountMap })
                    });
                    this.xhrs.push(xhr);

                    this.setState({
                      localizedMessages,
                      availableLocales: availableLocales.sort(),
                    });
                    setField(`translation[${locale}]`, value);
                  }}
                  key={i} />);
              })}
            </div>
            { !this.state.loadingLocale && this.state.availableLocales.length === 0 ?
              null :
              <Button
                progress={this.state.loadingLocale}
                disabled={this.state.availableLocales.length === 0}
                value={this.state.loadingLocale ? 'Loading locales...' : 'Add a Localization'}
                onClick={() => {
                  let currentLocale = this.state.availableLocales[0];
                  this.setState({
                    localizedMessages: this.state.localizedMessages.concat([{
                      locale: currentLocale
                    }]),
                    availableLocales: this.state.availableLocales.slice(1)
                  }, () => {
                    let {xhr, promise} = this.context.currentApp.fetchPushLocaleDeviceCount(fields.audience_id, fields.target, this.state.locales);
                    promise.then((localeDeviceCountMap) => {
                      this.setState({ localeDeviceCountMap })
                    });
                    this.xhrs.push(xhr);
                  });
                }} />
            }
          </div>
        );
      }
    }

    const recipientsFields = <Fieldset
      legend='Choose your recipients.'
      description='Send to everyone, or use an audience to target the right users.'>
      <PushAudiencesData
        loaded={true /* Parse Server doesn't support push audiences yet. once it does, pass: this.state.pushAudiencesFetched */}
        schema={schema}
        pushAudiencesStore={this.props.pushaudiences}
        current={fields.audience_id}
        onChange={(audienceId, queryOrFilters, deviceCount) => {
          this.setState({ deviceCount });
          setField('audience_id', audienceId);
          if (audienceId === PushConstants.NEW_SEGMENT_ID) {
            // Horrible code here is due to old rails code that sent pushes through it's own endpoint, while Parse Server sends through Parse.Push.
            // Ideally, we would pass a Parse.Query around everywhere.
            if (queryOrFilters instanceof Parse.Query) {
              setField('target', queryOrFilters);
            } else {
              setField('target', queryFromFilters('_Installation', queryOrFilters));
            }
          }
        }} />
    </Fieldset>

    const abTestingFields = PARSE_SERVER_SUPPORTS_AB_TESTING ? <Fieldset
      legend='A/B Testing'
      description='Experiment with different messages or send times to discover the optimal campaign variables.'>
      <Field
        className={FieldStyles.header}
        label={<Label text='Use A/B Testing' />}
        input={<Toggle value={fields.exp_enable} onChange={(value) => {
          if (!this.state.audienceSizeSuggestion) {
            this.context.currentApp.fetchPushAudienceSizeSuggestion().then(({ audience_size }) => {
              this.setState({
                audienceSizeSuggestion: audience_size
              });
            });
            // calculate initial recipient count
            this.setState({
              recipientCount: Math.floor(this.state.deviceCount * 0.5)
            });
          }
          // disable translation if experiment is enabled
          if (fields.translation_enable && value) {
            setField('translation_enable',null);
          }
          setField('exp_enable', value || null);
        }} />} />
      {this.renderExperimentContent(fields, setField)}
    </Fieldset> : null;

    const timeFieldsLegend = PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH ?
      'Choose a delivery time' :
      'Choose exiry';

    const timeFieldsDescription = PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH ?
      'We can send the campaign immediately, or any time in the next 2 weeks.' :
      "If your push hasn't been send by this time, it won't get sent.";

    const deliveryTimeFields = PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH ? <Fieldset
      legend={timeFieldsLegend}
      description={timeFieldsDescription}>
      {PARSE_SERVER_SUPPORTS_SCHEDULE_PUSH ? this.renderDeliveryContent(fields, setField) : null}
      <Field
        label={<Label text='Should this notification expire?' />}
        input={<Toggle value={fields.push_expires} onChange={setField.bind(null, 'push_expires')} />} />
      {PushHelper.renderExpirationContent(fields, setField)}
    </Fieldset> : null;

    const messageFields = <Fieldset
      legend={'Write your message' + (multiMessage ? 's' : '')}
      description='The best campaigns use short and direct messaging.'>
      <div className={styles.messageContentWrap}>
       {this.renderMessageContent(fields, setField)}
      </div>
      <Field
        label={<Label text='Increment the app badge?' />}
        input={<Toggle value={fields.increment_badge} onChange={(value) => {
          setField('increment_badge', value || null);
        }} />} />
      {translationSegment}
    </Fieldset>

    const previewFields = <Fieldset
      legend='Preview'
      description='Double check that everything looks good!'>
      <PushPreview pushState={fields} audiences={this.props.pushaudiences} />
    </Fieldset>

    return <div className={styles.pushFlow}>
      {recipientsFields}
      {abTestingFields}
      {deliveryTimeFields}
      {messageFields}
      {previewFields}
      <Toolbar section='Push' subsection='Send a new campaign' />
    </div>
  }

  valid(changes) {
    let emptyInputMessages = [];
    let invalidInputMessages = [];
    // when number audience size is 0
    if (this.state.deviceCount === 0) {
      emptyInputMessages.push('recipient count for this campaign');
    }

    // push expiration date
    if (changes.push_expires && changes.expiration_time_type === 'time' && !changes.expiration_time) {
      emptyInputMessages.push('expiration time');
    }

    // non-experiment case
    if (!changes.exp_enable) {
      // message is empty
      if (changes.data.trim() === '') {
        emptyInputMessages.push('message');
      } else if (changes.data_type === 'json') {
        if (!isValidJSON(changes.data)) {
          invalidInputMessages.push(<span key='invalid-json'>Your <strong>message</strong> is not valid JSON.</span>);
        }
      }

      // localized message is empty
      if (changes.translation_enable) {
        this.state.localizedMessages.forEach((message) => {
          if (changes.data_type === 'json') {
            if (!isValidJSON(message.value)) {
              invalidInputMessages.push(<span key='invalid-json'>Your <strong>message for {message.locale}</strong> is not valid JSON.</span>);
            }
          } else if (!message.value || message.value.trim() === '') {
            emptyInputMessages.push(`message for ${message.locale} locale`);
          }

        });
      }

      // non-immediate delivery time
      if (changes.push_time_type !== 'now' && !changes.push_time) {
        emptyInputMessages.push('delivery time');
      }
    } else {
      // empty name
      if (changes.experiment_name.trim() === '') {
        emptyInputMessages.push('experiment name');
      }
      if (changes.exp_type === 'message') {
        // empty message for group a
        if (changes.data1.trim() === '') {
          emptyInputMessages.push('message for Group A');
        } else if (changes.data_type_1 === 'json') {
          if (!isValidJSON(changes.data)) {
            invalidInputMessages.push(<span className={styles.invalidMessage} key='invalid-json-a'>Your <strong>message for Group A</strong> is not valid JSON.</span>);
          }
        }
        if (changes.data2.trim() === '') {
          emptyInputMessages.push('message for Group B');
        } else if (changes.data_type_2 === 'json') {
          if (!isValidJSON(changes.data)) {
            invalidInputMessages.push(<span className={styles.invalidMessage} key='invalid-json-b'>Your <strong>message for Group B</strong> is not valid JSON.</span>);
          }
        }
        // non-immediate delivery time
        if (changes.push_time_type !== 'now' && !changes.push_time) {
          emptyInputMessages.push('delivery time');
        }

        // recipient count check
        if (this.state.recipientCount < 2) {
          emptyInputMessages.push('recipient count for this experiment');
        }
      } else {
        // message is empty
        if (changes.data.trim() === '') {
          emptyInputMessages.push('message');
        } else if (changes.data_type === 'json') {
          if (!isValidJSON(changes.data)) {
            invalidInputMessages.push(<span key='invalid-json'>You <strong>message</strong> is not valid JSON.</span>);
          }
        }
        // delivery time for group a
        if (!changes.push_time_1) {
          emptyInputMessages.push('delivery time for Group A');
        }
        // delivery time for group b
        if (!changes.push_time_2) {
          emptyInputMessages.push('delivery time for Group B');
        }
      }
    }

    if (emptyInputMessages.length > 0) {
      return <div>{formatErrorMessage(emptyInputMessages, 'empty-inputs')} {invalidInputMessages}</div>
    } else {
      return invalidInputMessages;
    }
  }


  
  
  renderContent() {
    return <FlowView
      initialFields={{}}
      initialChanges={{
        experiment_name: '',
        exp_size_in_percent: 50,
        push_time_type: 'now',
        push_time: null,
        push_time_1: null,
        push_time_2: null,
        push_time_iso: null,
        push_time_1_iso: null,
        push_time_2_iso: null,
        deliveryTime: null,
        local_time: false,
        push_expires: false,
        expiration_time: null,
        expiration_time_type: 'time',
        expiration_interval_num: '24',
        expiration_interval_unit: 'hours',
        expirationInterval: null,
        exp_type: 'message',
        exp_enable: null, //if present - isExperiment on ruby logic
        increment_badge: null, //if present - counts as true / existing ruby logic
        audience_id: this.state.initialAudienceId,
        data: '', //general message
        data_type: 'text',
        data1: '', //message for group a
        data_type_1: 'text', //current implementation has control over differnt data types to each user
        data2: '', //message for group b
        data_type_2: 'text',
        translation_enable: null, //if present - counts as true
      }}
      submitText='Send push'
      onSubmit={({ changes }) => this.handlePushSubmit(changes)}
      inProgressText={'Sending\u2026'}
      renderForm={this.renderForm.bind(this)}
      validate={({ changes }) => this.valid(changes)}
      footerContents={({changes}) => {
        let deviceNote = null;
        if(this.state.deviceCount){
          let count = this.state.deviceCount;

          if (changes.exp_enable && changes.exp_type === 'message') {
            count = Math.min(count, this.state.recipientCount);
          }

          deviceNote = (
            <span>
              This notification will be sent to <strong>{`${count} ${count === 1 ? 'device' : 'devices'}`}</strong>.&nbsp;
            </span>
          );
        }
        let timeNote = null;
        if(changes.push_time_type === 'time' && changes.push_time !== null || changes.push_time_type === 'now') {
          timeNote = (
            <span>
              It will be sent <strong>{changes.push_time_type === 'now' ? 'immediately' : String(changes.push_time)}</strong>.&nbsp;
            </span>
          );
        }
        return <div>{deviceNote}{timeNote}</div>;
      }}/>;
  }



}