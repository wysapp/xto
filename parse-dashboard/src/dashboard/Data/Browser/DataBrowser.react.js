
import BrowserTable from 'dashboard/Data/Browser/BrowserTable.react';
import BrowserToolbar from 'dashboard/Data/Browser/BrowserToolbar.react';

import * as ColumnPreferences from 'lib/ColumnPreferences';
import ParseApp from 'lib/ParseApp';
import React from 'react';
import { SpecialClasses } from 'lib/Constants';


export default class DataBrowser extends React.Component {
  constructor(props, context) {
    super(props, context);
    let order = ColumnPreferences.getOrder(
      props.columns,
      context.currentApp.applicationId,
      props.className
    );

    this.state = {
      order: order,
      current: null,
      editing: false
    }

    this.handleKey = this.handleKey.bind(this);

    this.saveOrderTimeout = null;
  }

  componentWillReceiveProps(props, context) {
    if (props.className !== this.props.className) {
      let order = ColumnPreferences.getOrder(
        props.columns,
        context.currentApp.applicationId,
        props.className
      );

      this.setState({
        order: order,
        current: null,
        editing: false,
      });
    } else if (Object.keys(props.columns).length !== Object.keys(this.props.columns).length) {
      let order = ColumnPreferences.getOrder(
        props.columns,
        context.currentApp.applicationId,
        props.className
      );
      this.setState( {order });
    }
  }

  componentDidMount() {
    document.body.addEventListener('keydown', this.handleKey);
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.handleKey);
  }

  handleKey(e) {
    if (this.props.disableKeyControls) {
      return;
    }

    if (this.state.editing) {
      switch(e.keyCode) {
        case 27: //ESC
          this.setState({
            editing: false
          });
          e.preventDefault();
          break;
        default:
          return;
      }
    }

    if (!this.state.current) {
      return;
    }

    switch(e.keyCode) {
      case 8:
      case 46:
        //Backspace or Delete
        let colName = this.state.order[this.state.current.col].name;
        let col = this.props.columns[colName];
        if ( col.type !== 'Relation') {
          this.props.updateRow(
            this.state.current.row,
            colName,
            undefined
          );
        }
        e.preventDefault();
        break;
      case 37: // Left
        this.setState({
          current: {
            row: this.state.current.row,
            col: Math.max(this.state.current.col -1, 0)
          }
        });
        e.preventDefault();
        break;
    }
  }

  render(){
    let { className, ...other} = this.props;

    return (
      <div>
        <BrowserTable
          order={this.state.order}
          current={this.state.current}
          editing={this.state.editing}
          className={className}
          handleHeaderDragDrop={this.handleHeaderDragDrop.bind(this)}
          handleResize={this.handleResize.bind(this)}
          setEditing={this.setEditing.bind(this)}
          setCurrent={this.setCurrent.bind(this)}
          {...other} />
        <BrowserToolbar
          hidePerms={className === '_Installation'}
          className={SpecialClasses[className] || className}
          classNameForPermissionsEditor={className}
          setCurrent={this.setCurrent.bind(this)}
          enableDeleteAllRows={this.context.currentApp.serverInfo.features.schemas.clearAllDataFromClass}
          enableExportClass={this.context.currentApp.serverInfo.features.schemas.exportClass}
          enableSecurityDialog={this.context.currentApp.serverInfo.features.schemas.editClassLevelPermissions}
          {...other} />
      </div>
    );
  }
}


DataBrowser.contextTypes = {
  currentApp: React.PropTypes.instanceOf(ParseApp)
};