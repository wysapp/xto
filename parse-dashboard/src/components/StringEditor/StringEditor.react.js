

import React from 'react';
import styles from 'components/StringEditor/StringEditor.scss';

export default class StringEditor extends React.Component {

  constructor(props) {
    super();

    this.state = {
      value: props.value || ''
    }

    this.checkExternalClick = this.checkExternalClick.bind(this);
    this.handleKey = this.handleKey.bind(this);
  }

  componentDidMount() {
    this.refs.input.setSelectionRange(0, this.state.value.length);
    document.body.addEventListener('click', this.checkExternalClick);
    document.body.addEventListener('keypress', this.handleKey);
  }

  componentWillUnmount() {
    document.body.removeEventListener('click', this.checkExternalClick);
    document.body.removeEventListener('keypress', this.handleKey);
  }

  checkExternalClick(e) {
    if (e.target !== this.refs.input) {
      this.props.onCommit(this.state.value);
    }
  }

  handleKey(e) {
    if ( e.keyCode === 13) {
      if (!this.props.multiline || !e.shiftKey) {
        this.props.onCommit(this.state.value);
      }
    }
  }


  render() {
    let onChange = this.props.readonly ? () => {} : (e) => this.setState({ value: e.target.value });

    if ( !this.props.multiline) {
      return (
        <div className={styles.editor}>
          <textarea 
            ref='input'
            value={this.state.value}
            onChange={onChange}
            style={{ minWidth: this.props.minWidth }} />
        </div>
      );
    }

    return (
      <div style={{width: this.props.width}} className={styles.editor} >
        <input 
          ref='input'
          value={this.state.value}
          onChange={onChange} />
      </div>
    );
  }
}