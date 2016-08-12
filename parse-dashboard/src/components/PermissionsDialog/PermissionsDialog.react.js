
import Button from 'components/Button/Button.react';
import Checkbox from 'components/Checkbox/Checkbox.react';
import Icon from 'components/Icon/Icon.react';
import { Map } from 'immutable';
import Pill from 'components/Pill/Pill.react';
import Popover from 'components/Popover/Popover.react';
import Position from 'lib/Position';
import React from 'react';
import SliderWrap from 'components/SliderWrap/SliderWrap.react';
import styles from 'components/PermissionsDialog/PermissionsDialog.scss';
import Toggle from 'components/Toggle/Toggle.react';

import {
  unselectable,
  verticalCenter
} from 'stylesheets/base.scss';

let origin = new Position(0, 0);



export default class PermissionsDialog extends React.Component {
  constructor({
    enablePointerPermissions = false,
    permissions,
    advanced
  }) {
    super();

    let uniqueKeys = ['*'];
    let perms = {};
    for (let k in permissions) {
      if (k !== 'readUserFields' && k !== 'writeUserFields') {
        Object.keys(permissions[k]).forEach((key) => {
          if ( uniqueKeys.indexOf(key) < 0 ) {
            uniqueKeys.push(key);
          }
        });
        perms[k] = Map(permissions[k]);
      }
    }

    if (advanced) {
      perms.get = perms.get || Map();
      perms.find = perms.find || Map();
      perms.create = perms.create || Map();
      perms.update = perms.update || Map();
      perms.delete = perms.delete || Map();
      perms.addField = perms.addField || Map();
    }

    let pointerPerms = {};
    if (permissions.readUserFields) {
      permissions.readUserFields.forEach((f) => {
        let p = { read: true };
        if ( permissions.writeUserFields && permissions.writeUserFields.indexOf(f) > -1) {
          p.write = true;
        }
        pointerPerms[f] = Map(p);
      });
    }

    if ( permissions.writeUserFields) {
      permissions.writeUserFields.forEach((f) => {
        if ( !pointerPerms[f]) {
          pointerPerms[f] = Map({ write : true });
        };
      });
    }

    this.state = {
      transitioning: false,
      showLevels: false,
      level: 'Simple',

      perms: Map(perms),
      keys: uniqueKeys,
      pointerPerms: Map(pointerPerms),
      pointers: Object.keys(pointerPerms),

      newEntry: '',
      entryError: null,
      newKeys: []
    };
  }

  render() {
    let classes = [ styles.dialog, unselectable];
    if ( this.state.level === 'Advanced') {
      classes.push(styles.advanced);
    }

    let placeholderText = '';
    if ( this.props.advanced && this.props.enablePointerPermissions) {
      placeholderText = 'Role, User, or Pointer\u2026';
    } else {
      placeholderText = 'Role or User\u2026';
    }

    return (
      <Popover fadeIn={true} fixed={true} position={origin} modal={true} color='rgba(17,13,17,0.8)'>
        <div className={classes.join(' ')}>
          <div className={styles.header}>
            {this.props.title}
            {this.props.advanced ?
              <div className={styles.setting} onClick={() => this.setState(({showLevels}) => ({showLevels: !showLevels}))}>
                <Icon name='gear-solid' width={20} height={20} />
              </div> : null
            }
            {this.props.advanced && this.state.showLevels ?
              <div className={styles.arrow} /> : null}
          </div>
          <SliderWrap expanded={this.state.showLevels}>
            <div className={styles.level}>
              <span>Permissions</span>
              <Toggle 
                darkBg={true}
                value={this.state.level}
                type={Toggle.Types.TWO_WAY}
                optoinLeft='Simple'
                optionRight='Advanced'
                onChange={(level) => {
                  if ( this.state.transitioning || this.state.level === level) {
                    return;
                  }
                  this.setState({ level, transitioning: true });
                  setTimeout(() => this.setState({ transitioning: false }), 700);
                }} />
            </div>
          </SliderWrap>

          <div className={styles.headers}>
            <div className={styles.readHeader}>Read</div>
            <div className={styles.writeHeader}>Write</div>
            <div className={styles.addHeader}>Add</div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.table}>
              <div className={[styles.overlay, styles.second].join(' ')} />
              <div className={[styles.overlay, styles.fourth].join(' ')} />
              <div className={[styles.overlay, styles.sixth].join(' ')} />
              <div className={[styles.overlay, styles.eighth].join(' ')} />

              <div className={[styles.public, styles.row].join(' ')}>
                <div className={styles.label}>
                  Public
                </div>
                {this.renderPublicCheckboxes()}
              </div>
              {this.state.keys.slice(1).map((key) => this.renderRow(key))}
              {this.props.advanced ?
                this.state.pointers.map((pointer) => this.renderRow(pointer,true)) : null}
              {this.state.newKeys.map((key) => this.renderRow(key))}

              <div className={styles.row}>
                <input 
                  className={[styles.entry, this.state.entryError ? styles.error : undefined].join(' ')}
                  value={this.state.newEntry}
                  onChange={(e) => this.setState({ newEntry: e.target.value })}
                  onBlur={this.checkEntry.bind(this)}
                  onKeyDown={this.handleKeyDown.bind(this)}
                  placeholder={placeholderText} />
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <div className={styles.actions}>
              <Button 
                value='Cancel'
                onClick={this.props.onCancel} />
              <Button 
                primary={true}
                value={this.props.confirmText}
                onClick={() => this.props.onConfirm(this.outputPerms())} />
            </div>
            <div className={[styles.details, verticalCenter].join(' ')}>
              {this.props.details}
            </div>
          </div>
        </div>
      </Popover>
    );
  }
}
