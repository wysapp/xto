/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React from 'react';
import { GeoPoint } from 'parse';
import hasAncestor from 'lib/hasAncestor';
import validateNumeric from 'lib/validateNumeric';
import styles from 'components/GeoPointEditor/GeoPointEditor.scss';

export default class GeoPointEditor extends React.Component {
  constructor(props) {
    super();

    this.state = {
      latitude: props.value ? props.value.latitude : 0,
      longitude: props.value ? props.value.longitude : 0
    };

    this.checkExternalClick = this.checkExternalClick.bind(this);
  }

  checkExternalClick(e) {
    if (!hasAncestor(e.target, this.refs.input)) {
      this.commitValue();
    }
  }


  render() {
    let onChange = (target, e) => {
      let value = e.target.value;
      if (!validateNumeric(value)) {
        var values = value.split(',');

        if (values.length == 2) {
          values = values.map(val => val.trim());

          if (values[0].length > 0 && validateNumeric(values[0])) {
            if (values[1].length <= 0 || !validateNumeric(values[1])) {
              this.setState({latitude: values[0]});
              this.refs.longitude.focus();
              this.refs.longitude.setSelectionRange(0, String(this.state.longitude).length);
              return;
            }

            if (validateNumeric(values[1])) {
              this.setState({ latitude: values[0] });
              this.setState({ longitude: values[1] });
              this.refs.longitude.focus();

              return;
            }
          }
        }
      }

      this.setState({ [target]: validateNumeric(value) ? value : this.state[target] });
    }

    return (
      <div ref="input" style={{width: this.props.width}} className={styles.editor}>
        <input 
          ref="latitude"
          value={this.state.latitude}
          onChange={onChange.bind(this, 'latitude')} 
        />
        <input 
          ref="longitude"
          value={this.state.longitude}
          onChange={onChange.bind(this, 'longitude')}
        />
      </div>
    );
  }
}