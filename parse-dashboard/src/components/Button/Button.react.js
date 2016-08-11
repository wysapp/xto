

import { unselectable } from 'stylesheets/base.scss';
import PropTypes from 'lib/PropTypes';
import React from 'react';
import styles from 'components/Button/Button.scss';


const noop = () => {};

let Button = (props) => {
  const hasOnClick = props.onClick && !props.disabled;
  let classes = [styles.button, unselectable];
  if (props.disabled) {
    classes.push(styles.disabled);
    if(props.color === 'white') {
      classes.push(styles.white);
    }
  } else {
    if (props.primary) {
      classes.push(styles.primary);
    }
    if (props.color) {
      classes.push(styles[props.color]);
    }
    if (props.progress) {
      classes.push(styles.progress);
    }
  }

  let clickHandler = hasOnClick ? props.onClick : noop;
  let styleOverride = null;
  if (props.width) {
    styleOverride = { width: props.width, minWidth: props.width, ...props.additionalStyles};
  }

  return (
    <a 
      href='javascript:;'
      role='button'
      style={styleOverride}
      className={classes.join(' ')}
      onClick={clickHandler}
      onFocus={(e) => {if (props.disabled) e.target.blur();}}>
      <span>{props.value}</span>
    </a>
  );
}

export default Button;

Button.propTypes = {
  primary: PropTypes.bool.describe(
    'Determines whether the button represents a Primary action. ' +
    'Primary buttons appear filled, while normal buttons are outlines.'
  ),
  disabled: PropTypes.bool.describe(
    'Determines whether a button can be clicked. Disabled buttons will ' +
    'appear grayed out, and will not fire onClick events.'
  ),
  color: PropTypes.oneOf(['blue', 'green', 'red', 'white']).describe(
    'The color of the button.'
  ),
  onClick: PropTypes.func.describe(
    'A function to be called when the button is clicked.'
  ),
  value: PropTypes.string.isRequired.describe(
    'The content of the button. This can be any renderable content.'
  ),
  width: PropTypes.string.describe(
    'Optionally sets the explicit width of the button. This can be any valid CSS size.'
  ),
  progress: PropTypes.bool.describe(
    'Optionally have in progress button styles. Defaults to false.'
  ),
  additionalStyles: PropTypes.object.describe('Additional styles for <a> tag.'),
};
