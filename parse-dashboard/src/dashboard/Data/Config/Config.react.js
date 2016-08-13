
import { ActionTypes } from 'lib/stores/ConfigStore';
import Button from 'components/Button/Button.react';
import ConfigDialog from 'dashboard/Data/Config/ConfigDialog.react';
import EmptyState from 'components/EmptyState/EmptyState.react';
import Icon from 'components/Icon/Icon.react';
import { isDate } from 'lib/DateUtils';
import Parse from 'parse';
import React from 'react';
import SidebarAction from 'components/Sidebar/SidebarAction';
import subscribeTo from 'lib/subscribeTo';
import TableHeader from 'components/Table/TableHeader.react';
import TableView from 'dashboard/TableView.react';
import Toolbar from 'components/Toolbar/Toolbar.react';



@subscribeTo('Config', 'config')
class Config extends TableView {
  constructor() {
    super();
    this.section = 'Core';
    this.subsection = 'Config';
    this.action = new SidebarAction('Create a parameter', this.createParameter.bind(this));
    this.state = {
      modalOpen: false,
      modalParam: '',
      modalType: 'String',
      modalValue: ''
    };
  }

  componentDidMount() {
    this.props.config.dispatch(ActionTypes.FETCH);
  }

  renderToolbar() {
    return (
      <Toolbar 
        section='Core'
        subsection='Config'>
        <Button color='white' value='Create a parameter' onClick={this.createParameter.bind(this)} />
      </Toolbar>
    );
  }

  renderExtras() {
    if ( !this.state.modalOpen) {
      return null;
    }
    return (
      <ConfigDialog 
        onConfirm={this.saveParam.bind(this)}
        onCancel={() => this.setState({ modalOpen: false })}
        param={this.state.modalParam}
        type={this.state.modalType}
        value={this.state.modalValue} />
    );
  }


  tableData() {
    let data = undefined;
    if ( this.props.config.data) {
      let params = this.props.config.data.get('params');
      if ( params) {
        data = [];
        params.forEach((value, param) => {
          data.push({param, value});
        });
      }
    }
  }


  createParameter() {
    this.setState({
      modalOpen: true,
      modalParam: '',
      modalType: 'String',
      modalValue: ''
    });
  }


}

export default Config;